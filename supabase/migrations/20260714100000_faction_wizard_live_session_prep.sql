-- ============================================================================
-- Fraktions-Wizard & Live-Session – Schema-Vorbereitung
-- ============================================================================
-- Idempotent: sicher mehrfach ausführbar (Supabase SQL Editor oder CLI).
-- Nach Ausführung: database.types.ts neu generieren (supabase gen types).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. factions – fehlende Spalten & Semantik (Heimatort vs. Hauptquartier)
-- ---------------------------------------------------------------------------

-- Heimatort / Ursprungsregion der Fraktion
COMMENT ON COLUMN public.factions.location_id IS
  'Heimatort oder regionale Verwurzelung der Fraktion (FK locations).';

ALTER TABLE public.factions
  ADD COLUMN IF NOT EXISTS hq_location_id uuid,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_display jsonb,
  ADD COLUMN IF NOT EXISTS image_is_ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_upload_rights_confirmed boolean,
  ADD COLUMN IF NOT EXISTS planned_members jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.factions.hq_location_id IS
  'Hauptquartier / Stützpunkt der Fraktion (FK locations).';
COMMENT ON COLUMN public.factions.banner_url IS
  'Optionales Banner/Hintergrundbild (z. B. öffentliche SEO-Seite).';
COMMENT ON COLUMN public.factions.image_url IS
  'Wappen, Symbol oder Kartenporträt der Fraktion (Bühnen- & Detailkarten).';
COMMENT ON COLUMN public.factions.image_display IS
  'Zuschnitt/Fokus für image_url: { fit, posX, posY, letterboxColor }.';
COMMENT ON COLUMN public.factions.image_is_ai_generated IS
  'true = Bild per KI erzeugt (Attribution/Pflicht-Hinweis).';
COMMENT ON COLUMN public.factions.image_upload_rights_confirmed IS
  'GM bestätigt Upload-Rechte am Wappen/Bild.';
COMMENT ON COLUMN public.factions.planned_members IS
  'Geplante Mitglieder: [{ "name": string, "role": string, "npc_id"?: uuid }].';

-- FK: Heimatort
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factions_location_id_fkey'
      AND conrelid = 'public.factions'::regclass
  ) THEN
    ALTER TABLE public.factions
      ADD CONSTRAINT factions_location_id_fkey
      FOREIGN KEY (location_id)
      REFERENCES public.locations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- FK: Hauptquartier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factions_hq_location_id_fkey'
      AND conrelid = 'public.factions'::regclass
  ) THEN
    ALTER TABLE public.factions
      ADD CONSTRAINT factions_hq_location_id_fkey
      FOREIGN KEY (hq_location_id)
      REFERENCES public.locations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_factions_location_id
  ON public.factions (location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_factions_hq_location_id
  ON public.factions (hq_location_id)
  WHERE hq_location_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. faction_relations – Diplomatie zwischen Fraktionen (kampagnenbezogen)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.faction_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  faction_id_1 uuid NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
  faction_id_2 uuid NOT NULL REFERENCES public.factions(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT faction_relations_no_self CHECK (faction_id_1 <> faction_id_2),
  CONSTRAINT faction_relations_type_check CHECK (
    relation_type IN (
      'Neutral',
      'Verbündet',
      'Freundlich',
      'Feindlich',
      'Im Krieg'
    )
  )
);

COMMENT ON TABLE public.faction_relations IS
  'Diplomatische Beziehung zwischen zwei Fraktionen innerhalb einer Kampagne.';
COMMENT ON COLUMN public.faction_relations.relation_type IS
  'Status aus Sicht von faction_id_1 gegenüber faction_id_2.';
COMMENT ON COLUMN public.faction_relations.description IS
  'Optionale GM-Notiz zur Beziehung (Hintergrund, letzte Ereignisse).';

-- Pro Kampagne nur eine Relation pro Fraktionspaar (unabhängig von Reihenfolge)
CREATE UNIQUE INDEX IF NOT EXISTS idx_faction_relations_unique_pair
  ON public.faction_relations (
    campaign_id,
    LEAST(faction_id_1, faction_id_2),
    GREATEST(faction_id_1, faction_id_2)
  );

CREATE INDEX IF NOT EXISTS idx_faction_relations_campaign
  ON public.faction_relations (campaign_id);

CREATE INDEX IF NOT EXISTS idx_faction_relations_faction_1
  ON public.faction_relations (faction_id_1);

CREATE INDEX IF NOT EXISTS idx_faction_relations_faction_2
  ON public.faction_relations (faction_id_2);

-- ---------------------------------------------------------------------------
-- 3. RLS: faction_relations
--    GM: voller Zugriff | Kampagnenmitglieder: nur Lesen
-- ---------------------------------------------------------------------------

ALTER TABLE public.faction_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faction_relations_select_gm_or_member" ON public.faction_relations;
CREATE POLICY "faction_relations_select_gm_or_member"
  ON public.faction_relations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = faction_relations.campaign_id
        AND c.gm_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.campaign_id = faction_relations.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );

DROP POLICY IF EXISTS "faction_relations_insert_gm" ON public.faction_relations;
CREATE POLICY "faction_relations_insert_gm"
  ON public.faction_relations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = faction_relations.campaign_id
        AND c.gm_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faction_relations_update_gm" ON public.faction_relations;
CREATE POLICY "faction_relations_update_gm"
  ON public.faction_relations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = faction_relations.campaign_id
        AND c.gm_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "faction_relations_delete_gm" ON public.faction_relations;
CREATE POLICY "faction_relations_delete_gm"
  ON public.faction_relations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = faction_relations.campaign_id
        AND c.gm_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Live-Session – Bühnen-Fraktionen (falls noch nicht migriert)
-- ---------------------------------------------------------------------------

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS stage_deck_npc_ids uuid[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_deck_faction_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.sessions.stage_deck_faction_ids IS
  'NULL = alle sichtbaren Fraktionen im Stage Manager; sonst nur diese IDs.';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS visible_faction_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.session_live_states.visible_faction_ids IS
  'Fraktionen aktuell auf der Bühne (Chronist/GM: aktive Fraktion sichtbar).';

-- ---------------------------------------------------------------------------
-- 5. Spieler-Notizen – entity_type „faction“ (bereits in Basis-Migration)
--    Nur zur Sicherheit: Check-Constraint erweitern falls Tabelle schon existiert
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'campaign_notes'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%entity_type%'
  LIMIT 1;

  IF constraint_name IS NOT NULL AND constraint_name <> 'campaign_notes_entity_type_check' THEN
    EXECUTE format('ALTER TABLE public.campaign_notes DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_entity_type_check;

ALTER TABLE public.campaign_notes
  ADD CONSTRAINT campaign_notes_entity_type_check
  CHECK (entity_type IN ('npc', 'faction', 'lore', 'location'));

-- ---------------------------------------------------------------------------
-- 6. NPC-Fraktionszuordnung – Index für Bühnen-Border-Logik (gleiche Fraktion)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_npcs_faction_id
  ON public.npcs (faction_id)
  WHERE faction_id IS NOT NULL;

-- ============================================================================
-- Ende – Kurz-Check (optional auskommentieren):
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'factions'
--   ORDER BY ordinal_position;
-- SELECT * FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'faction_relations';
-- ============================================================================
