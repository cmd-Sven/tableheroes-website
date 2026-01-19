-- ============================================================================
-- Factions & NPCs System - Database Tables
-- ============================================================================
-- Erstellt die Tabellen für das Fraktions- und NPC-System.
-- Fraktionen können NPCs enthalten, um Beziehungen zu visualisieren.

-- ============================================================================
-- 1. Factions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Gilde', 'Fraktion', 'Orden', 'Kult', 'Königreich', 'Organisation', 'Andere'
  current_status TEXT, -- 'Neutral', 'Verbündet', 'Freundlich', 'Feindlich', 'Im Krieg'
  description TEXT, -- Spieler-sichtbare Beschreibung
  gm_notes TEXT, -- Nur für GM sichtbar
  is_revealed BOOLEAN DEFAULT FALSE, -- Ob Spieler die Fraktion sehen können
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_factions_campaign_id ON factions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_factions_is_revealed ON factions(is_revealed);

-- ============================================================================
-- 2. NPCs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT, -- z.B. 'Händler', 'Krieger', 'Spion' (Rolle/Position des NPCs)
  description TEXT, -- Spieler-sichtbare Beschreibung
  gm_notes TEXT, -- Nur für GM sichtbar
  faction_id UUID REFERENCES factions(id) ON DELETE SET NULL, -- Zugehörigkeit zu einer Fraktion
  is_revealed BOOLEAN DEFAULT FALSE, -- Ob Spieler den NPC sehen können
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_npcs_campaign_id ON npcs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_faction_id ON npcs(faction_id);
CREATE INDEX IF NOT EXISTS idx_npcs_is_revealed ON npcs(is_revealed);

-- ============================================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Factions Policies
-- ============================================================================

-- Policy 1: GM kann alle Fraktionen in seinen Kampagnen sehen
CREATE POLICY "factions_select_by_gm"
  ON factions
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 2: GM kann Fraktionen in seinen Kampagnen erstellen
CREATE POLICY "factions_insert_by_gm"
  ON factions
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 3: GM kann Fraktionen in seinen Kampagnen bearbeiten
CREATE POLICY "factions_update_by_gm"
  ON factions
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 4: GM kann Fraktionen in seinen Kampagnen löschen
CREATE POLICY "factions_delete_by_gm"
  ON factions
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 5: Spieler können nur revealed Fraktionen in ihren Kampagnen sehen
CREATE POLICY "factions_select_by_players"
  ON factions
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
-- NPCs Policies
-- ============================================================================

-- Policy 1: GM kann alle NPCs in seinen Kampagnen sehen
CREATE POLICY "npcs_select_by_gm"
  ON npcs
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 2: GM kann NPCs in seinen Kampagnen erstellen
CREATE POLICY "npcs_insert_by_gm"
  ON npcs
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 3: GM kann NPCs in seinen Kampagnen bearbeiten
CREATE POLICY "npcs_update_by_gm"
  ON npcs
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 4: GM kann NPCs in seinen Kampagnen löschen
CREATE POLICY "npcs_delete_by_gm"
  ON npcs
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 5: Spieler können nur revealed NPCs in ihren Kampagnen sehen
CREATE POLICY "npcs_select_by_players"
  ON npcs
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
-- 4. Trigger für updated_at
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Factions
DROP TRIGGER IF EXISTS update_factions_updated_at ON factions;
CREATE TRIGGER update_factions_updated_at
  BEFORE UPDATE ON factions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für NPCs
DROP TRIGGER IF EXISTS update_npcs_updated_at ON npcs;
CREATE TRIGGER update_npcs_updated_at
  BEFORE UPDATE ON npcs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Seed Data (Optional - Nur für Testing)
-- ============================================================================

-- Beispiel-Fraktionen (ersetze 'your-campaign-id' mit einer echten Campaign ID)
/*
INSERT INTO factions (campaign_id, name, type, current_status, description, is_revealed)
VALUES
  ('your-campaign-id', 'Die Schattengilde', 'Gilde', 'Neutral', 'Eine geheime Organisation von Dieben und Spionen.', TRUE),
  ('your-campaign-id', 'Der Orden der Silberhand', 'Orden', 'Verbündet', 'Paladine, die dem Licht dienen.', TRUE),
  ('your-campaign-id', 'Das Schwarze Netz', 'Kult', 'Feindlich', 'Ein dunkler Kult, der böse Mächte anbetet.', FALSE);

-- Beispiel-NPCs (ersetze IDs mit echten Werten)
INSERT INTO npcs (campaign_id, faction_id, name, title, description, is_revealed)
VALUES
  ('your-campaign-id', (SELECT id FROM factions WHERE name = 'Die Schattengilde' LIMIT 1), 'Raven', 'Spion', 'Ein mysteriöser Spion mit Verbindungen zur Unterwelt.', TRUE),
  ('your-campaign-id', (SELECT id FROM factions WHERE name = 'Der Orden der Silberhand' LIMIT 1), 'Paladin Alaric', 'Krieger', 'Ein edler Paladin, der das Licht verteidigt.', TRUE),
  ('your-campaign-id', NULL, 'Gundren Steinfaust', 'Händler', 'Ein freundlicher Zwergenhändler.', TRUE);
*/

-- ============================================================================
-- ✅ FERTIG!
-- ============================================================================
-- Die Tabellen und RLS-Policies sind jetzt erstellt.
-- 
-- Nächste Schritte:
-- 1. Führe dieses SQL-Script in Supabase SQL Editor aus
-- 2. Optional: Füge Test-Daten hinzu (siehe Seed Data oben)
-- 3. Starte deine App und navigiere zu einem Campaign Dashboard
-- 4. Klicke auf die Tabs "NPCs" oder "Fraktionen"
-- 
-- Hinweis: Stelle sicher, dass du als GM authentifiziert bist, um NPCs und Fraktionen zu erstellen.

