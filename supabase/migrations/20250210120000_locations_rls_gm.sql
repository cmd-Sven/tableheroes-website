-- RLS für locations: GM der Welt darf Orte (SELECT/INSERT/UPDATE/DELETE) für diese Welt.
-- Behebt: "new row violates row-level security policy for table locations"
-- beim Anlegen eines NPCs mit Aufenthaltsort aus world_lore (z. B. "Explora").

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Alte Policies mit diesen Namen ggf. entfernen (für saubere Wiederanwendung)
DROP POLICY IF EXISTS "locations_select_gm" ON locations;
DROP POLICY IF EXISTS "locations_insert_gm" ON locations;
DROP POLICY IF EXISTS "locations_update_gm" ON locations;
DROP POLICY IF EXISTS "locations_delete_gm" ON locations;

-- SELECT: GM sieht alle Orte seiner Welten
CREATE POLICY "locations_select_gm"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = locations.world_id AND w.gm_id = auth.uid()
    )
  );

-- INSERT: GM darf Orte nur für eigene Welten anlegen (z. B. aus world_lore beim NPC-Erstellen)
CREATE POLICY "locations_insert_gm"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = locations.world_id AND w.gm_id = auth.uid()
    )
  );

-- UPDATE/DELETE: GM darf Orte seiner Welten bearbeiten/löschen
CREATE POLICY "locations_update_gm"
  ON locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = locations.world_id AND w.gm_id = auth.uid()
    )
  );

CREATE POLICY "locations_delete_gm"
  ON locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM worlds w
      WHERE w.id = locations.world_id AND w.gm_id = auth.uid()
    )
  );
