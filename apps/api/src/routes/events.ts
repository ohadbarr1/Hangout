import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import type { Event, ParsedCategory } from '../shared-types';
import { writeActivity } from '../lib/activity';
import { logger } from '../lib/logger';
import { claudeService } from '../services/claudeService';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  event_date: z.string().optional().nullable(),
  location: z.string().max(300).optional(),
  hero_color: z.enum(['coral', 'violet', 'mint', 'golden', 'charcoal']).optional().default('coral'),
  // Present when creating from AI-parsed data
  parsed_categories: z.array(z.any()).optional(),
  estimated_guests: z.number().int().positive().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  event_date: z.string().datetime({ offset: true }).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  hero_color: z.enum(['coral', 'violet', 'mint', 'golden', 'charcoal']).optional(),
});

// ─── GET /events — list current user's events ─────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;

  const { data, error } = await supabase
    .from('event_members')
    .select('events(*)')
    .eq('user_id', userId)
    .order('created_at', { referencedTable: 'events', ascending: false });

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  const events = (data ?? [])
    .map((row: { events: unknown }) => row.events as Event | null)
    .filter((e): e is Event => e != null);

  res.json({ data: events, error: null });
});

// ─── POST /events — create event (optionally with AI-parsed items) ─────────────
// All three writes (event → member → items) are wrapped with compensating
// deletes so a partial failure never leaves orphaned rows in the database.

router.post('/', requireAuth, validateBody(createEventSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { parsed_categories, estimated_guests, ...eventData } = req.body;

  // Generate a short unique invite code
  const invite_code = generateInviteCode();

  // ── Step 1: Create event ──────────────────────────────────────────────────
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      ...eventData,
      admin_id: userId,
      invite_code,
      status: 'active',
    })
    .select()
    .single();

  if (eventError || !event) {
    res.status(500).json({ data: null, error: { message: eventError?.message ?? 'Failed to create event' } });
    return;
  }

  // ── Step 2: Add creator as admin member ───────────────────────────────────
  const { error: memberError } = await supabase.from('event_members').insert({
    event_id: event.id,
    user_id: userId,
    role: 'admin',
    rsvp_status: 'going',
  });

  if (memberError) {
    // Rollback: remove the event so no orphan is left
    logger.error('[events] Failed to create admin membership — rolling back event', {
      eventId: event.id,
      error: memberError.message,
    });
    await supabase.from('events').delete().eq('id', event.id);
    res.status(500).json({ data: null, error: { message: 'Failed to create event membership' } });
    return;
  }

  // ── Step 3: Bulk-insert AI-parsed items if provided ───────────────────────
  if (parsed_categories && Array.isArray(parsed_categories)) {
    const items = (parsed_categories as ParsedCategory[]).flatMap((cat) =>
      cat.items.map((item) => ({
        event_id: event.id,
        category: cat.name,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        is_ai_generated: true,
      })),
    );

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('items').insert(items);

      if (itemsError) {
        // Rollback: cascade delete on events removes members + items
        logger.error('[events] Failed to insert parsed items — rolling back event', {
          eventId: event.id,
          itemCount: items.length,
          error: itemsError.message,
        });
        await supabase.from('events').delete().eq('id', event.id);
        res.status(500).json({ data: null, error: { message: 'Failed to create event items' } });
        return;
      }
    }
  }

  res.status(201).json({ data: event, error: null });
});

// ─── GET /events/:id ──────────────────────────────────────────────────────────

router.get('/:id', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  // RLS will block access if user is not a member; we just pass through
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  res.json({ data: event, error: null });
});

// ─── GET /events/:id/members ──────────────────────────────────────────────────
// Paginated to prevent unbounded responses on large events.
// Query params: ?limit=50&offset=0  (max 100 per page)

router.get('/:id/members', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;

  // Verify membership
  const { data: membership } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  const { data, error, count } = await supabase
    .from('event_members')
    .select('*, user:users(id, name, avatar_url)', { count: 'exact' })
    .eq('event_id', id)
    .order('joined_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({
    data: data ?? [],
    meta: { total: count ?? 0, limit, offset },
    error: null,
  });
});

// ─── PATCH /events/:id ────────────────────────────────────────────────────────

router.patch('/:id', requireAuth, validateBody(updateEventSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  // Only admin can update
  const { data: event } = await supabase
    .from('events')
    .select('admin_id')
    .eq('id', id)
    .single();

  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can update it', code: 'FORBIDDEN' } });
    return;
  }

  const { data: updated, error } = await supabase
    .from('events')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  // Write activity: event_update
  writeActivity(id, userId, 'event_update', { fields: Object.keys(req.body) }).catch(() => {});

  res.json({ data: updated, error: null });
});

// ─── GET /events/:id/activity ─────────────────────────────────────────────────

router.get('/:id/activity', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  // Verify membership
  const { data: membership } = await supabase
    .from('event_members').select('id').eq('event_id', id).eq('user_id', userId).maybeSingle();
  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  const { data, error } = await supabase
    .from('event_activity')
    .select('*, user:users(id, name, avatar_url)')
    .eq('event_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: data ?? [], error: null });
});

