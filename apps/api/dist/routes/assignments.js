"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignmentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_js_1 = require("@supabase/supabase-js");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const notificationService_1 = require("../services/notificationService");
const router = (0, express_1.Router)();
exports.assignmentsRouter = router;
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const claimSchema = zod_1.z.object({
    note: zod_1.z.string().max(300).optional(),
});
// ─── POST /items/:id/claim ────────────────────────────────────────────────────
router.post('/:id/claim', auth_1.requireAuth, (0, validate_1.validateBody)(claimSchema), async (req, res) => {
    const { userId } = req;
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
    // Check item is not already claimed
    const { data: existing } = await supabase
        .from('assignments')
        .select('id, user_id')
        .eq('item_id', itemId)
        .maybeSingle();
    if (existing) {
        res.status(409).json({ data: null, error: { message: 'Item is already claimed', code: 'CONFLICT' } });
        return;
    }
    // Create assignment
    const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
        item_id: itemId,
        user_id: userId,
        note: req.body.note ?? null,
    })
        .select('*, user:users(id, name, avatar_url)')
        .single();
    if (error || !assignment) {
        res.status(500).json({ data: null, error: { message: error?.message ?? 'Failed to claim item' } });
        return;
    }
    // Notify event admin (fire and forget)
    void notifyAdminOnClaim(item, userId, assignment.user).catch(console.error);
    res.status(201).json({ data: assignment, error: null });
});
// ─── DELETE /items/:id/unclaim ────────────────────────────────────────────────
router.delete('/:id/unclaim', auth_1.requireAuth, async (req, res) => {
    const { userId } = req;
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
    if (assignment.user_id !== userId) {
        res.status(403).json({ data: null, error: { message: 'You can only unclaim your own assignments', code: 'FORBIDDEN' } });
        return;
    }
    const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignment.id);
    if (error) {
        res.status(500).json({ data: null, error: { message: error.message } });
        return;
    }
    res.json({ data: { item_id: itemId }, error: null });
});
// ─── Internal helpers ─────────────────────────────────────────────────────────
async function notifyAdminOnClaim(item, claimerUserId, claimerUser) {
    const eventData = item.events;
    if (!eventData || eventData.admin_id === claimerUserId)
        return; // don't notify self
    const { data: admin } = await supabase
        .from('users')
        .select('expo_push_token')
        .eq('id', eventData.admin_id)
        .single();
    if (admin?.expo_push_token) {
        await notificationService_1.notificationService.sendPush({
            to: admin.expo_push_token,
            title: eventData.title,
            body: `${claimerUser?.name ?? 'Someone'} claimed "${item.name}"`,
            data: { eventId: item.event_id },
        });
    }
}
