-- Weltkarten: persistente Maps an Welten, Marker, Spieler-Notizen, Session-Link, Force-View.
-- Remote erst nach explizitem User-OK anwenden (supabase db push / SQL Editor).

-- ---------------------------------------------------------------------------
-- world_maps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  image_storage_path text,
  grid_config jsonb NOT NULL DEFAULT '{
    "cellSizePx": 50,
    "originX": 0,
    "originY": 0,
    "columns": 24,
    "rows": 16,
    "showGrid": true
  }'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  -- Ein Gruppentoken pro Karte (ganze Gruppe)
  group_token_grid_x integer,
  group_token_grid_y integer,
  group_token_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_maps_world_sort
  ON public.world_maps (world_id, sort_order, created_at);

COMMENT ON TABLE public.world_maps IS
  'Persistente Weltkarten (GM plant vorab; sessionübergreifend).';

-- ---------------------------------------------------------------------------
-- world_map_markers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_map_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_map_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  icon text NOT NULL DEFAULT 'marker',
  name text NOT NULL,
  description text,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  is_visible_to_players boolean NOT NULL DEFAULT false,
  lore_id uuid REFERENCES public.world_lore(id) ON DELETE SET NULL,
  npc_id uuid REFERENCES public.npcs(id) ON DELETE SET NULL,
  faction_id uuid REFERENCES public.factions(id) ON DELETE SET NULL,
  creature_id uuid REFERENCES public.bestarium_creatures(id) ON DELETE SET NULL,
  quest_id uuid REFERENCES public.quests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT world_map_markers_icon_check CHECK (
    icon IN (
      'book', 'coins', 'castle', 'house', 'campfire', 'barrel',
      'utensils', 'dragon', 'mountain', 'ship', 'anchor', 'tower',
      'sword', 'gem', 'cave', 'path', 'marker'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_world_map_markers_map
  ON public.world_map_markers (world_map_id);

CREATE INDEX IF NOT EXISTS idx_world_map_markers_visible
  ON public.world_map_markers (world_map_id, is_visible_to_players);

COMMENT ON TABLE public.world_map_markers IS
  'POI/Ort-Markierungen auf Weltkarten (Icon, Links, Visibility).';

-- ---------------------------------------------------------------------------
-- world_map_marker_notes (für alle Mitglieder sichtbar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.world_map_marker_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_id uuid NOT NULL REFERENCES public.world_map_markers(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_map_marker_notes_marker
  ON public.world_map_marker_notes (marker_id, created_at DESC);

COMMENT ON TABLE public.world_map_marker_notes IS
  'Spieler-/Mitglieds-Notizen an Weltkarten-Markierungen (für alle sichtbar).';

-- ---------------------------------------------------------------------------
-- session_world_maps (Session-Vorbereitung: Karten anhängen)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_world_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  world_map_id uuid NOT NULL REFERENCES public.world_maps(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, world_map_id)
);

CREATE INDEX IF NOT EXISTS idx_session_world_maps_session
  ON public.session_world_maps (session_id, sort_order);

COMMENT ON TABLE public.session_world_maps IS
  'Weltkarten, die einer Session für Live-Force-View zugeordnet sind.';

-- ---------------------------------------------------------------------------
-- Live: Spieler auf Kartenansicht schieben
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS active_world_map_id uuid
    REFERENCES public.world_maps(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.session_live_states.active_world_map_id IS
  'Aktive Weltkarte — GM schiebt alle Spieler auf die Kartenansicht.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_world_gm(p_world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.worlds w
    WHERE w.id = p_world_id AND w.gm_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_world_maps(p_world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_is_world_gm(p_world_id)
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      WHERE c.world_id = p_world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed', 'Accepted')
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.world_id = p_world_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS: world_maps
-- ---------------------------------------------------------------------------
ALTER TABLE public.world_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_maps_select_access" ON public.world_maps;
DROP POLICY IF EXISTS "world_maps_insert_gm" ON public.world_maps;
DROP POLICY IF EXISTS "world_maps_update_gm" ON public.world_maps;
DROP POLICY IF EXISTS "world_maps_delete_gm" ON public.world_maps;

CREATE POLICY "world_maps_select_access"
  ON public.world_maps FOR SELECT TO authenticated
  USING (public.user_can_access_world_maps(world_id));

CREATE POLICY "world_maps_insert_gm"
  ON public.world_maps FOR INSERT TO authenticated
  WITH CHECK (public.user_is_world_gm(world_id));

CREATE POLICY "world_maps_update_gm"
  ON public.world_maps FOR UPDATE TO authenticated
  USING (public.user_is_world_gm(world_id))
  WITH CHECK (public.user_is_world_gm(world_id));

CREATE POLICY "world_maps_delete_gm"
  ON public.world_maps FOR DELETE TO authenticated
  USING (public.user_is_world_gm(world_id));

-- ---------------------------------------------------------------------------
-- RLS: world_map_markers (hidden nur GM)
-- ---------------------------------------------------------------------------
ALTER TABLE public.world_map_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_map_markers_select" ON public.world_map_markers;
DROP POLICY IF EXISTS "world_map_markers_insert_gm" ON public.world_map_markers;
DROP POLICY IF EXISTS "world_map_markers_update_gm" ON public.world_map_markers;
DROP POLICY IF EXISTS "world_map_markers_delete_gm" ON public.world_map_markers;

CREATE POLICY "world_map_markers_select"
  ON public.world_map_markers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.world_maps m
      WHERE m.id = world_map_markers.world_map_id
        AND public.user_can_access_world_maps(m.world_id)
        AND (
          world_map_markers.is_visible_to_players = true
          OR public.user_is_world_gm(m.world_id)
        )
    )
  );

CREATE POLICY "world_map_markers_insert_gm"
  ON public.world_map_markers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.world_maps m
      WHERE m.id = world_map_markers.world_map_id
        AND public.user_is_world_gm(m.world_id)
    )
  );

CREATE POLICY "world_map_markers_update_gm"
  ON public.world_map_markers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.world_maps m
      WHERE m.id = world_map_markers.world_map_id
        AND public.user_is_world_gm(m.world_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.world_maps m
      WHERE m.id = world_map_markers.world_map_id
        AND public.user_is_world_gm(m.world_id)
    )
  );

