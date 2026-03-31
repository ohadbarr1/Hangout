/**
 * Event tests — Critical tests 14-15 + transaction boundaries + pagination
 *
 * Transaction boundary:
 *   - Member insert fails → event deleted (no orphan)
 *   - Items insert fails  → event deleted (no orphan)
 *
 * Test 14: Only admin can promote/demote members
 * Test 15: Admin cannot change their own role → 400
 *
 * Pagination:
 *   - GET /events/:id/members respects limit/offset, returns meta.total
 */

import request from 'supertest';
import { mockSupabase, buildChain } from './setup';
import app from '../src/index';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-admin';
    req.userEmail = 'admin@test.com';
    next();
  },
}));

const EVENT_ID  = 'event-evt1';
const MEMBER_ID = 'mem-222';
const OTHER_UID = 'user-other';

function setupFromMock(tables: Record<string, ReturnType<typeof buildChain>>) {
  mockSupabase.from.mockImplementation((t: string) => tables[t] ?? buildChain());
}

// ─── POST /events — transaction boundaries ────────────────────────────────────

describe('POST /events — transaction boundaries', () => {

  it('successful creation without items → 201', async () => {
    const newEvent = { id: EVENT_ID, title: 'Test Bash', admin_id: 'user-admin', status: 'active', invite_code: 'abc12345' };

    const eventChain  = buildChain();
    const memberChain = buildChain();

    eventChain.single.mockResolvedValueOnce({ data: newEvent, error: null });
    // member insert — terminal call, resolved via `then`
    memberChain.insert = jest.fn().mockReturnValue(buildChain({ data: null, error: null }));

    setupFromMock({ events: eventChain, event_members: memberChain });

    const res = await request(app)
      .post('/events')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Test Bash' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(EVENT_ID);
  });

  it('member insert fails → event rolled back, returns 500', async () => {
    const newEvent = { id: EVENT_ID, title: 'Broken Party', admin_id: 'user-admin', status: 'active', invite_code: 'xyz' };

    const eventChain  = buildChain();
    const memberChain = buildChain();

    eventChain.single.mockResolvedValueOnce({ data: newEvent, error: null });

    // Member insert fails
    memberChain.insert = jest.fn().mockReturnValue(
      buildChain({ data: null, error: { message: 'DB constraint', code: '23000' } }),
    );

    // Track rollback delete call
    const deleteChain = buildChain({ data: null, error: null });
    eventChain.delete = jest.fn().mockReturnValue(deleteChain);

    setupFromMock({ events: eventChain, event_members: memberChain });

    const res = await request(app)
      .post('/events')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Broken Party' });

    expect(res.status).toBe(500);
    expect(res.body.error.message).toMatch(/membership/i);
    expect(eventChain.delete).toHaveBeenCalled();
  });

  it('items insert fails → event rolled back, returns 500', async () => {
    const newEvent = { id: EVENT_ID, title: 'Items Fail', admin_id: 'user-admin', status: 'active', invite_code: 'aaa' };

    const eventChain  = buildChain();
    const memberChain = buildChain();
    const itemsChain  = buildChain();

    eventChain.single.mockResolvedValueOnce({ data: newEvent, error: null });
    memberChain.insert = jest.fn().mockReturnValue(buildChain({ data: null, error: null }));

    // Items insert fails
    itemsChain.insert = jest.fn().mockReturnValue(
      buildChain({ data: null, error: { message: 'items insert failed', code: '500' } }),
    );

    const deleteChain = buildChain({ data: null, error: null });
    eventChain.delete = jest.fn().mockReturnValue(deleteChain);

    setupFromMock({ events: eventChain, event_members: memberChain, items: itemsChain });

    const res = await request(app)
      .post('/events')
      .set('Authorization', 'Bearer token')
      .send({
        title: 'Items Fail',
        parsed_categories: [{ name: 'Food', items: [{ name: 'Chips', quantity: 1, unit: 'bag', notes: null }] }],
      });

    expect(res.status).toBe(500);
    expect(res.body.error.message).toMatch(/items/i);
    expect(eventChain.delete).toHaveBeenCalled();
  });
});

