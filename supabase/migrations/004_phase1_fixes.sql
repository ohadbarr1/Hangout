-- Phase 1: Production Fixes
-- Applied: Race condition prevention, indexes for pagination performance

-- ─── Assignments: enforce one assignment per item at the DB level ─────────────
-- This eliminates the SELECT → check → INSERT race window.
-- Two concurrent INSERTs will result in exactly one succeeding;
-- the other gets PostgreSQL error code 23505 (unique_violation) → 409 CONFLICT.
-- Uses a DO block because PostgreSQL does not support IF NOT EXISTS on ADD CONSTRAINT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'assignments_item_id_unique'
    AND table_name = 'assignments'
  ) THEN
    ALTER TABLE assignments
      ADD CONSTRAINT assignments_item_id_unique UNIQUE (item_id);
  END IF;
END $$;

-- ─── Performance indexes ──────────────────────────────────────────────────────

-- Speeds up paginated member list queries (GET /events/:id/members)
CREATE INDEX IF NOT EXISTS event_members_event_id_joined_idx
  ON event_members(event_id, joined_at DESC);

-- Speeds up item list queries (GET /events/:eventId/items)
CREATE INDEX IF NOT EXISTS items_event_id_created_idx
  ON items(event_id, created_at ASC);

-- Speeds up assignment lookups by item
CREATE INDEX IF NOT EXISTS assignments_item_id_idx
  ON assignments(item_id);

-- Speeds up invite token lookups (GET /invites/:token)
CREATE INDEX IF NOT EXISTS invites_token_idx
  ON invites(token);

-- Speeds up invite expiry checks
CREATE INDEX IF NOT EXISTS invites_expires_at_idx
  ON invites(expires_at);
