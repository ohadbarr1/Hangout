/**
 * Assignment tests — Critical tests 7-10
 *
 * Test 7:  DB unique constraint violation → 409 CONFLICT (race condition fixed)
 * Test 8:  Owner unclaims → 200; no assignment → 404
 * Test 9:  Non-member cannot claim → 403 FORBIDDEN
 * Test 10: Guest cannot unclaim another's item → 403; admin can → 200
 */

import request from 'supertest';
import { mockSupabase, buildChain } from './setup';
import app from '../src/index';

// ─── Mock requireAuth to inject userId ────────────────────────────────────────
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-claimer';
    req.userEmail = 'claimer@test.com';
    next();
  },
}));

// ─── Mock notification service ────────────────────────────────────────────────
jest.mock('../src/services/notificationService', () => ({
  notificationService: {
    sendPush: jest.fn().mockResolvedValue(undefined),
    sendBatch: jest.fn().mockResolvedValue(undefined),
  },
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_ID   = 'item-111';
const USER_ID   = 'user-claimer';
const EVENT_ID  = 'event-999';

function mockItem() {
  return { id: ITEM_ID, name: 'Chips', event_id: EVENT_ID, events: { admin_id: 'admin-user', title: 'BBQ' } };
}

function mockAssignment(userId = USER_ID) {
  return { id: 'assign-1', item_id: ITEM_ID, user_id: userId, note: null, user: { id: userId, name: 'Alice', avatar_url: null } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Configure mockSupabase.from to return specific chains per table */
function setupFromMock(tables: Record<string, ReturnType<typeof buildChain>>) {
  mockSupabase.from.mockImplementation((table: string) => tables[table] ?? buildChain());
}

// ─── POST /items/:id/claim ────────────────────────────────────────────────────

describe('POST /items/:id/claim', () => {

  it('TEST 7 — DB unique constraint violation (23505) → 409 CONFLICT', async () => {
    const itemChain    = buildChain();
    const memberChain  = buildChain();
    const assignChain  = buildChain();

    itemChain.single.mockResolvedValueOnce({ data: mockItem(), error: null });
    memberChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'mem-1' }, error: null });
    // INSERT fails with postgres unique_violation
    assignChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key violates unique constraint' },
    });

    setupFromMock({ items: itemChain, event_members: memberChain, assignments: assignChain });

    const res = await request(app)
      .post(`/items/${ITEM_ID}/claim`)
      .set('Authorization', 'Bearer token')
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('TEST 7b — successful first claim → 201', async () => {
    const itemChain   = buildChain();
    const memberChain = buildChain();
    const assignChain = buildChain();
    const allItemsChain = buildChain({ data: [{ id: ITEM_ID }], error: null });

    itemChain.single.mockResolvedValueOnce({ data: mockItem(), error: null });
    memberChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'mem-1' }, error: null });
    assignChain.single.mockResolvedValueOnce({ data: mockAssignment(), error: null });

    setupFromMock({
      items:         itemChain,
      event_members: memberChain,
      assignments:   assignChain,
    });

    const res = await request(app)
      .post(`/items/${ITEM_ID}/claim`)
      .set('Authorization', 'Bearer token')
      .send({ note: 'I got this' });

    expect(res.status).toBe(201);
    expect(res.body.data.item_id).toBe(ITEM_ID);
  });

  it('TEST 9 — non-member cannot claim → 403', async () => {
    const itemChain   = buildChain();
    const memberChain = buildChain();

    itemChain.single.mockResolvedValueOnce({ data: mockItem(), error: null });
    memberChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // no membership

    setupFromMock({ items: itemChain, event_members: memberChain });

    const res = await request(app)
      .post(`/items/${ITEM_ID}/claim`)
      .set('Authorization', 'Bearer token')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('TEST 9b — item not found → 404', async () => {
    const itemChain = buildChain();
    itemChain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found', code: '404' } });

    setupFromMock({ items: itemChain });

    const res = await request(app)
      .post(`/items/${ITEM_ID}/claim`)
      .set('Authorization', 'Bearer token')
      .send({});

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /items/:id/unclaim ────────────────────────────────────────────────

describe('DELETE /items/:id/unclaim', () => {

  it('TEST 8 — owner unclaims own item → 200', async () => {
    const assignChain = buildChain();
    const itemChain   = buildChain();

    // Assignment belongs to the authenticated user
    assignChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'assign-1', user_id: USER_ID }, error: null });
    // Item for activity log
    itemChain.maybeSingle.mockResolvedValueOnce({ data: { name: 'Chips', event_id: EVENT_ID }, error: null });

    // Make delete().eq() resolve with no error
    const deleteReturn = buildChain({ data: null, error: null });
    assignChain.delete = jest.fn().mockReturnValue(deleteReturn);

    setupFromMock({ assignments: assignChain, items: itemChain });

    const res = await request(app)
      .delete(`/items/${ITEM_ID}/unclaim`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.data.item_id).toBe(ITEM_ID);
  });

  it('TEST 8b — no assignment found → 404', async () => {
    const assignChain = buildChain();
    assignChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    setupFromMock({ assignments: assignChain });

    const res = await request(app)
      .delete(`/items/${ITEM_ID}/unclaim`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('TEST 10 — guest cannot unclaim another user\'s item → 403', async () => {
    const assignChain  = buildChain();
    const itemChain    = buildChain();
    const memberChain  = buildChain();

    // Assignment belongs to a DIFFERENT user
    assignChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'assign-1', user_id: 'other-user' }, error: null });
    // Item lookup for membership check
    itemChain.single.mockResolvedValueOnce({ data: { event_id: EVENT_ID }, error: null });
    // Requester is a guest
    memberChain.maybeSingle.mockResolvedValueOnce({ data: { role: 'guest' }, error: null });

    setupFromMock({ assignments: assignChain, items: itemChain, event_members: memberChain });

    const res = await request(app)
      .delete(`/items/${ITEM_ID}/unclaim`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('TEST 10b — admin can unclaim another user\'s item → 200', async () => {
    const assignChain  = buildChain();
    const itemChain    = buildChain();
    const memberChain  = buildChain();

    assignChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'assign-1', user_id: 'other-user' }, error: null });
    // First item call: get event_id for auth check
    itemChain.single.mockResolvedValueOnce({ data: { event_id: EVENT_ID }, error: null });
    // Second item call: get name + event_id for activity log
    itemChain.maybeSingle.mockResolvedValueOnce({ data: { name: 'Chips', event_id: EVENT_ID }, error: null });
    // Requester is admin
    memberChain.maybeSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });

    const deleteReturn = buildChain({ data: null, error: null });
    assignChain.delete = jest.fn().mockReturnValue(deleteReturn);

    setupFromMock({ assignments: assignChain, items: itemChain, event_members: memberChain });

    const res = await request(app)
      .delete(`/items/${ITEM_ID}/unclaim`)
      .set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
  });
});
