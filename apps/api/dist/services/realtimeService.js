"use strict";
/**
 * Supabase Realtime helpers for the API server.
 *
 * In most cases, the mobile app subscribes directly to Supabase Realtime
 * via the @supabase/supabase-js client. This module provides server-side
 * utilities for broadcasting custom events and managing channels when
 * the backend needs to push updates programmatically.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastToEvent = broadcastToEvent;
exports.broadcastItemClaimed = broadcastItemClaimed;
exports.broadcastItemUnclaimed = broadcastItemUnclaimed;
exports.broadcastMemberJoined = broadcastMemberJoined;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
/**
 * Broadcast a custom event to all subscribers of an event channel.
 * Mobile clients subscribed to `event:{eventId}` will receive this.
 *
 * @param eventId - The Hangout event UUID
 * @param message - The event type + payload to broadcast
 */
async function broadcastToEvent(eventId, message) {
    const channel = supabase.channel(`event:${eventId}`);
    await channel.send({
        type: 'broadcast',
        event: message.event,
        payload: message.payload,
    });
    await supabase.removeChannel(channel);
}
/**
 * Broadcast an item claimed event.
 */
async function broadcastItemClaimed(eventId, itemId, claimedBy) {
    return broadcastToEvent(eventId, {
        event: 'item:claimed',
        payload: { itemId, claimedBy },
    });
}
/**
 * Broadcast an item unclaimed event.
 */
async function broadcastItemUnclaimed(eventId, itemId) {
    return broadcastToEvent(eventId, {
        event: 'item:unclaimed',
        payload: { itemId },
    });
}
/**
 * Broadcast a new member joining an event.
 */
async function broadcastMemberJoined(eventId, member) {
    return broadcastToEvent(eventId, {
        event: 'member:joined',
        payload: { member },
    });
}
