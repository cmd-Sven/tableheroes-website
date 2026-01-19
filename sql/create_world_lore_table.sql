-- ============================================================================
-- World Lore System - Hierarchical Database Table
-- ============================================================================
-- Erstellt die Tabelle für das hierarchische World Lore System.
-- Ermöglicht verschachtelte Strukturen (z.B. Königreich → Stadt → Taverne).

-- ============================================================================
-- 1. World Lore Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS world_lore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES world_lore(id) ON DELETE CASCADE, -- Self-referencing für Hierarchie
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Location', 'History', 'Religion', 'Culture', 'Magic', 'Organization', 'Event', 'Other'
  image_url TEXT, -- Optional: Bild für den Eintrag
  description TEXT, -- Spieler-sichtbare Beschreibung
  gm_notes TEXT, -- Nur für GM sichtbar
  is_revealed BOOLEAN DEFAULT FALSE, -- Ob Spieler den Eintrag sehen können
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_world_lore_campaign_id ON world_lore(campaign_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_parent_id ON world_lore(parent_id);
CREATE INDEX IF NOT EXISTS idx_world_lore_type ON world_lore(type);
CREATE INDEX IF NOT EXISTS idx_world_lore_is_revealed ON world_lore(is_revealed);

-- ============================================================================
-- 2. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE world_lore ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- World Lore Policies
-- ============================================================================

-- Policy 1: GM kann alle Lore-Einträge in seinen Kampagnen sehen
CREATE POLICY "world_lore_select_by_gm"
  ON world_lore
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 2: GM kann Lore-Einträge in seinen Kampagnen erstellen
CREATE POLICY "world_lore_insert_by_gm"
  ON world_lore
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 3: GM kann Lore-Einträge in seinen Kampagnen bearbeiten
CREATE POLICY "world_lore_update_by_gm"
  ON world_lore
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 4: GM kann Lore-Einträge in seinen Kampagnen löschen
CREATE POLICY "world_lore_delete_by_gm"
  ON world_lore
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE gm_id = auth.uid()
    )
  );

-- Policy 5: Spieler können nur revealed Lore-Einträge in ihren Kampagnen sehen
CREATE POLICY "world_lore_select_by_players"
  ON world_lore
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

-- Trigger für World Lore
DROP TRIGGER IF EXISTS update_world_lore_updated_at ON world_lore;
CREATE TRIGGER update_world_lore_updated_at
  BEFORE UPDATE ON world_lore
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Seed Data (Optional - Nur für Testing)
-- ============================================================================

-- Beispiel: Hierarchische Lore-Struktur (ersetze 'your-campaign-id' mit einer echten Campaign ID)
/*
-- Level 1: Königreich
INSERT INTO world_lore (campaign_id, name, type, description, is_revealed)
VALUES ('your-campaign-id', 'Königreich Arandor', 'Location', 'Ein mächtiges Königreich im Norden.', TRUE)
RETURNING id AS kingdom_id;

-- Level 2: Stadt (mit parent_id zum Königreich)
INSERT INTO world_lore (campaign_id, parent_id, name, type, description, is_revealed)
VALUES (
  'your-campaign-id',
  'kingdom_id', -- Ersetze mit der tatsächlichen UUID des Königreichs
  'Stadt Neverwinter',
  'Location',
  'Die Hauptstadt von Arandor.',
  TRUE
)
RETURNING id AS city_id;

-- Level 3: Taverne (mit parent_id zur Stadt)
INSERT INTO world_lore (campaign_id, parent_id, name, type, description, is_revealed)
VALUES (
  'your-campaign-id',
  'city_id', -- Ersetze mit der tatsächlichen UUID der Stadt
  'Die Singende Klinge',
  'Location',
  'Eine beliebte Taverne im Hafenviertel.',
  TRUE
);

-- Historie
INSERT INTO world_lore (campaign_id, name, type, description, is_revealed)
VALUES (
  'your-campaign-id',
  'Das Große Schisma',
  'History',
  'Vor 200 Jahren spaltete sich die Kirche in zwei Fraktionen.',
  FALSE -- Hidden für Spieler
);

-- Religion
INSERT INTO world_lore (campaign_id, name, type, description, is_revealed)
VALUES (
  'your-campaign-id',
  'Kult des Raben',
  'Religion',
  'Eine geheimnisvolle Religion, die den Raben als Götterboten verehrt.',
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
-- 4. Klicke auf den Tab "Welt & Lore"
-- 
-- Hinweis: Die Hierarchie wird automatisch im Frontend rekonstruiert.
-- Die Datenbank speichert nur flache Einträge mit parent_id Referenzen.





