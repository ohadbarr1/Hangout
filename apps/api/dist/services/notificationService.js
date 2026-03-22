"use strict";
/**
 * Expo Push Notifications service.
 *
 * Sends push notifications via the Expo Push API.
 * No server key needed — Expo authenticates using the push token
 * provided by the device.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
exports.notificationService = {
    /**
     * Send a push notification to a single Expo push token.
     */
    async sendPush(message) {
        const payload = {
            to: message.to,
            title: message.title,
            body: message.body,
            data: message.data ?? {},
            sound: message.sound ?? 'default',
            ...(message.badge !== undefined ? { badge: message.badge } : {}),
            ...(message.channelId ? { channelId: message.channelId } : {}),
        };
        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Expo Push API error ${response.status}: ${text}`);
        }
        const result = await response.json();
        const firstResult = result.data[0];
        if (firstResult?.status === 'error') {
            console.warn('[notifications] Push delivery error:', firstResult.message, firstResult.details);
        }
    },
    /**
     * Send push notifications to multiple tokens in a single batch request.
     * Expo supports up to 100 messages per request.
     */
    async sendBatch(messages) {
        if (messages.length === 0)
            return;
        const BATCH_SIZE = 100;
        for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE).map((msg) => ({
                to: msg.to,
                title: msg.title,
                body: msg.body,
                data: msg.data ?? {},
                sound: msg.sound ?? 'default',
            }));
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(batch),
            });
            if (!response.ok) {
                console.error(`[notifications] Batch push failed: ${response.status}`);
            }
        }
    },
};
