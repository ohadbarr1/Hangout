/**
 * Global test setup — loaded via jest.config.js `setupFiles`.
 *
 * Pattern:
 *  - Creates a single stable `mockSupabase` and stores it on `global`.
 *  - The jest.mock factory reads it from `global` at call-time (lazy),
 *    avoiding any hoisting / TDZ issues.
 *  - buildChain() returns a thenable chain so queries awaited directly
 *    (e.g. `.insert({})`  or  `.select().eq().order()`) work correctly.
 */

// ─── Env stubs ────────────────────────────────────────────────────────────────

process.env.SUPABASE_URL            = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET     = 'test-jwt-secret';
process.env.ANTHROPIC_API_KEY       = 'test-anthropic-key';
process.env.NODE_ENV                = 'test';
process.env.PORT                    = '3001';
// Skip app.listen — supertest creates its own ephemeral server.
// Without this, each test file importing `app` would try to bind port 3001 again.
process.env.VERCEL                  = '1';

// ─── buildChain ───────────────────────────────────────────────────────────────

export interface ChainResult {
  data?: unknown;
  error: { message: string; code?: string } | null;
  count?: number;
}

/**
 * Create a fluent mock Supabase query chain that is also a thenable (Promise-like).
 *
 * - `await chain` resolves to `defaultResult` — works for queries like
 *     `const { error } = await supabase.from('t').insert({})`
 * - `chain.single` / `chain.maybeSingle` are jest.fn() — override with
 *     `chain.single.mockResolvedValueOnce({ data: ..., error: null })`
 */
export function buildChain(
  defaultResult: ChainResult = { data: null, error: null },
) {
  const chain: Record<string, any> = {};

  for (const m of [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'order', 'range', 'limit',
    'filter', 'match', 'not', 'or',
  ]) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }

  chain.single      = jest.fn().mockResolvedValue(defaultResult);
  chain.maybeSingle = jest.fn().mockResolvedValue(defaultResult);

  // Make chain itself awaitable (for direct-await queries)
  chain.then  = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve(defaultResult).then(res, rej);
  chain.catch = (rej: (e: unknown) => unknown) =>
    Promise.resolve(defaultResult).catch(rej);

  return chain;
}

// ─── Stable mock Supabase client ──────────────────────────────────────────────

export const mockSupabase = {
  from: jest.fn().mockReturnValue(buildChain()),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    }),
  },
};

// Expose on global so the jest.mock factory (which runs in a sandboxed scope)
// can access it reliably without circular-require issues.
(global as unknown as Record<string, unknown>)['__hangoutMockSupabase__'] = mockSupabase;

// ─── Mock @supabase/supabase-js ───────────────────────────────────────────────
// jest.mock is hoisted to the top of this file by Babel/ts-jest.
// The factory runs LAZILY (on first require), by which time global is set.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(
    () => (global as unknown as Record<string, unknown>)['__hangoutMockSupabase__'],
  ),
}));
