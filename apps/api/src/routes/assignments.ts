import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { notificationService } from '../services/notificationService';
import { writeActivity } from '../lib/activity';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const claimSchema = z.object({
  note: z.string().max(300).optional(),
});

// ─── POST /items/:id/claim ────────────────────────────────────────────────────

router.post('/:id/claim', requireAuth, validateBody(claimSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id: itemId } = req.params;

  // Get item + event membership check
  const { data: item } = await supabase
    .from('items')
    .select('id, name, event_id, events(admin_id, title)')
    .eq('id', itemId)
    .single();

  if (!item) {
    res.status(404).json({ data: null, error: { message: 'Item not found', code: 'NOT_FOUND' } });
    return;
  }

  // Check user is a member
  const { data: membership } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', item.event_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'You are not a member of this event', code: 'FORBIDDEN' } });
    return;
  }

  // ─── Atomic claim ─────────────────────────────────────────────────────────
  // We rely on the UNIQUE constraint on assignments(item_id) added in
  // migration 004_phase1_fixes.sql.  Two concurrent requests will both
  // attempt an INSERT; exactly one will succeed and the other will receive
  // PostgreSQL error code 23505 (unique_violation) which we map to 409.
  // This removes the SELECT → check → INSERT race window that existed before.
  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      item_id: itemId,
      user_id: userId,
      note: req.body.note ?? null,
    })
    .select('*, user:users(id, name, avatar_url)')
    .single();

  if (error) {
    // Unique constraint violation: item was claimed by a concurrent request
    if (error.code === '23505') {
      res.status(409).json({ data: null, error: { message: 'Item is already claimed', code: 'CONFLICT' } });
      return;
    }
    res.status(500).json({ data: null, error: { message: error.message ?? 'Failed to claim item' } });
    return;
  }

  if (!assignment) {
    res.status(500).json({ data: null, error: { message: 'Failed to claim item' } });
    return;
  }

  // Notify event admin (fire and forget)
  void notifyAdminOnClaim(item, userId, assignment.user).catch(console.error);

  // Write activity: claim
  const claimerUser = assignment.user as { name?: string } | null;
  writeActivity(item.event_id, userId, 'claim', { itemName: item.name, userName: claimerUser?.name }).catch(() => {});

  // Check if all items are now claimed
  void (async () => {
    try {
      const { data: allItems } = await supabase
        .from('items')
        .select('id')
        .eq('event_id', item.event_id);
      if (allItems && allItems.length > 0) {
        const { data: allAssignments } = await supabase
          .from('assignments')
          .select('item_id')
          .in('item_id', allItems.map((i) => i.id));
        if (allAssignments && allAssignments.length === allItems.length) {
          writeActivity(item.event_id, null, 'all_claimed', {}).catch(() => {});
        }
      }
    } catch {
      // Non-critical
    }
  })();

  res.status(201).json({ data: assignment, error: null });
});

// ─── DELETE /items/:id/unclaim ────────────────────────────────────────────────

router.delete('/:id/unclaim', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id: itemId } = req.params;

  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, user_id')
    .eq('item_id', itemId)
    .maybeSingle();

  if (!assignment) {
    res.status(404).json({ data: null, error: { message: 'No assignment found for this item', code: 'NOT_FOUND' } });
    return;
  }

  // Allow unclaim if it's your own, or if you're admin/moderator
  if (assignment.user_id !== userId) {
    const { data: item } = await supabase
      .from('items')
      .select('event_id')
      .eq('id', itemId)
      .single();

    if (!item) {
      res.status(404).json({ data: null, error: { message: 'Item not found', code: 'NOT_FOUND' } });
      return;
    }

    const { data: membership } = await supabase
      .from('event_members')
      .select('role')
      .eq('event_id', item.event_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (membership?.role !== 'admin' && membership?.role !== 'moderator') {
      res.status(403).json({ data: null, error: { message: 'You can only unclaim your own assignments', code: 'FORBIDDEN' } });
      return;
    }
  }

  // Fetch item name + event_id for activity log
  const { data: itemForActivity } = await supabase
    .from('items')
    .select('name, event_id')
    .eq('id', itemId)
    .maybeSingle();

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignment.id);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  // Write activity: unclaim
  if (itemForActivity) {
    writeActivity(itemForActivity.event_id, userId, 'unclaim', { itemName: itemForActivity.name }).catch(() => {});
  }

  res.json({ data: { item_id: itemId }, error: null });
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function notifyAdminOnClaim(
  item: { event_id: string; name: string; events: unknown },
  claimerUserId: string,
  claimerUser: { name: string } | null,
) {
  const eventData = item.events as { admin_id: string; title: string } | null;
  if (!eventData || eventData.admin_id === claimerUserId) return; // don't notify self

  const { data: admin } = await supabase
    .from('users')
    .select('expo_push_token')
    .eq('id', eventData.admin_id)
    .single();

  if (admin?.expo_push_token) {
    await notificationService.sendPush({
      to: admin.expo_push_token,
      title: eventData.title,
      body: `${claimerUser?.name ?? 'Someone'} claimed "${item.name}"`,
      data: { eventId: item.event_id },
    });
  }
}

export { router as assignmentsRouter };
