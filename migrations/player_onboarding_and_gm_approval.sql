-- ============================================================================
-- Player Onboarding & GM Approval System
-- ============================================================================
-- Voraussetzungen für Spieler-Onboarding: Welche Fraktionen/Orte im Wizard
-- wählbar sind, NPC-Wünsche als Anträge, Charakter-Status Pending_Approval/Active.
--
-- 1. factions: allow_pc_join_on_creation (Boolean, Default false)
-- 2. world_lore: allow_pc_origin (Boolean, Default false) – für "Heimatort" im Wizard
-- 3. player_npc_requests: Tabelle für NPC-Wünsche der Spieler (kein direkter NPC-Insert)
-- 4. characters.status: Werte 'Pending_Approval' und 'Active' nutzen (falls nicht vorhanden)
-- ============================================================================

-- 1. Fraktionen: Spieler dürfen bei Charaktererstellung diese Fraktion wählen
ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS allow_pc_join_on_creation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.factions.allow_pc_join_on_creation IS 'Wenn TRUE, können Spieler im Charakter-Wizard diese Fraktion als Zugehörigkeit wählen.';

-- 2. Welt-Lore (Orte): Spieler dürfen bei Charaktererstellung diesen Ort als Heimatort wählen
ALTER TABLE public.world_lore
ADD COLUMN IF NOT EXISTS allow_pc_origin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.world_lore.allow_pc_origin IS 'Wenn TRUE, können Spieler im Charakter-Wizard diesen Ort als Heimatort wählen (nur bei Typen wie Stadt, Region, Ort, etc.).';

-- 3. Player NPC Requests – Anträge für neue NPCs (Name, Beziehung), kein direkter NPC-Insert
CREATE TABLE IF NOT EXISTS public.player_npc_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_npc_requests_campaign ON player_npc_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_npc_requests_character ON player_npc_requests(character_id);
CREATE INDEX IF NOT EXISTS idx_player_npc_requests_status ON player_npc_requests(status);

ALTER TABLE public.player_npc_requests ENABLE ROW LEVEL SECURITY;

-- RLS: GM sieht alle Anträge seiner Kampagne; Spieler nur eigene
CREATE POLICY "player_npc_requests_select_gm"
  ON player_npc_requests FOR SELECT
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE POLICY "player_npc_requests_select_own"
  ON player_npc_requests FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "player_npc_requests_insert_own"
  ON player_npc_requests FOR INSERT
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "player_npc_requests_update_gm"
  ON player_npc_requests FOR UPDATE
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

-- Trigger updated_at (falls update_updated_at_column existiert)
-- DROP TRIGGER IF EXISTS update_player_npc_requests_updated_at ON player_npc_requests;
-- CREATE TRIGGER update_player_npc_requests_updated_at
--   BEFORE UPDATE ON player_npc_requests
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- characters.status: 'Pending_Approval' (nach Wizard) und 'Active' (nach GM-Freigabe)
-- Falls deine characters-Tabelle ein CHECK auf status hat, erweitere es um diese Werte.
-- Beispiel: ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_status_check;
-- ALTER TABLE characters ADD CONSTRAINT characters_status_check
--   CHECK (status IN ('Alive','Dead','Archived','Paused','Pending_Approval','Active'));
-- ============================================================================
