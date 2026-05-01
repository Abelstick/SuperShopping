-- Add session_id to purchase_items (was missing from original schema)
ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES shopping_sessions(id) ON DELETE SET NULL;

-- Index for realtime filter performance
CREATE INDEX IF NOT EXISTS idx_purchase_items_session_id ON purchase_items(session_id);
