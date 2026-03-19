-- World Tasks: Pending entities (location|faction|npc) proposed during NPC/Worldbuilding.
-- RLS: GM of the world (via worlds.gm_id) can read/insert/update.

CREATE TABLE IF NOT EXISTS world_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('location', 'faction', 'npc')),
  proposed_name text NOT NULL,
  description text,
  source_npc_id uuid REFERENCES npcs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_tasks_world_id ON world_tasks(world_id);
CREATE INDEX IF NOT EXISTS idx_world_tasks_status ON world_tasks(status);
CREATE INDEX IF NOT EXISTS idx_world_tasks_source_npc ON world_tasks(source_npc_id);

ALTER TABLE world_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: GM of the world can do everything (select, insert, update; delete optional)
CREATE POLICY "world_tasks_select_via_gm"
  ON world_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = world_tasks.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "world_tasks_insert_via_gm"
  ON world_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = world_tasks.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "world_tasks_update_via_gm"
  ON world_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = world_tasks.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "world_tasks_delete_via_gm"
  ON world_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = world_tasks.world_id AND w.gm_id = auth.uid()
    )
  );
