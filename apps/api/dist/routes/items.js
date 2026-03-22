"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_js_1 = require("@supabase/supabase-js");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@hangout/shared");
const router = (0, express_1.Router)();
exports.itemsRouter = router;
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// ─── Schemas ──────────────────────────────────────────────────────────────────
const createItemSchema = zod_1.z.object({
    category: zod_1.z.nativeEnum(shared_1.Category),
    name: zod_1.z.string().min(1).max(200),
    quantity: zod_1.z.number().int().positive().nullable().optional(),
    unit: zod_1.z.string().max(50).nullable().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
    is_ai_generated: zod_1.z.boolean().optional().default(false),
});
const updateItemSchema = zod_1.z.object({
    category: zod_1.z.nativeEnum(shared_1.Category).optional(),
    name: zod_1.z.string().min(1).max(200).optional(),
    quantity: zod_1.z.number().int().positive().nullable().optional(),
    unit: zod_1.z.string().max(50).nullable().optional(),
    notes: zod_1.z.string().max(500).nullable().optional(),
});
// ─── Helper: verify event membership ─────────────────────────────────────────
async function getMembership(eventId, userId) {
    const { data } = await supabase
        .from('event_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();
    return data;
}
// ─── GET /events/:eventId/items ───────────────────────────────────────────────
router.get('/events/:eventId/items', auth_1.requireAuth, async (req, res) => {
    const { userId } = req;
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
router.post('/events/:eventId/items', auth_1.requireAuth, (0, validate_1.validateBody)(createItemSchema), async (req, res) => {
    const { userId } = req;
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
router.patch('/:id', auth_1.requireAuth, (0, validate_1.validateBody)(updateItemSchema), async (req, res) => {
    const { userId } = req;
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
    const adminId = item.events?.admin_id;
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
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    const { userId } = req;
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
    const adminId = item.events?.admin_id;
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
