-- Ruf des Spielcharakters bei Fraktionen (verwaltet vom GM)
-- Der GM stellt z.B. ein: "Leonidas hat Elder-Suns beklaut" → negativer Ruf

CREATE TABLE IF NOT EXISTS character_faction_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  faction_id uuid NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  reputation integer NOT NULL DEFAULT 0 CHECK (reputation >= -100 AND reputation <= 100),
  gm_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_character_faction_reputation_character ON character_faction_reputation(character_id);
CREATE INDEX IF NOT EXISTS idx_character_faction_reputation_faction ON character_faction_reputation(faction_id);

ALTER TABLE character_faction_reputation ENABLE ROW LEVEL SECURITY;

-- GM: Kann Ruf für Charaktere seiner Kampagnen verwalten
CREATE POLICY "gm_manage_reputation"
  ON character_faction_reputation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaigns camp ON camp.id = c.campaign_id
      WHERE c.id = character_faction_reputation.character_id
        AND camp.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN campaigns camp ON camp.id = c.campaign_id
      WHERE c.id = character_faction_reputation.character_id
        AND camp.gm_id = auth.uid()
    )
  );

-- Spieler: Kann Ruf ihres eigenen Charakters lesen
CREATE POLICY "player_read_own_reputation"
  ON character_faction_reputation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_faction_reputation.character_id
        AND c.user_id = auth.uid()
    )
  );
