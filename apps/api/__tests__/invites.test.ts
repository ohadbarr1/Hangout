/**
 * Invite tests — Critical tests 11-13
 *
 * Test 11: Expired invite token → 410 EXPIRED
 * Test 12: Cancelled / completed event invite → 410 EVENT_UNAVAILABLE
 * Test 13: Same user joins twice → existing membership upserted (idempotent)
 */

import request from 'supertest';
import { mockSupabase, buildChain } from './setup';
import app from '../src/index';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'user-joiner';
    req.userEmail = 'joiner@test.com';
    next();
  },
}));

jest.mock('../src/services/notificationService', () => ({
  notificationService: { sendPush: jest.fn().mockResolvedValue(undefined) },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN    = 'abc123validtoken';
const EVENT_ID = 'event-555';

function setupFromMock(tables: Record<string, ReturnType<typeof buildChain>>) {
  mockSupabase.from.mockImplementation((t: string) => tables[t] ?? buildChain());
}

function expiredInvite() {
  return {
    id: 'invite-1', token: TOKEN, event_id: EVENT_ID,
    expires_at: new Date(Date.now() - 1000).toISOString(),
    event: { id: EVENT_ID, title: 'Old Party', status: 'active', hero_color: 'coral', admin_id: 'admin-1' },
  };
}

function activeInvite(eventStatus = 'active') {
  return {
    id: 'invite-2', token: TOKEN, event_id: EVENT_ID,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    event: { id: EVENT_ID, title: 'Summer BBQ', status: eventStatus, hero_color: 'mint', admin_id: 'admin-1' },
  };
}

// ─── GET /invites/:token ──────────────────────────────────────────────────────

describe('GET /invites/:token (preview, no auth)', () => {

  it('TEST 11 — expired invite → 410 EXPIRED', async () => {
    const inviteChain = buildChain();
    inviteChain.maybeSingle.mockResolvedValueOnce({ data: expiredInvite(), error: null });

    setupFromMock({ invites: inviteChain });

    const res = await request(app).get(`/invites/${TOKEN}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('EXPIRED');
  });

  it('TEST 12 — cancelled event → 410 EVENT_UNAVAILABLE', async () => {
    const inviteChain = buildChain();
    inviteChain.maybeSingle.mockResolvedValueOnce({ data: activeInvite('cancelled'), error: null });

    setupFromMock({ invites: inviteChain });

    const res = await request(app).get(`/invites/${TOKEN}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('EVENT_UNAVAILABLE');
  });

  it('TEST 12b — completed event → 410 EVENT_UNAVAILABLE', async () => {
    const inviteChain = buildChain();
    inviteChain.maybeSingle.mockResolvedValueOnce({ data: activeInvite('completed'), error: null });

    setupFromMock({ invites: inviteChain });

    const res = await request(app).get(`/invites/${TOKEN}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('EVENT_UNAVAILABLE');
  });

  it('valid invite → 200 with event details', async () => {
    const inviteChain  = buildChain();
    const memberChain  = buildChain({ data: null, error: null, count: 5 });
    const itemChain    = buildChain({ data: null, error: null, count: 10 });

    inviteChain.maybeSingle.mockResolvedValueOnce({ data: activeInvite(), error: null });

    setupFromMock({ invites: inviteChain, event_members: memberChain, items: itemChain });

    const res = await request(app).get(`/invites/${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.token).toBe(TOKEN);
  });

  it('token not found → 404', async () => {
    const inviteChain = buildChain();
    inviteChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    setupFromMock({ invites: inviteChain });

    const res = await request(app).get(`/invites/bad-token-123`);

    expect(res.status).toBe(404);
  });
});

// ─── POST /invites/:token/accept ──────────────────────────────────────────────

describe('POST /invites/:token/accept', () => {

  it('TEST 13 — upsert: same user joins twice returns existing membership', async () => {
    const existingMembership = {
      id: 'mem-existing', event_id: EVENT_ID, user_id: 'user-joiner', role: 'guest', rsvp_status: 'going',
    };

    const inviteChain  = buildChain();
    const memberChain  = buildChain();
    const userChain    = buildChain();
    const activityChain = buildChain();
    const acceptChain  = buildChain();

    inviteChain.maybeSingle.mockResolvedValueOnce({ data: activeInvite(), error: null });
    memberChain.single.mockResolvedValueOnce({ data: existingMembership, error: null });
    userChain.single.mockResolvedValue({ data: { name: 'Alice' }, error: null });

    setupFromMock({
      invites: inviteChain,
      event_members: memberChain,
      users: userChain,
      invite_acceptances: acceptChain,
      event_activity: activityChain,
    });

    const res = await request(app)
      .post(`/invites/${TOKEN}/accept`)
      .set('Authorization', 'Bearer token')
      .send({ rsvp_status: 'going' });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('mem-existing');
    expect(res.body.error).toBeNull();
  });

  it('TEST 11b — accept expired invite → 410 EXPIRED', async () => {
    const inviteChain = buildChain();
    inviteChain.maybeSingle.mockResolvedValueOnce({ data: expiredInvite(), error: null });

    setupFromMock({ invites: inviteChain });

    const res = await request(app)
      .post(`/invites/${TOKEN}/accept`)
      .set('Authorization', 'Bearer token')
      .send({});

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('EXPIRED');
  });

  it('invalid token → 404', async () => {
    const inviteChain = buildChain();
    inviteChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    setupFromMock({ invites: inviteChain });

    const res = await request(app)
      .post(`/invites/bad-token/accept`)
      .set('Authorization', 'Bearer token')
      .send({});

    expect(res.status).toBe(404);
  });
});
