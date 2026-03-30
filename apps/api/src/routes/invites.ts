import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { writeActivity } from '../lib/activity';
import { notificationService } from '../services/notificationService';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const acceptInviteSchema = z.object({
  rsvp_status: z.enum(['going', 'maybe', 'not_going', 'pending']).optional().default('going'),
});

// ─── POST /events/:eventId/invites — create an invite link ───────────────────

router.post('/events/:eventId/invites', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  // Only admin can generate new invite tokens
  const { data: event } = await supabase
    .from('events')
    .select('admin_id, invite_code')
    .eq('id', eventId)
    .single();

  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can create invites', code: 'FORBIDDEN' } });
    return;
  }

  // Generate a new invite token (separate from the event invite_code for tracking)
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      event_id: eventId,
      token,
      created_by: userId,
      expires_at: expiresAt,
    })
    .select('*, event:events(id, title, event_date, location, status)')
    .single();

  if (error || !invite) {
    res.status(500).json({ data: null, error: { message: error?.message ?? 'Failed to create invite' } });
    return;
  }

  res.status(201).json({ data: invite, error: null });
});

// ─── GET /invites/:token — preview an invite (no auth required) ───────────────

router.get('/invites/:token', async (req, res) => {
  const { token } = req.params;

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*, event:events(id, title, event_date, location, status)')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    res.status(404).json({ data: null, error: { message: 'Invite not found or expired', code: 'NOT_FOUND' } });
    return;
  }

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ data: null, error: { message: 'This invite link has expired', code: 'EXPIRED' } });
    return;
  }

  // Check if the event is still active
  const eventData = invite.event as { id: string; status: string } | null;
  if (eventData && (eventData.status === 'cancelled' || eventData.status === 'completed')) {
    res.status(410).json({ data: null, error: { message: 'This event is no longer available', code: 'EVENT_UNAVAILABLE' } });
    return;
  }

  res.json({ data: invite, error: null });
});

// ─── POST /invites/:token/accept — join an event via invite ──────────────────

router.post('/invites/:token/accept', requireAuth, validateBody(acceptInviteSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { token } = req.params;

  const { data: invite } = await supabase
    .from('invites')
    .select('*, event:events(id, title, status, admin_id)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    res.status(404).json({ data: null, error: { message: 'Invite not found', code: 'NOT_FOUND' } });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ data: null, error: { message: 'Invite expired', code: 'EXPIRED' } });
    return;
  }

  const eventData = invite.event as { id: string; status: string; title: string; admin_id: string } | null;
  if (!eventData || eventData.status === 'cancelled') {
    res.status(400).json({ data: null, error: { message: 'This event is no longer available', code: 'EVENT_UNAVAILABLE' } });
    return;
  }

  // Upsert membership (user may have been added by admin before)
  const { data: membership, error: memberError } = await supabase
    .from('event_members')
    .upsert({
      event_id: invite.event_id,
      user_id: userId,
      role: 'guest',
      rsvp_status: req.body.rsvp_status,
    }, { onConflict: 'event_id,user_id' })
    .select()
    .single();

  if (memberError || !membership) {
    res.status(500).json({ data: null, error: { message: memberError?.message ?? 'Failed to join event' } });
    return;
  }

  // Track usage for analytics (does not invalidate the invite — invites are multi-use)
  try {
    await supabase
      .from('invite_acceptances')
      .insert({ invite_id: invite.id, user_id: userId, accepted_at: new Date().toISOString() });
  } catch {
    // Non-critical: table may not exist yet. Invite acceptance still succeeds.
  }

  // Look up joiner's name for activity + notification
  const { data: joiner } = await supabase.from('users').select('name').eq('id', userId).single();

  // Write activity: join
  writeActivity(invite.event_id, userId, 'join', { userName: joiner?.name ?? null }).catch(() => {});

  // Notify event admin that someone joined
  if (eventData.admin_id && eventData.admin_id !== userId) {
    const { data: adminUser } = await supabase
      .from('users')
      .select('expo_push_token, name')
      .eq('id', eventData.admin_id)
      .single();
    if (adminUser?.expo_push_token) {
      const joinerName = joiner?.name ?? 'Someone';
      notificationService.sendPush({
        to: adminUser.expo_push_token,
        title: eventData.title,
        body: `${joinerName} just joined! 👋`,
        data: { eventId: invite.event_id },
      }).catch(() => {});
    }
  }

  res.json({ data: membership, error: null });
});

function generateToken(): string {
  return require('crypto').randomBytes(24).toString('hex'); // 48 chars, 192-bit entropy
}

export { router as invitesRouter };