// ─── GET /events/:id/members — pagination ─────────────────────────────────────

describe('GET /events/:id/members — pagination', () => {

  it('returns members with meta: { total, limit, offset }', async () => {
    const members = Array.from({ length: 3 }, (_, i) => ({
      id: `mem-${i}`, event_id: EVENT_ID, user_id: `user-${i}`, role: 'guest',
    }));

    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'event_members') {
        callCount++;
        if (callCount === 1) {
          // First call: membership check (maybeSingle)
          const c = buildChain();
          c.maybeSingle.mockResolvedValueOnce({ data: { id: 'mem-self' }, error: null });
          return c;
        }
        // Second call: paginated list (range → thenable with count)
        const c = buildChain({ data: members, error: null, count: 42 });
        // Override `then` to include count
        c.then = (res: any, rej?: any) =>
          Promise.resolve({ data: members, error: null, count: 42 }).then(res, rej);
        return c;
      }
      return buildChain();
    });

    const res = await request(app)
      .get(`/events/${EVENT_ID}/members?limit=3&offset=0`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.limit).toBe(3);
    expect(res.body.meta.offset).toBe(0);
  });

  it('caps limit at 100 even if caller requests more', async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'event_members') {
        callCount++;
        if (callCount === 1) {
          const c = buildChain();
          c.maybeSingle.mockResolvedValueOnce({ data: { id: 'mem-self' }, error: null });
          return c;
        }
        const c = buildChain({ data: [], error: null, count: 0 });
        c.range = jest.fn().mockReturnValue(buildChain({ data: [], error: null, count: 0 }));
        return c;
      }
      return buildChain();
    });

    const res = await request(app)
      .get(`/events/${EVENT_ID}/members?limit=9999&offset=0`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(100);
  });

  it('non-member gets 403', async () => {
    const memberChain = buildChain();
    memberChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    setupFromMock({ event_members: memberChain });

    const res = await request(app)
      .get(`/events/${EVENT_ID}/members`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /events/:id/members/:memberId — role management ───────────────────

describe('PATCH /events/:id/members/:memberId — role management', () => {

  it('TEST 14 — admin promotes member → 200', async () => {
    const eventChain  = buildChain();
    const memberChain = buildChain();

    eventChain.single.mockResolvedValueOnce({ data: { admin_id: 'user-admin' }, error: null });
    memberChain.single
      .mockResolvedValueOnce({ data: { user_id: OTHER_UID }, error: null }) // target member lookup
      .mockResolvedValueOnce({ data: { id: MEMBER_ID, role: 'moderator' }, error: null }); // updated result

    setupFromMock({ events: eventChain, event_members: memberChain });

    const res = await request(app)
      .patch(`/events/${EVENT_ID}/members/${MEMBER_ID}`)
      .set('Authorization', 'Bearer token')
      .send({ role: 'moderator' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('moderator');
  });

  it('TEST 14b — non-admin cannot promote → 403', async () => {
    const eventChain = buildChain();
    eventChain.single.mockResolvedValueOnce({ data: { admin_id: 'someone-else' }, error: null });

    setupFromMock({ events: eventChain });

    const res = await request(app)
      .patch(`/events/${EVENT_ID}/members/${MEMBER_ID}`)
      .set('Authorization', 'Bearer token')
      .send({ role: 'moderator' });

    expect(res.status).toBe(403);
  });

  it('TEST 15 — admin cannot change own role → 400', async () => {
    const eventChain  = buildChain();
    const memberChain = buildChain();

    eventChain.single.mockResolvedValueOnce({ data: { admin_id: 'user-admin' }, error: null });
    // Target member IS the admin
    memberChain.single.mockResolvedValueOnce({ data: { user_id: 'user-admin' }, error: null });

    setupFromMock({ events: eventChain, event_members: memberChain });

    const res = await request(app)
      .patch(`/events/${EVENT_ID}/members/${MEMBER_ID}`)
      .set('Authorization', 'Bearer token')
      .send({ role: 'guest' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/own role/i);
  });
});
