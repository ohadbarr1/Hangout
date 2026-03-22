"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const claudeService_1 = require("../services/claudeService");
const router = (0, express_1.Router)();
exports.parseRouter = router;
const parseSchema = zod_1.z.object({
    description: zod_1.z
        .string()
        .min(10, 'Please describe your event in at least 10 characters.')
        .max(2000, 'Description must be under 2000 characters.'),
});
/**
 * POST /events/parse
 *
 * Accepts a free-text event description and returns structured JSON
 * (event name, suggested date, items by category) from Claude.
 */
router.post('/parse', auth_1.requireAuth, (0, validate_1.validateBody)(parseSchema), async (req, res) => {
    const { description } = req.body;
    try {
        const parsed = await claudeService_1.claudeService.parseEventDescription(description);
        res.json({ data: parsed, error: null });
    }
    catch (err) {
        console.error('[parse] Claude error:', err);
        res.status(502).json({
            data: null,
            error: {
                message: 'AI parsing failed. Please try again.',
                code: 'AI_ERROR',
            },
        });
    }
});
