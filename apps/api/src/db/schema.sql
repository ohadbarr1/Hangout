-- ============================================================
-- Hangout — PostgreSQL Schema
-- Run this in your Supabase SQL editor.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE event_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE member_role  AS ENUM ('admin', 'guest');
CREATE TYPE rsvp_status  AS ENUM ('going', 'maybe', 'not_going', 'pending');

-- ─── TABLES ───────────────────────────────────────────────────────────────────

-- users: mirrors auth.users but stores app-level fields
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL DEFAULT '',
  avatar_url      TEXT,
  expo_push_token TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- events
CREATE TABLE IF NOT EXISTS events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  description  TEXT,
  event_date   TIMESTAMPTZ,
  location     TEXT,
  status       event_status NOT NULL DEFAULT 'draft',
  invite_code  TEXT         NOT NULL UNIQUE,
  hero_color   TEXT         NOT NULL DEFAULT 'coral',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- event_members: tracks who is part of an event
CREATE TABLE IF NOT EXISTS event_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        member_role NOT NULL DEFAULT 'guest',
  rsvp_status rsvp_status NOT NULL DEFAULT 'pending',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- items: things to bring / tasks for an event
CREATE TABLE IF NOT EXISTS items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category         TEXT        NOT NULL DEFAULT 'Tasks',
  name             TEXT        NOT NULL,
  quantity         INTEGER     CHECK (quantity > 0),
  unit             TEXT,
  notes            TEXT,
  is_ai_generated  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- assignments: who claimed an item
CREATE TABLE IF NOT EXISTS assignments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID        NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each item can only be claimed once at a time
  UNIQUE (item_id)
);

-- invites: shareable invite tokens
CREATE TABLE IF NOT EXISTS invites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,
  created_by UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_events_admin_id       ON events (admin_id);
CREATE INDEX IF NOT EXISTS idx_events_invite_code    ON events (invite_code);
CREATE INDEX IF NOT EXISTS idx_events_status         ON events (status);
CREATE INDEX IF NOT EXISTS idx_event_members_user    ON event_members (user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_event   ON event_members (event_id);
CREATE INDEX IF NOT EXISTS idx_items_event_id        ON items (event_id);
CREATE INDEX IF NOT EXISTS idx_items_category        ON items (event_id, category);
CREATE INDEX IF NOT EXISTS idx_assignments_item_id   ON assignments (item_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id   ON assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_invites_token         ON invites (token);
CREATE INDEX IF NOT EXISTS idx_invites_event_id      ON invites (event_id);

-- ─── TRIGGERS ─────────────────────────────────────────────────────────────────

-- Auto-insert a row into public.users when a new auth.user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        name       = COALESCE(EXCLUDED.name, users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated-at trigger function (optional but useful)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites       ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────────────────────

-- Users can read their own profile and other users' public fields
CREATE POLICY "users: read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: read event members"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em1
      JOIN event_members em2 ON em1.event_id = em2.event_id
      WHERE em1.user_id = auth.uid()
        AND em2.user_id = users.id
    )
  );

CREATE POLICY "users: update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ── events ───────────────────────────────────────────────────────────────────

-- Read: only members can see an event
CREATE POLICY "events: members can read"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = events.id
        AND user_id = auth.uid()
    )
  );

-- Insert: any authenticated user can create an event
CREATE POLICY "events: authenticated users can create"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- Update: only the admin can update
CREATE POLICY "events: admin can update"
  ON events FOR UPDATE
  USING (auth.uid() = admin_id);

-- Delete: only the admin can delete
CREATE POLICY "events: admin can delete"
  ON events FOR DELETE
  USING (auth.uid() = admin_id);

-- ── event_members ─────────────────────────────────────────────────────────────

-- Members can read all members of events they belong to
CREATE POLICY "event_members: read if member"
  ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
    )
  );

-- Any user can insert themselves as a member (joining via invite)
CREATE POLICY "event_members: insert self"
  ON event_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can insert anyone (for adding members directly)
CREATE POLICY "event_members: admin can insert"
  ON event_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_members.event_id
        AND admin_id = auth.uid()
    )
  );

-- Users can update their own RSVP status
CREATE POLICY "event_members: update own rsvp"
  ON event_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin can update any member
CREATE POLICY "event_members: admin can update"
  ON event_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_members.event_id
        AND admin_id = auth.uid()
    )
  );

-- Users can remove themselves; admin can remove anyone
CREATE POLICY "event_members: leave or admin remove"
  ON event_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events
      WHERE id = event_members.event_id
        AND admin_id = auth.uid()
    )
  );

-- ── items ─────────────────────────────────────────────────────────────────────

-- Any event member can read items
CREATE POLICY "items: members can read"
  ON items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = items.event_id
        AND user_id = auth.uid()
    )
  );

-- Only admin can insert items
CREATE POLICY "items: admin can insert"
  ON items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = items.event_id
        AND admin_id = auth.uid()
    )
  );

-- Only admin can update items
CREATE POLICY "items: admin can update"
  ON items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = items.event_id
        AND admin_id = auth.uid()
    )
  );

-- Only admin can delete items
CREATE POLICY "items: admin can delete"
  ON items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = items.event_id
        AND admin_id = auth.uid()
    )
  );

-- ── assignments ───────────────────────────────────────────────────────────────

-- Any event member can read assignments
CREATE POLICY "assignments: members can read"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN event_members em ON em.event_id = i.event_id
      WHERE i.id = assignments.item_id
        AND em.user_id = auth.uid()
    )
  );

-- Any event member can claim an item (insert their own assignment)
CREATE POLICY "assignments: members can claim"
  ON assignments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM items i
      JOIN event_members em ON em.event_id = i.event_id
      WHERE i.id = assignments.item_id
        AND em.user_id = auth.uid()
    )
  );

-- Users can only delete their own assignments (unclaim)
CREATE POLICY "assignments: users can unclaim own"
  ON assignments FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can delete any assignment
CREATE POLICY "assignments: admin can unclaim any"
  ON assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM items i
      JOIN events e ON e.id = i.event_id
      WHERE i.id = assignments.item_id
        AND e.admin_id = auth.uid()
    )
  );

-- ── invites ───────────────────────────────────────────────────────────────────

-- Anyone can read an invite by token (needed for unauthenticated preview)
-- We expose only non-sensitive fields via the API layer instead.
CREATE POLICY "invites: public read by token"
  ON invites FOR SELECT
  USING (true);

-- Only event admin can create invites
CREATE POLICY "invites: admin can create"
  ON invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = invites.event_id
        AND admin_id = auth.uid()
    )
  );

-- Admin can delete their own invites
CREATE POLICY "invites: admin can delete"
  ON invites FOR DELETE
  USING (auth.uid() = created_by);

-- ─── REALTIME PUBLICATION ─────────────────────────────────────────────────────

-- Add tables to the realtime publication so clients can subscribe
-- (Run these if your project doesn't already have them)
-- ALTER PUBLICATION supabase_realtime ADD TABLE events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE event_members;
