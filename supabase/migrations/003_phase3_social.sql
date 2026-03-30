-- Phase 3: Social Core

-- Activity feed
CREATE TABLE IF NOT EXISTS event_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,         -- 'join' | 'claim' | 'unclaim' | 'event_update' | 'all_claimed'
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS event_activity_event_id_idx ON event_activity(event_id, created_at DESC);

-- Item comments
CREATE TABLE IF NOT EXISTS item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS item_comments_item_id_idx ON item_comments(item_id, created_at ASC);

-- RLS: activity visible to event members only
ALTER TABLE event_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event members can view activity" ON event_activity
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM event_members WHERE event_id = event_activity.event_id AND user_id = auth.uid())
  );

-- RLS: comments visible to event members only
ALTER TABLE item_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event members can view comments" ON item_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM event_members WHERE event_id = item_comments.event_id AND user_id = auth.uid())
  );
CREATE POLICY "event members can insert comments" ON item_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM event_members WHERE event_id = item_comments.event_id AND user_id = auth.uid())
  );
