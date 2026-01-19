-- Migration: Fix RLS Policies for Quests (Player Visibility)
-- Date: 2024
-- Purpose: Ensure players can see revealed quests when loading NPCs

-- ============================================================================
-- 1. RLS Policies for quests table
-- ============================================================================

-- ============================================================================
-- 1. Update existing RLS Policy for quests table
-- ============================================================================

-- Drop existing player policy if it exists (keep GM policies)
DROP POLICY IF EXISTS "quests_select_by_players" ON quests;

-- Policy: Players can view revealed quests if they are members of the campaign
-- This replaces the existing "quests_select_by_players" policy with updated status check
-- Note: GM policies remain unchanged (they can see all quests)
CREATE POLICY "quests_select_by_players"
  ON quests
  FOR SELECT
  USING (
    -- Player can see revealed quests if they are a member (with extended statuses)
    quests.is_revealed = TRUE
    AND EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.campaign_id = quests.campaign_id
      AND campaign_members.user_id = auth.uid()
      AND campaign_members.status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );

-- ============================================================================
-- 2. RLS Policies for quest_participants table
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE quest_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "quest_participants_select_by_gm" ON quest_participants;
DROP POLICY IF EXISTS "quest_participants_select_by_players" ON quest_participants;

-- Policy 1: GM can view all quest participants in their campaigns
CREATE POLICY "quest_participants_select_by_gm"
  ON quest_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaigns ON campaigns.id = quests.campaign_id
      WHERE quests.id = quest_participants.quest_id
      AND campaigns.gm_id = auth.uid()
    )
  );

-- Policy 2: Players can view quest participants if the associated quest is revealed
CREATE POLICY "quest_participants_select_by_players"
  ON quest_participants
  FOR SELECT
  USING (
    -- Player can see participants if the quest is revealed and they are a member
    EXISTS (
      SELECT 1 FROM quests
      JOIN campaign_members ON campaign_members.campaign_id = quests.campaign_id
      WHERE quests.id = quest_participants.quest_id
      AND quests.is_revealed = true
      AND campaign_members.user_id = auth.uid()
      AND campaign_members.status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );

-- ============================================================================
-- 3. Verify: Check if RLS is enabled
-- ============================================================================
-- Note: These should already be enabled, but we verify:
-- ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quest_participants ENABLE ROW LEVEL SECURITY;

