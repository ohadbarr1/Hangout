"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_js_1 = require("@supabase/supabase-js");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
exports.invitesRouter = router;
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const acceptInviteSchema = zod_1.z.object({
    rsvp_status: zod_1.z.enum(['going', 'maybe', 'not_going', 'pending']).optional().default('going'),
});
// ─── POST /events/:eventId/invites — create an invite link ───────────────────
router.post('/events/:eventId/invites', auth_1.requireAuth, async (req, res) => {
    const { userId } = req;
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
    // Check if already used (single-use invites)
    if (invite.used_by) {
        res.status(410).json({ data: null, error: { message: 'This invite link has already been used', code: 'USED' } });
        return;
    }
    res.json({ data: invite, error: null });
});
// ─── POST /invites/:token/accept — join an event via invite ──────────────────
router.post('/invites/:token/accept', auth_1.requireAuth, (0, validate_1.validateBody)(acceptInviteSchema), async (req, res) => {
    const { userId } = req;
    const { token } = req.params;
    const { data: invite } = await supabase
        .from('invites')
        .select('*, event:events(id, title, status)')
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
    if (invite.used_by) {
        res.status(410).json({ data: null, error: { message: 'Invite already used', code: 'USED' } });
        return;
    }
    const eventData = invite.event;
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
    // Mark invite as used
    await supabase
        .from('invites')
        .update({ used_by: userId, used_at: new Date().toISOString() })
        .eq('id', invite.id);
    res.json({ data: membership, error: null });
});
function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
