-- Isolierte Spieler-Notizen pro Kampagne (eine Notiz pro User pro Entity pro Kampagne).
-- Spieler sehen/speichern nur Notizen in der aktuellen Kampagne; keine Notizen aus anderen Kampagnen derselben Welt.

CREATE TABLE IF NOT EXISTS campaign_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('npc', 'faction', 'lore', 'location')),
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_notes_lookup
  ON campaign_notes (campaign_id, entity_type, entity_id, user_id);

COMMENT ON TABLE campaign_notes IS 'Spieler-Notizen zu NPCs/Orten/Lore pro Kampagne; isoliert pro campaign_id.';

-- RLS: Nutzer dürfen nur eigene Zeilen sehen/ändern, und nur wenn sie Zugriff auf die Kampagne haben (GM oder akzeptiertes Mitglied).
ALTER TABLE campaign_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own campaign notes"
  ON campaign_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign notes"
  ON campaign_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign notes"
  ON campaign_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign notes"
  ON campaign_notes FOR DELETE
  USING (auth.uid() = user_id);
