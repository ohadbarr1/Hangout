import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// We verify the Supabase JWT by decoding the session through the supabase admin client.
// This avoids needing to manually verify JWKS.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Middleware that validates the Supabase Bearer JWT from the Authorization header.
 * Sets req.userId and req.userEmail on success.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      data: null,
      error: { message: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        data: null,
        error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' },
      });
      return;
    }

    (req as AuthenticatedRequest).userId = data.user.id;
    (req as AuthenticatedRequest).userEmail = data.user.email ?? '';

    next();
  } catch (err) {
    console.error('[auth] Token verification failed:', err);
    res.status(401).json({
      data: null,
      error: { message: 'Token verification failed', code: 'UNAUTHORIZED' },
    });
  }
}
