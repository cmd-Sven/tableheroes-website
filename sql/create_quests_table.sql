-- ============================================================================
-- Quest Management System - Database Table
-- ============================================================================
-- Erstellt die Tabelle für das Quest Management System (Journal).
-- Quests können mit NPCs (quest_giver) und World Lore (location) verknüpft werden.

-- ============================================================================
-- 1. Quests Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  quest_giver_id UUID REFERENCES npcs(id) ON DELETE SET NULL, -- NPC der die Quest gibt
  location_id UUID REFERENCES world_lore(id) ON DELETE SET NULL, -- Ort der Quest
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Main Quest', 'Side Quest', 'Fetch Quest', 'Kill Quest', 'Escort Quest', 'Mystery Quest', 'Other'
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Completed'
  description TEXT, -- Spieler-sichtbare Beschreibung
  rewards TEXT, -- Belohnungen (Gold, Items, XP)
  gm_notes TEXT, -- Nur für GM sichtbar
  is_revealed BOOLEAN DEFAULT FALSE, -- Ob Spieler die Quest sehen können
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_quests_campaign_id ON quests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_quest_giver_id ON quests(quest_giver_id);
CREATE INDEX IF NOT EXISTS idx_quests_location_id ON quests(location_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_is_revealed ON quests(is_revealed);

-- ============================================================================
-- 2. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Quests Policies
-- ============================================================================

-- Policy 1: GM kann alle Quests in seinen Kampagnen sehen
CREATE POLICY "quests_select_by_gm"
  ON quests
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 2: GM kann Quests in seinen Kampagnen erstellen
CREATE POLICY "quests_insert_by_gm"
  ON quests
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 3: GM kann Quests in seinen Kampagnen bearbeiten
CREATE POLICY "quests_update_by_gm"
  ON quests
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 4: GM kann Quests in seinen Kampagnen löschen
CREATE POLICY "quests_delete_by_gm"
  ON quests
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 5: Spieler können nur revealed Quests in ihren Kampagnen sehen
CREATE POLICY "quests_select_by_players"
  ON quests
  FOR SELECT
  USING (
    is_revealed = TRUE
    AND campaign_id IN (
      SELECT campaign_id FROM campaign_members 
      WHERE user_id = auth.uid() 
      AND status = 'Accepted'
    )
  );

-- ============================================================================
-- 3. Trigger für updated_at
-- ============================================================================

-- Trigger für Quests
DROP TRIGGER IF EXISTS update_quests_updated_at ON quests;
CREATE TRIGGER update_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Seed Data (Optional - Nur für Testing)
-- ============================================================================

-- Beispiel: Quest mit NPC und Location (ersetze 'your-campaign-id' mit einer echten Campaign ID)
/*
-- Erstelle zuerst NPC und Location (siehe npcs und world_lore Tabellen)
-- Dann erstelle Quest:

INSERT INTO quests (
  campaign_id,
  quest_giver_id,
  location_id,
  title,
  type,
  status,
  description,
  rewards,
  gm_notes,
  is_revealed
)
VALUES (
  'your-campaign-id',
  (SELECT id FROM npcs WHERE name = 'Gundren Steinfaust' LIMIT 1),
  (SELECT id FROM world_lore WHERE name = 'Phandalin' LIMIT 1),
  'Die verlorene Mine',
  'Main Quest',
  'Active',
  'Gundren bittet euch, seine verschwundene Mine zu finden. Spuren führen in die Berge.',
  '500 Gold, 1 Seltenes Artefakt',
  'Die Mine ist von Goblins besetzt. Ein Boss-Goblin wartet am Ende.',
  TRUE
);
*/

-- ============================================================================
-- ✅ FERTIG!
-- ============================================================================
-- Die Tabelle und RLS-Policies sind jetzt erstellt.
-- 
-- Nächste Schritte:
-- 1. Führe dieses SQL-Script in Supabase SQL Editor aus
-- 2. Optional: Füge Test-Daten hinzu (siehe Seed Data oben)
-- 3. Starte deine App und navigiere zu einem Campaign Dashboard
-- 4. Klicke auf den Tab "Quests" / "Journal"
-- 
-- Hinweis: Quests können mit NPCs (quest_giver_id) und World Lore (location_id) verknüpft werden.
-- Die AI-Integration nutzt diese Verknüpfungen als Context für die Quest-Generierung.





