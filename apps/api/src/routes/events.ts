import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import type { Event, ParsedCategory } from '@hangout/shared';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  event_date: z.string().datetime({ offset: true }).optional(),
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
    .order('created_at', { ascending: false });

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

router.post('/', requireAuth, validateBody(createEventSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { parsed_categories, estimated_guests, ...eventData } = req.body;

  // Generate a short unique invite code
  const invite_code = generateInviteCode();

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

  // Add creator as admin member
  await supabase.from('event_members').insert({
    event_id: event.id,
    user_id: userId,
    role: 'admin',
    rsvp_status: 'going',
  });

  // Bulk-insert AI-parsed items if provided
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
      await supabase.from('items').insert(items);
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

router.get('/:id/members', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

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

  const { data, error } = await supabase
    .from('event_members')
    .select('*, user:users(id, name, avatar_url)')
    .eq('event_id', id);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: data ?? [], error: null });
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export { router as eventsRouter };
