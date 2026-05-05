-- Session archive logbook snapshots and reverse NPC encounter links.

CREATE TABLE IF NOT EXISTS public.session_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  session_name text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  chronicle_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  encountered_npcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  visited_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT session_archives_session_unique UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_archives_campaign_archived
  ON public.session_archives (campaign_id, archived_at DESC);

ALTER TABLE public.session_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_archives_select_campaign_access"
  ON public.session_archives;
DROP POLICY IF EXISTS "session_archives_insert_gm_owner"
  ON public.session_archives;
DROP POLICY IF EXISTS "session_archives_update_gm_owner"
  ON public.session_archives;
DROP POLICY IF EXISTS "session_archives_delete_gm_owner"
  ON public.session_archives;

CREATE POLICY "session_archives_select_campaign_access"
  ON public.session_archives
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id
       AND cm.user_id = auth.uid()
       AND cm.status IN ('Approved', 'Active')
      WHERE c.id = session_archives.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid() OR cm.user_id IS NOT NULL)
    )
  );

CREATE POLICY "session_archives_insert_gm_owner"
  ON public.session_archives
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = session_archives.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "session_archives_update_gm_owner"
  ON public.session_archives
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = session_archives.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = session_archives.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE POLICY "session_archives_delete_gm_owner"
  ON public.session_archives
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = session_archives.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

ALTER TABLE public.campaign_npc_reputation
  ADD COLUMN IF NOT EXISTS last_seen_session_id uuid REFERENCES public.session_archives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seen_location_id uuid REFERENCES public.world_lore(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaign_npc_reputation_last_seen_session
  ON public.campaign_npc_reputation (last_seen_session_id);

CREATE INDEX IF NOT EXISTS idx_campaign_npc_reputation_last_seen_location
  ON public.campaign_npc_reputation (last_seen_location_id);

COMMENT ON TABLE public.session_archives IS
  'Snapshot-Archiv abgeschlossener Live-Sessions mit Chronik, Begegnungen und besuchten Orten.';

COMMENT ON COLUMN public.campaign_npc_reputation.last_seen_session_id IS
  'Archivierte Session, in der dieser NPC zuletzt in dieser Kampagne auf der Bühne war.';

COMMENT ON COLUMN public.campaign_npc_reputation.last_seen_location_id IS
  'Lore-Ort, an dem dieser NPC zuletzt in dieser Kampagne gesehen wurde.';
