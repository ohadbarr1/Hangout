import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const createTeamSchema = z.object({
  name:  z.string().min(1).max(40),
  emoji: z.string().min(1).max(8).default('⚡'),
  color: z.enum(['coral', 'violet', 'mint', 'golden', 'charcoal']).default('coral'),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
  teamId: z.string().uuid().nullable(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isAdminOrMod(eventId: string, userId: string): Promise<boolean> {
  const { data: event } = await supabase
    .from('events').select('admin_id').eq('id', eventId).single();
  if (event?.admin_id === userId) return true;

  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  return membership?.role === 'admin' || membership?.role === 'moderator';
}

// ─── GET /events/:eventId/teams ───────────────────────────────────────────────
// Returns teams with their members and claimed item counts.

router.get('/:eventId/teams', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  // Must be a member
  const { data: membership } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    res.status(403).json({ data: null, error: { message: 'Not a member of this event', code: 'FORBIDDEN' } });
    return;
  }

  // Fetch teams
  const { data: teams, error } = await supabase
    .from('event_teams')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at');

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  // Fetch team members (event_members with team_id set)
  const { data: members } = await supabase
    .from('event_members')
    .select('id, user_id, team_id, users(id, name, avatar_url)')
    .eq('event_id', eventId)
    .not('team_id', 'is', null);

  // Fetch claimed items to compute team scores
  const { data: assignments } = await supabase
    .from('assignments')
    .select('user_id, items!inner(event_id)')
    .eq('items.event_id', eventId);

  // Build claimed-by-user map
  const claimedByUser: Record<string, number> = {};
  for (const a of assignments ?? []) {
    claimedByUser[a.user_id] = (claimedByUser[a.user_id] ?? 0) + 1;
  }

  // Build teams with members + scores
  const result = (teams ?? []).map((team) => {
    const teamMembers = (members ?? [])
      .filter((m) => m.team_id === team.id)
      .map((m) => ({
        id:         (m.users as any)?.id ?? m.user_id,
        name:       (m.users as any)?.name ?? 'Unknown',
        avatar_url: (m.users as any)?.avatar_url ?? null,
        claimed:    claimedByUser[m.user_id] ?? 0,
      }));

    const claimedCount = teamMembers.reduce((sum, m) => sum + m.claimed, 0);

    return {
      ...team,
      members:      teamMembers,
      claimedCount,
    };
  });

  res.json({ data: result, error: null });
});

// ─── POST /events/:eventId/teams ──────────────────────────────────────────────

router.post('/:eventId/teams', requireAuth, validateBody(createTeamSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;

  if (!(await isAdminOrMod(eventId, userId))) {
    res.status(403).json({ data: null, error: { message: 'Only admins/mods can manage teams', code: 'FORBIDDEN' } });
    return;
  }

  // Max 4 teams per event
  const { count } = await supabase
    .from('event_teams')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if ((count ?? 0) >= 4) {
    res.status(400).json({ data: null, error: { message: 'Maximum 4 teams per event', code: 'LIMIT_REACHED' } });
    return;
  }

  const { name, emoji, color } = req.body;

  const { data: team, error } = await supabase
    .from('event_teams')
    .insert({ event_id: eventId, name, emoji, color })
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.status(201).json({ data: team, error: null });
});

// ─── DELETE /events/:eventId/teams/:teamId ────────────────────────────────────

router.delete('/:eventId/teams/:teamId', requireAuth, async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId, teamId } = req.params;

  if (!(await isAdminOrMod(eventId, userId))) {
    res.status(403).json({ data: null, error: { message: 'Only admins/mods can manage teams', code: 'FORBIDDEN' } });
    return;
  }

  const { error } = await supabase
    .from('event_teams')
    .delete()
    .eq('id', teamId)
    .eq('event_id', eventId);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: { deleted: true }, error: null });
});

// ─── PATCH /events/:eventId/teams/assign ─────────────────────────────────────
// Assign a member to a team (or remove from team if teamId is null).
// Admin/mod can assign anyone; members can assign themselves.

router.patch('/:eventId/teams/assign', requireAuth, validateBody(assignSchema), async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { eventId } = req.params;
  const { userId: targetUserId, teamId } = req.body;

  // Self-assign or admin/mod required
  if (targetUserId !== userId && !(await isAdminOrMod(eventId, userId))) {
    res.status(403).json({ data: null, error: { message: 'You can only assign yourself', code: 'FORBIDDEN' } });
    return;
  }

  const { error } = await supabase
    .from('event_members')
    .update({ team_id: teamId })
    .eq('event_id', eventId)
    .eq('user_id', targetUserId);

  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }

  res.json({ data: { assigned: true }, error: null });
});

export { router as teamsRouter };