// ─── PATCH /events/:id/rsvp — update my RSVP status ─────────────────────────

router.patch('/:id/rsvp', requireAuth, validateBody(z.object({
  rsvp_status: z.enum(['going', 'maybe', 'not_going']),
})), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const { data: membership } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'You are not a member of this event', code: 'FORBIDDEN' } });
    return;
  }

  const { data: updated, error } = await supabase
    .from('event_members')
    .update({ rsvp_status: req.body.rsvp_status })
    .eq('event_id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: updated, error: null });
});

// ─── DELETE /events/:id ───────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const { data: event } = await supabase
    .from('events')
    .select('admin_id')
    .eq('id', id)
    .single();

  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can delete it', code: 'FORBIDDEN' } });
    return;
  }

  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: { id }, error: null });
});

// ─── POST /events/:id/clone — duplicate an event ─────────────────────────────

router.post('/:id/clone', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  // Fetch source event + verify membership
  const { data: source } = await supabase.from('events').select('*').eq('id', id).single();
  if (!source) {
    res.status(404).json({ data: null, error: { message: 'Event not found' } });
    return;
  }
  const { data: membership } = await supabase.from('event_members').select('role').eq('event_id', id).eq('user_id', userId).maybeSingle();
  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied' } });
    return;
  }

  // Create cloned event (clear date + status → draft)
  const { data: cloned, error: cloneError } = await supabase.from('events').insert({
    admin_id: userId,
    title: `${source.title} (copy)`,
    description: source.description,
    location: source.location,
    hero_color: source.hero_color,
    event_date: null,
    status: 'draft',
    invite_code: generateInviteCode(),
  }).select().single();

  if (cloneError || !cloned) {
    res.status(500).json({ data: null, error: { message: cloneError?.message ?? 'Failed to clone event' } });
    return;
  }

  // Add creator as admin member
  const { error: memberError } = await supabase.from('event_members').insert({
    event_id: cloned.id,
    user_id: userId,
    role: 'admin',
    rsvp_status: 'going',
  });

  if (memberError) {
    await supabase.from('events').delete().eq('id', cloned.id);
    res.status(500).json({ data: null, error: { message: 'Failed to clone event membership' } });
    return;
  }

  // Clone items (clear assignments)
  const { data: sourceItems } = await supabase.from('items').select('*').eq('event_id', id);
  if (sourceItems && sourceItems.length > 0) {
    await supabase.from('items').insert(
      sourceItems.map((item) => ({
        event_id: cloned.id,
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        is_ai_generated: item.is_ai_generated,
      }))
    );
  }

  res.status(201).json({ data: cloned, error: null });
});

// ─── PATCH /events/:id/members/:memberId — promote/demote co-host ─────────────

router.patch('/:id/members/:memberId', requireAuth, validateBody(z.object({
  role: z.enum(['admin', 'moderator', 'guest']),
})), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id, memberId } = req.params;

  // Only event admin can promote/demote
  const { data: event } = await supabase.from('events').select('admin_id').eq('id', id).single();
  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found' } });
    return;
  }
  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can change member roles' } });
    return;
  }

  // Cannot change the admin's own role
  const { data: targetMember } = await supabase.from('event_members').select('user_id').eq('id', memberId).single();
  if (!targetMember) {
    res.status(404).json({ data: null, error: { message: 'Member not found' } });
    return;
  }
  if (targetMember.user_id === userId) {
    res.status(400).json({ data: null, error: { message: 'Cannot change your own role' } });
    return;
  }

  const { data: updated, error } = await supabase
    .from('event_members')
    .update({ role: req.body.role })
    .eq('id', memberId)
    .eq('event_id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: updated, error: null });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── GET /events/:id/recap ────────────────────────────────────────────────────

router.get('/:id/recap', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  // Must be a member
  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  const [{ data: event }, { data: members }, { data: items }] = await Promise.all([
    supabase.from('events').select('title, status').eq('id', id).single(),
    supabase.from('event_members').select('user:users(name)').eq('event_id', id),
    supabase.from('items').select('name, assignment:assignments(user:users(name))').eq('event_id', id),
  ]);

  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  const totalItems = (items ?? []).length;
  const claimedItems = (items ?? []).filter((i: any) => i.assignment != null);
  const claimedCount = claimedItems.length;
  const attendeeCount = (members ?? []).length;

  // Top contributors — users who claimed the most items
  const contributorCounts: Record<string, number> = {};
  for (const item of claimedItems as any[]) {
    const name = item.assignment?.user?.name;
    if (name) contributorCounts[name] = (contributorCounts[name] ?? 0) + 1;
  }
  const topContributors = Object.entries(contributorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const aiOneliner = await claudeService.generateRecap(
    event.title,
    attendeeCount,
    claimedCount,
    totalItems,
    topContributors,
  ).catch(() => `${event.title} was a blast!`);

  res.json({
    data: {
      eventTitle: event.title,
      attendeeCount,
      claimedCount,
      totalItems,
      topContributors,
      aiOneliner,
      members: (members ?? []).map((m: any) => m.user).filter(Boolean),
    },
    error: null,
  });
});

export { router as eventsRouter };
