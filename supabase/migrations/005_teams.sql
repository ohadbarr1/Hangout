-- ─── Event Teams ──────────────────────────────────────────────────────────────
-- Gamified teams: members can be split into competing teams per event.
-- Teams track item claims per team for leaderboard scoring.

CREATE TABLE IF NOT EXISTS event_teams (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  emoji      TEXT        NOT NULL DEFAULT '⚡',
  color      TEXT        NOT NULL DEFAULT 'coral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add team membership column to event_members
ALTER TABLE event_members
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES event_teams(id) ON DELETE SET NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE event_teams ENABLE ROW LEVEL SECURITY;

-- Any event member can see the teams for that event
CREATE POLICY "members_view_teams" ON event_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_teams.event_id
        AND em.user_id  = auth.uid()
    )
  );

-- Admins and moderators can create / update / delete teams
CREATE POLICY "admin_manage_teams" ON event_teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = event_teams.event_id AND admin_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_teams.event_id
        AND em.user_id  = auth.uid()
        AND em.role IN ('admin', 'moderator')
    )
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_event_teams_event_id  ON event_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_team_id ON event_members(team_id);
