-- Kampagnen-Mediathek: Szenenbilder (persistiert über Sessions hinweg)

CREATE TABLE IF NOT EXISTS public.campaign_scene_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  image_storage_path text,
  category text NOT NULL DEFAULT 'Sonstiges',
  gm_notes text,
  player_notes text,
  image_is_ai_generated boolean NOT NULL DEFAULT false,
  image_upload_rights_confirmed boolean,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_scene_media_campaign_sort
  ON public.campaign_scene_media (campaign_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_scene_media_campaign_category
  ON public.campaign_scene_media (campaign_id, category);

COMMENT ON TABLE public.campaign_scene_media IS
  'Kampagnenweite Szenenbilder für die Live-Bühne (Mediathek, über Sessions hinweg).';

-- Protokoll: wann welches Szenenbild auf der Bühne war (inkl. NPCs auf der Bühne)
CREATE TABLE IF NOT EXISTS public.scene_media_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  scene_media_id uuid NOT NULL REFERENCES public.campaign_scene_media(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  archive_id uuid REFERENCES public.session_archives(id) ON DELETE SET NULL,
  npc_ids uuid[] NOT NULL DEFAULT '{}',
  shown_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_media_appearances_scene
  ON public.scene_media_appearances (scene_media_id, shown_at DESC);

CREATE INDEX IF NOT EXISTS idx_scene_media_appearances_npc_gin
  ON public.scene_media_appearances USING gin (npc_ids);

CREATE INDEX IF NOT EXISTS idx_scene_media_appearances_session
  ON public.scene_media_appearances (session_id, shown_at DESC);

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS stage_deck_scene_media_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.sessions.stage_deck_scene_media_ids IS
  'NULL = alle Szenenbilder der Kampagne im Deck; sonst nur diese IDs.';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS active_scene_media_id uuid REFERENCES public.campaign_scene_media(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.session_live_states.active_scene_media_id IS
  'Aktuell auf der Bühne gezeigtes Szenenbild (Mediathek).';

ALTER TABLE public.session_archives
  ADD COLUMN IF NOT EXISTS scene_gallery jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.session_archives.scene_gallery IS
  'Szenenbilder dieser Session: [{id,title,image_url,category,npc_ids,shown_at}]';

-- RLS: campaign_scene_media
ALTER TABLE public.campaign_scene_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_scene_media_select_campaign_access" ON public.campaign_scene_media;
DROP POLICY IF EXISTS "campaign_scene_media_insert_gm" ON public.campaign_scene_media;
DROP POLICY IF EXISTS "campaign_scene_media_update_gm" ON public.campaign_scene_media;
DROP POLICY IF EXISTS "campaign_scene_media_delete_gm" ON public.campaign_scene_media;

CREATE POLICY "campaign_scene_media_select_campaign_access"
  ON public.campaign_scene_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_scene_media.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id
              AND cm.user_id = auth.uid()
              AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
          )
        )
    )
  );

CREATE POLICY "campaign_scene_media_insert_gm"
  ON public.campaign_scene_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_scene_media.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "campaign_scene_media_update_gm"
  ON public.campaign_scene_media
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_scene_media.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_scene_media.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "campaign_scene_media_delete_gm"
  ON public.campaign_scene_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_scene_media.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- RLS: scene_media_appearances
ALTER TABLE public.scene_media_appearances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scene_media_appearances_select_campaign" ON public.scene_media_appearances;
DROP POLICY IF EXISTS "scene_media_appearances_insert_gm" ON public.scene_media_appearances;
DROP POLICY IF EXISTS "scene_media_appearances_update_gm" ON public.scene_media_appearances;

CREATE POLICY "scene_media_appearances_select_campaign"
  ON public.scene_media_appearances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scene_media_appearances.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR c.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id
              AND cm.user_id = auth.uid()
              AND cm.status IN ('Approved', 'Active')
          )
        )
    )
  );

CREATE POLICY "scene_media_appearances_insert_gm"
  ON public.scene_media_appearances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scene_media_appearances.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "scene_media_appearances_update_gm"
  ON public.scene_media_appearances
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scene_media_appearances.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = scene_media_appearances.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
