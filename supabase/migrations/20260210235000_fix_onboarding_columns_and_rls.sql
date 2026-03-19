-- ============================================================================
-- 1. Fehlende Spalten für Onboarding-Einstellungen
-- ============================================================================

-- Fraktionen: GM kann erlauben, dass Spieler bei Charaktererstellung beitreten
ALTER TABLE factions
  ADD COLUMN IF NOT EXISTS allow_pc_join_on_creation boolean DEFAULT false;

-- NPCs: GM kann erlauben, dass Spieler NPCs als Kontakt im Wizard wählen
ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS allow_pc_onboarding boolean DEFAULT false;

-- ============================================================================
-- 2. RLS-Policies: Spieler (Kampagnenmitglieder) dürfen Fraktionen lesen
--    Alte Policy prüft characters.user_id → scheitert vor Charaktererstellung
-- ============================================================================

-- Alte Policy entfernen (prüft characters statt campaign_members)
DROP POLICY IF EXISTS "Players can view revealed factions" ON factions;

-- Neue Policy: Kampagnenmitglieder dürfen Fraktionen lesen wenn:
-- a) campaign_visibility.is_revealed = true ODER
-- b) allow_pc_join_on_creation = true (vom GM für Charakter-Wizard freigegeben)
CREATE POLICY "Campaign members can view revealed factions"
  ON factions
  FOR SELECT
  USING (
    -- GM hat immer Zugriff
    EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id = factions.world_id
        AND worlds.gm_id = auth.uid()
    )
    -- Kampagnenmitglied: revealed ODER für Charakter-Wizard freigegeben
    OR EXISTS (
      SELECT 1 FROM campaign_members cm
      JOIN campaigns c ON c.id = cm.campaign_id
      WHERE c.world_id = factions.world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting', 'In_Review')
        AND (
          factions.allow_pc_join_on_creation = true
          OR EXISTS (
            SELECT 1 FROM campaign_visibility cv
            WHERE cv.entity_id = factions.id
              AND cv.entity_type = 'faction'
              AND cv.is_revealed = true
              AND cv.campaign_id = cm.campaign_id
          )
        )
    )
  );

-- ============================================================================
-- 3. RLS-Policy: Spieler dürfen NPCs der Kampagne lesen (fehlte komplett)
-- ============================================================================

CREATE POLICY "Campaign members can view world NPCs"
  ON npcs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_members cm ON cm.campaign_id = c.id
      WHERE c.world_id = npcs.world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting', 'In_Review')
    )
    OR EXISTS (
      SELECT 1 FROM worlds
      WHERE worlds.id = npcs.world_id
        AND worlds.gm_id = auth.uid()
    )
  );
