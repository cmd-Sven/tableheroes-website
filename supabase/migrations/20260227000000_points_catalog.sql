-- Punktekatalog: GM-erstellte Belohnungen (physisch oder Achievement)
-- Spieler können Punkte dafür ausgeben.

-- Tabelle points_catalog (Belohnungen im Katalog)
CREATE TABLE IF NOT EXISTS public.points_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost int NOT NULL CHECK (points_cost > 0),
  type text NOT NULL CHECK (type IN ('physical', 'achievement')),
  image_url text,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.points_catalog IS 'Belohnungen, die Spieler mit Punkten einlösen können.';
COMMENT ON COLUMN public.points_catalog.type IS 'physical = physische Belohnung (z.B. Würfelbecher), achievement = spezielles Achievement';
COMMENT ON COLUMN public.points_catalog.achievement_id IS 'Nur bei type=achievement: welches Achievement wird vergeben.';

-- catalog_item_id zu points_log hinzufügen (für Einlösungen)
ALTER TABLE public.points_log
ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES public.points_catalog(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.points_log.catalog_item_id IS 'Bei Punkte-Ausgabe: welche Belohnung wurde eingelöst.';

-- RLS
ALTER TABLE public.points_catalog ENABLE ROW LEVEL SECURITY;

-- Alle angemeldeten User können den Katalog lesen
CREATE POLICY "Punktekatalog lesbar für angemeldete User"
  ON public.points_catalog FOR SELECT TO authenticated USING (true);

-- Nur GMs/Admins können Einträge erstellen/bearbeiten
CREATE POLICY "Punktekatalog: GM kann erstellen"
  ON public.points_catalog FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.primary_role IN ('GameMaster', 'Admin')
    )
  );

CREATE POLICY "Punktekatalog: GM kann aktualisieren"
  ON public.points_catalog FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.primary_role IN ('GameMaster', 'Admin')
    )
  );

CREATE POLICY "Punktekatalog: GM kann löschen"
  ON public.points_catalog FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.primary_role IN ('GameMaster', 'Admin')
    )
  );
