import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { claudeService } from '../services/claudeService';

const router = Router();

const parseSchema = z.object({
  description: z
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
router.post('/parse', requireAuth, validateBody(parseSchema), async (req, res) => {
  const { description } = req.body as { description: string };

  try {
    const parsed = await claudeService.parseEventDescription(description);
    res.json({ data: parsed, error: null });
  } catch (err) {
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

export { router as parseRouter };
