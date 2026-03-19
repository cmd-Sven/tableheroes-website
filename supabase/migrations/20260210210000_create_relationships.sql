-- Beziehungen zwischen NPCs, PCs und Gruppen (asymmetrisch, mit Monologen und History).

CREATE TABLE IF NOT EXISTS relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  source_id uuid NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL DEFAULT 'npc' CHECK (target_type IN ('npc', 'pc', 'group')),
  source_role text NOT NULL DEFAULT '',
  target_role text NOT NULL DEFAULT '',
  intensity integer NOT NULL DEFAULT 0 CHECK (intensity >= -100 AND intensity <= 100),
  monologue_source text DEFAULT '',
  monologue_target text DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  public_description text DEFAULT '',
  history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_relationship CHECK (source_id != target_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_world ON relationships(world_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_pair ON relationships(world_id, source_id, target_id);

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relationships_select_via_gm"
  ON relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = relationships.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "relationships_insert_via_gm"
  ON relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = relationships.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "relationships_update_via_gm"
  ON relationships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = relationships.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "relationships_delete_via_gm"
  ON relationships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = relationships.world_id AND w.gm_id = auth.uid()
    )
  );