CREATE POLICY "world_map_markers_delete_gm"
  ON public.world_map_markers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.world_maps m
      WHERE m.id = world_map_markers.world_map_id
        AND public.user_is_world_gm(m.world_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: notes — read all members, insert members, update/delete author|GM
-- ---------------------------------------------------------------------------
ALTER TABLE public.world_map_marker_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_map_marker_notes_select" ON public.world_map_marker_notes;
DROP POLICY IF EXISTS "world_map_marker_notes_insert" ON public.world_map_marker_notes;
DROP POLICY IF EXISTS "world_map_marker_notes_update" ON public.world_map_marker_notes;
DROP POLICY IF EXISTS "world_map_marker_notes_delete" ON public.world_map_marker_notes;

CREATE POLICY "world_map_marker_notes_select"
  ON public.world_map_marker_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.world_map_markers mk
      JOIN public.world_maps m ON m.id = mk.world_map_id
      WHERE mk.id = world_map_marker_notes.marker_id
        AND public.user_can_access_world_maps(m.world_id)
        -- Note nur sichtbar wenn Marker sichtbar ODER User GM
        AND (
          mk.is_visible_to_players = true
          OR public.user_is_world_gm(m.world_id)
        )
    )
  );

CREATE POLICY "world_map_marker_notes_insert"
  ON public.world_map_marker_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.world_map_markers mk
      JOIN public.world_maps m ON m.id = mk.world_map_id
      WHERE mk.id = world_map_marker_notes.marker_id
        AND public.user_can_access_world_maps(m.world_id)
        AND (
          mk.is_visible_to_players = true
          OR public.user_is_world_gm(m.world_id)
        )
    )
  );

CREATE POLICY "world_map_marker_notes_update"
  ON public.world_map_marker_notes FOR UPDATE TO authenticated
  USING (
    author_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_map_markers mk
      JOIN public.world_maps m ON m.id = mk.world_map_id
      WHERE mk.id = world_map_marker_notes.marker_id
        AND public.user_is_world_gm(m.world_id)
    )
  )
  WITH CHECK (
    author_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_map_markers mk
      JOIN public.world_maps m ON m.id = mk.world_map_id
      WHERE mk.id = world_map_marker_notes.marker_id
        AND public.user_is_world_gm(m.world_id)
    )
  );

CREATE POLICY "world_map_marker_notes_delete"
  ON public.world_map_marker_notes FOR DELETE TO authenticated
  USING (
    author_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_map_markers mk
      JOIN public.world_maps m ON m.id = mk.world_map_id
      WHERE mk.id = world_map_marker_notes.marker_id
        AND public.user_is_world_gm(m.world_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: session_world_maps
-- ---------------------------------------------------------------------------
ALTER TABLE public.session_world_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_world_maps_select" ON public.session_world_maps;
DROP POLICY IF EXISTS "session_world_maps_insert_gm" ON public.session_world_maps;
DROP POLICY IF EXISTS "session_world_maps_update_gm" ON public.session_world_maps;
DROP POLICY IF EXISTS "session_world_maps_delete_gm" ON public.session_world_maps;

CREATE POLICY "session_world_maps_select"
  ON public.session_world_maps FOR SELECT TO authenticated
  USING (public.user_can_access_session(session_id));

CREATE POLICY "session_world_maps_insert_gm"
  ON public.session_world_maps FOR INSERT TO authenticated
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_world_maps_update_gm"
  ON public.session_world_maps FOR UPDATE TO authenticated
  USING (public.user_is_session_gm(session_id))
  WITH CHECK (public.user_is_session_gm(session_id));

CREATE POLICY "session_world_maps_delete_gm"
  ON public.session_world_maps FOR DELETE TO authenticated
  USING (public.user_is_session_gm(session_id));
