import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { Category } from '../shared-types';
import { claudeService } from '../services/claudeService';

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
  return data as { role: 'admin' | 'moderator' | 'guest' } | null;
}

async function isAdminOrMod(eventId: string, userId: string): Promise<boolean> {
  const m = await getMembership(eventId, userId);
  return m?.role === 'admin' || m?.role === 'moderator';
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

  if (!await isAdminOrMod(item.event_id, userId)) {
    res.status(403).json({ data: null, error: { message: 'Only admins and moderators can update items', code: 'FORBIDDEN' } });
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

  if (!await isAdminOrMod(item.event_id, userId)) {
    res.status(403).json({ data: null, error: { message: 'Only admins and moderators can delete items', code: 'FORBIDDEN' } });
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

// ─── GET /events/:eventId/items/suggest ──────────────────────────────────────

router.get('/events/:eventId/items/suggest', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  const membership = await getMembership(eventId, userId);
  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  // Fetch event title + existing item names
  const [{ data: event }, { data: items }] = await Promise.all([
    supabase.from('events').select('title').eq('id', eventId).single(),
    supabase.from('items').select('name').eq('event_id', eventId),
  ]);

  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  try {
    const suggestions = await claudeService.suggestItems(
      event.title,
      (items ?? []).map((i: { name: string }) => i.name),
    );
    res.json({ data: suggestions, error: null });
  } catch {
    res.status(502).json({ data: null, error: { message: 'AI suggestion failed', code: 'AI_ERROR' } });
  }
});

// ─── POST /events/:eventId/items/quick-add ────────────────────────────────────

const quickAddSchema = z.object({
  text: z.string().min(2).max(500),
});

router.post('/events/:eventId/items/quick-add', requireAuth, validateBody(quickAddSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;
  const { text } = req.body as { text: string };

  const membership = await getMembership(eventId, userId);
  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Access denied', code: 'FORBIDDEN' } });
    return;
  }

  let parsed: Array<{ name: string; category: string; quantity: number | null; unit: string | null }>;
  try {
    parsed = await claudeService.parseQuickAdd(text);
  } catch {
    res.status(502).json({ data: null, error: { message: 'AI parsing failed', code: 'AI_ERROR' } });
    return;
  }

  if (parsed.length === 0) {
    res.status(400).json({ data: null, error: { message: 'Could not parse any items from that text', code: 'PARSE_FAILED' } });
    return;
  }

  // Insert all parsed items
  const toInsert = parsed.map((p) => ({
    event_id: eventId,
    name: p.name,
    category: Object.values(Category).includes(p.category as Category) ? p.category : Category.Tasks,
    quantity: p.quantity,
    unit: p.unit,
    is_ai_generated: true,
    added_by: userId,
  }));

  const { data, error } = await supabase
    .from('items')
    .insert(toInsert)
    .select('*, assignment:assignments(*, user:users(id, name, avatar_url))');

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.status(201).json({ data, error: null });
});

export { router as itemsRouter };
