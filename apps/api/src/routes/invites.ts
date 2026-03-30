import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import satori from 'satori';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { writeActivity } from '../lib/activity';
import { notificationService } from '../services/notificationService';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const acceptInviteSchema = z.object({
  rsvp_status: z.enum(['going', 'maybe', 'not_going', 'pending']).optional().default('going'),
});

// ─── POST /events/:eventId/invites — create an invite link ───────────────────

router.post('/events/:eventId/invites', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  // Only admin can generate new invite tokens
  const { data: event } = await supabase
    .from('events')
    .select('admin_id, invite_code')
    .eq('id', eventId)
    .single();

  if (!event) {
    res.status(404).json({ data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } });
    return;
  }

  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: 'Only the event admin can create invites', code: 'FORBIDDEN' } });
    return;
  }

  // Generate a new invite token (separate from the event invite_code for tracking)
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      event_id: eventId,
      token,
      created_by: userId,
      expires_at: expiresAt,
    })
    .select('*, event:events(id, title, event_date, location, status)')
    .single();

  if (error || !invite) {
    res.status(500).json({ data: null, error: { message: error?.message ?? 'Failed to create invite' } });
    return;
  }

  res.status(201).json({ data: invite, error: null });
});

// ─── GET /invites/:token — preview an invite (no auth required) ───────────────

router.get('/invites/:token', async (req, res) => {
  const { token } = req.params;

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*, event:events(id, title, event_date, location, status, hero_color)')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    res.status(404).json({ data: null, error: { message: 'Invite not found or expired', code: 'NOT_FOUND' } });
    return;
  }

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ data: null, error: { message: 'This invite link has expired', code: 'EXPIRED' } });
    return;
  }

  // Check if the event is still active
  const eventData = invite.event as { id: string; status: string } | null;
  if (eventData && (eventData.status === 'cancelled' || eventData.status === 'completed')) {
    res.status(410).json({ data: null, error: { message: 'This event is no longer available', code: 'EVENT_UNAVAILABLE' } });
    return;
  }

  const eventId = (invite.event as { id: string } | null)?.id ?? invite.event_id;

  const [{ count: memberCount }, { count: itemCount }] = await Promise.all([
    supabase.from('event_members').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ]);

  res.json({
    data: {
      ...invite,
      event: {
        ...(invite.event as object),
        member_count: memberCount ?? 0,
        item_count: itemCount ?? 0,
      },
    },
    error: null,
  });
});

// ─── GET /invites/:token/og-image — social preview SVG ───────────────────────

router.get('/invites/:token/og-image', async (req, res) => {
  const { token } = req.params;

  const { data: invite } = await supabase
    .from('invites')
    .select('*, event:events(id, title, event_date, location, hero_color, status)')
    .eq('token', token)
    .maybeSingle();

  if (!invite?.event) {
    res.status(404).send('Not found');
    return;
  }

  const event = invite.event as { title: string; event_date: string | null; location: string | null; hero_color: string; status: string };

  const HERO_COLORS: Record<string, string> = {
    coral: '#FF6B4A', violet: '#7B61FF', mint: '#06D6A0',
    golden: '#FFD166', charcoal: '#2E2E50',
  };
  const bgColor = HERO_COLORS[event.hero_color] ?? HERO_COLORS.coral;

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgColor,
          padding: '60px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontSize: 28, color: 'rgba(255,255,255,0.8)', marginBottom: 16, fontFamily: 'sans-serif' },
              children: "You're invited to",
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 64, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', lineHeight: 1.2, fontFamily: 'sans-serif' },
              children: event.title,
            },
          },
          ...(dateStr ? [{
            type: 'div',
            props: {
              style: { fontSize: 28, color: 'rgba(255,255,255,0.85)', marginTop: 24, fontFamily: 'sans-serif' },
              children: `📅 ${dateStr}`,
            },
          }] : []),
          {
            type: 'div',
            props: {
              style: { fontSize: 22, color: 'rgba(255,255,255,0.6)', marginTop: 32, fontFamily: 'sans-serif' },
              children: 'hangout.app',
            },
          },
        ],
      },
    } as unknown as Parameters<typeof satori>[0];

    const svg = await satori(element, {
      width: 1200,
      height: 630,
      fonts: [],
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (err) {
    // Fallback: return a simple colored SVG
    const fallback = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${bgColor}"/>
      <text x="600" y="280" font-size="64" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">${event.title.replace(/[<>&"]/g, '')}</text>
      <text x="600" y="380" font-size="28" fill="rgba(255,255,255,0.7)" text-anchor="middle" font-family="sans-serif">You're invited</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(fallback);
  }
});

// ─── POST /invites/:token/accept — join an event via invite ──────────────────

router.post('/invites/:token/accept', requireAuth, validateBody(acceptInviteSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { token } = req.params;

  const { data: invite } = await supabase
    .from('invites')
    .select('*, event:events(id, title, status, admin_id)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    res.status(404).json({ data: null, error: { message: 'Invite not found', code: 'NOT_FOUND' } });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ data: null, error: { message: 'Invite expired', code: 'EXPIRED' } });
    return;
  }

  const eventData = invite.event as { id: string; status: string; title: string; admin_id: string } | null;
  if (!eventData || eventData.status === 'cancelled') {
    res.status(400).json({ data: null, error: { message: 'This event is no longer available', code: 'EVENT_UNAVAILABLE' } });
    return;
  }

  // Upsert membership (user may have been added by admin before)
  const { data: membership, error: memberError } = await supabase
    .from('event_members')
    .upsert({
      event_id: invite.event_id,
      user_id: userId,
      role: 'guest',
      rsvp_status: req.body.rsvp_status,
    }, { onConflict: 'event_id,user_id' })
    .select()
    .single();

  if (memberError || !membership) {
    res.status(500).json({ data: null, error: { message: memberError?.message ?? 'Failed to join event' } });
    return;
  }

  // Track usage for analytics (does not invalidate the invite — invites are multi-use)
  try {
    await supabase
      .from('invite_acceptances')
      .insert({ invite_id: invite.id, user_id: userId, accepted_at: new Date().toISOString() });
  } catch {
    // Non-critical: table may not exist yet. Invite acceptance still succeeds.
  }

  // Look up joiner's name for activity + notification
  const { data: joiner } = await supabase.from('users').select('name').eq('id', userId).single();

  // Write activity: join
  writeActivity(invite.event_id, userId, 'join', { userName: joiner?.name ?? null }).catch(() => {});

  // Notify event admin that someone joined
  if (eventData.admin_id && eventData.admin_id !== userId) {
    const { data: adminUser } = await supabase
      .from('users')
      .select('expo_push_token, name')
      .eq('id', eventData.admin_id)
      .single();
    if (adminUser?.expo_push_token) {
      const joinerName = joiner?.name ?? 'Someone';
      notificationService.sendPush({
        to: adminUser.expo_push_token,
        title: eventData.title,
        body: `${joinerName} just joined! 👋`,
        data: { eventId: invite.event_id },
      }).catch(() => {});
    }
  }

  res.json({ data: membership, error: null });
});

function generateToken(): string {
  return require('crypto').randomBytes(24).toString('hex'); // 48 chars, 192-bit entropy
}

export { router as invitesRouter };
