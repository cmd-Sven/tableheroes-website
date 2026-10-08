-- Situationsfähigkeiten und ausgelegte NPC-Karten, plus Stadtereignisse ohne NPC-Ursprung.

ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS city_abilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS city_card_plays jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS city_sim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  scope text NOT NULL CHECK (scope IN ('city', 'district', 'sector')),
  district_id text,
  sector_label text,
  effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_days integer,
  start_on date NOT NULL,
  end_when jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_city_sim_events_world ON city_sim_events(world_id);

ALTER TABLE city_sim_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "city_sim_events_select_via_gm"
  ON city_sim_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = city_sim_events.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "city_sim_events_insert_via_gm"
  ON city_sim_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = city_sim_events.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "city_sim_events_update_via_gm"
  ON city_sim_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = city_sim_events.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "city_sim_events_delete_via_gm"
  ON city_sim_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w WHERE w.id = city_sim_events.world_id AND w.gm_id = auth.uid()
    )
  );
