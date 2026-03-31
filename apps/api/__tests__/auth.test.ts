/**
 * Auth middleware tests — Critical tests 1-3
 *
 * Test 1: Valid JWT → next() called, userId/userEmail attached
 * Test 2: Expired / invalid token → 401 UNAUTHORIZED
 * Test 3: Missing / malformed Authorization header → 401 UNAUTHORIZED
 */

import type { Request, Response, NextFunction } from 'express';
import { mockSupabase } from './setup';
import { requireAuth } from '../src/middleware/auth';

function makeReqRes(authHeader?: string) {
  const req  = { headers: authHeader ? { authorization: authHeader } : {} } as unknown as Request;
  const res  = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => {
  // Reset auth mock to success by default
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-abc', email: 'alice@example.com' } },
    error: null,
  });
});

// ─── Test 1 ───────────────────────────────────────────────────────────────────

describe('requireAuth', () => {

  it('TEST 1 — valid token: calls next() and attaches userId/userEmail', async () => {
    const { req, res, next } = makeReqRes('Bearer valid-token-123');

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).userId).toBe('user-abc');
    expect((req as any).userEmail).toBe('alice@example.com');
    expect(res.status).not.toHaveBeenCalled();
  });

  // ─── Test 2 ───────────────────────────────────────────────────────────────

  it('TEST 2 — expired/invalid token: returns 401', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const { req, res, next } = makeReqRes('Bearer expired-token');

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
    );
  });

  it('TEST 2b — Supabase returns null user without error: returns 401', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const { req, res, next } = makeReqRes('Bearer some-token');

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ─── Test 3 ───────────────────────────────────────────────────────────────

  it('TEST 3 — missing Authorization header: returns 401', async () => {
    const { req, res, next } = makeReqRes(); // no header

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
    );
  });

  it('TEST 3b — malformed header (no Bearer prefix): returns 401', async () => {
    const { req, res, next } = makeReqRes('Token abc123'); // wrong scheme

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('TEST 3c — Supabase throws unexpectedly: returns 401', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Network error'));

    const { req, res, next } = makeReqRes('Bearer some-token');

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
