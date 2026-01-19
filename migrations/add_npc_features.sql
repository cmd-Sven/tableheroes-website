-- Migration: NPC Features (Favoriten, Notizen, Alignment)
-- Date: 2024

-- 1. Create npc_favorites table
CREATE TABLE IF NOT EXISTS npc_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, npc_id)
);

-- Add RLS policies for npc_favorites
ALTER TABLE npc_favorites ENABLE ROW LEVEL SECURITY;

-- Users can see their own favorites
CREATE POLICY "Users can view their own favorites"
  ON npc_favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON npc_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON npc_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Add new columns to npcs table
ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS player_notes TEXT,
  ADD COLUMN IF NOT EXISTS gm_notes TEXT,
  ADD COLUMN IF NOT EXISTS alignment TEXT;

-- Add index for alignment (if needed for filtering)
CREATE INDEX IF NOT EXISTS idx_npcs_alignment ON npcs(alignment);

-- Note: RLS policies for npcs should already exist
-- player_notes: Visible to all users who can see the NPC
-- gm_notes: Only visible to GM (handled in application logic)



