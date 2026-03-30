import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { Category } from '../shared-types';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createItemSchema = z.object({
  category: z.nativeEnum(Category),
  name: z.string().min(1).max(200),
  quantity: z.number().int().positive().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  is_ai_generated: z.boolean().optional().default(false),
});

const updateItemSchema = z.object({
  category: z.nativeEnum(Category).optional(),
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().positive().nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// ─── Helper: verify event membership ─────────────────────────────────────────

async function getMembership(eventId: string, userId: string) {
  const { data } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  return data as { role: 'admin' | 'guest' } | null;
}

// ─── GET /events/:eventId/items ───────────────────────────────────────────────

router.get('/events/:eventId/items', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  const membership = await getMembership(eventId, userId);
  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  const { data, error } = await supabase
    .from('items')
    .select('*, assignment:assignments(id, item_id, user_id, note, created_at, user:users(id, name, avatar_url))')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  // Flatten the assignment array to a single object (or null)
  const items = (data ?? []).map((item) => ({
    ...item,
    assignment: Array.isArray(item.assignment) ? item.assignment[0] ?? null : item.assignment,
  }));

  res.json({ data: items, error: null });
});

// ─── POST /events/:eventId/items ──────────────────────────────────────────────

router.post('/events/:eventId/items', requireAuth, validateBody(createItemSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  const membership = await getMembership(eventId, userId);
  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  const { data, error } = await supabase
    .from('items')
    .insert({ ...req.body, event_id: eventId })
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.status(201).json({ data, error: null });
});

// ─── PATCH /items/:id ─────────────────────────────────────────────────────────

router.patch('/:id', requireAuth, validateBody(updateItemSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  // Get item to check event admin
  const { data: item } = await supabase
    .from('items')
    .select('event_id, events(admin_id)')
    .eq('id', id)
    .single();

  if (!item) {
    res.status(404).json({ data: null, error: { message: 'Item not found', code: 'NOT_FOUND' } });
    return;
  }

  const adminId = (item.events as unknown as { admin_id: string } | null)?.admin_id;
  if (adminId !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can update items', code: 'FORBIDDEN' } });
    return;
  }

  const { data, error } = await supabase
    .from('items')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data, error: null });
});

// ─── DELETE /items/:id ────────────────────────────────────────────────────────

router.delete('/:id', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const { data: item } = await supabase
    .from('items')
    .select('event_id, events(admin_id)')
    .eq('id', id)
    .single();

  if (!item) {
    res.status(404).json({ data: null, error: { message: 'Item not found', code: 'NOT_FOUND' } });
    return;
  }

  const adminId = (item.events as unknown as { admin_id: string } | null)?.admin_id;
  if (adminId !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can delete items', code: 'FORBIDDEN' } });
    return;
  }

  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: { id }, error: null });
});

// ─── GET /items/:id/comments ──────────────────────────────────────────────────

router.get('/:id/comments', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  // Get item to check event membership
  const { data: item } = await supabase.from('items').select('event_id').eq('id', id).single();
  if (!item) { res.status(404).json({ data: null, error: { message: 'Item not found' } }); return; }

  const { data: membership } = await supabase.from('event_members').select('id').eq('event_id', item.event_id).eq('user_id', userId).maybeSingle();
  if (!membership) { res.status(403).json({ data: null, error: { message: 'Access denied' } }); return; }

  const { data, error } = await supabase
    .from('item_comments')
    .select('*, user:users(id, name, avatar_url)')
    .eq('item_id', id)
    .order('created_at', { ascending: true });

  if (error) { res.status(500).json({ data: null, error: { message: error.message } }); return; }
  res.json({ data: data ?? [], error: null });
});

// ─── POST /items/:id/comments ─────────────────────────────────────────────────

router.post('/:id/comments', requireAuth, validateBody(z.object({ text: z.string().min(1).max(500) })), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const { data: item } = await supabase.from('items').select('event_id').eq('id', id).single();
  if (!item) { res.status(404).json({ data: null, error: { message: 'Item not found' } }); return; }

  const { data: membership } = await supabase.from('event_members').select('id').eq('event_id', item.event_id).eq('user_id', userId).maybeSingle();
  if (!membership) { res.status(403).json({ data: null, error: { message: 'Access denied' } }); return; }

  const { data: comment, error } = await supabase
    .from('item_comments')
    .insert({ item_id: id, event_id: item.event_id, user_id: userId, text: req.body.text })
    .select('*, user:users(id, name, avatar_url)')
    .single();

  if (error) { res.status(500).json({ data: null, error: { message: error.message } }); return; }
  res.json({ data: comment, error: null });
});

export { router as itemsRouter };
