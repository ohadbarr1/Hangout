import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// PATCH /users/push-token — save device push token
router.patch('/push-token', requireAuth, validateBody(z.object({
  token: z.string().min(1).max(500),
})), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { error } = await supabase
    .from('users')
    .update({ expo_push_token: req.body.token })
    .eq('id', userId);
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data: { ok: true }, error: null });
});

export { router as usersRouter };
