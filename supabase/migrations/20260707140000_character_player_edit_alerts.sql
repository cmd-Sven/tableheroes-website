-- Spieler-Änderungen an kampagnenverknüpften Charakteren: GM-Hinweis (ignorieren oder nachprüfen)

CREATE TABLE IF NOT EXISTS public.character_player_edit_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  player_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  edited_at timestamptz NOT NULL DEFAULT now(),
  edit_source text NOT NULL DEFAULT 'profile',
  edit_summary text,
  reviewed_at timestamptz,
  dismissed_at timestamptz,
  reviewed_by uuid REFERENCES public.users(id)
);

COMMENT ON TABLE public.character_player_edit_alerts IS
  'Offene Hinweise für den GM: Spieler hat einen kampagnenaktiven Charakter bearbeitet.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_character_player_edit_alerts_open
  ON public.character_player_edit_alerts (character_id)
  WHERE dismissed_at IS NULL AND reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_character_player_edit_alerts_campaign_open
  ON public.character_player_edit_alerts (campaign_id, edited_at DESC)
  WHERE dismissed_at IS NULL AND reviewed_at IS NULL;

ALTER TABLE public.character_player_edit_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS character_player_edit_alerts_gm_select ON public.character_player_edit_alerts;
CREATE POLICY character_player_edit_alerts_gm_select
  ON public.character_player_edit_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS character_player_edit_alerts_gm_update ON public.character_player_edit_alerts;
CREATE POLICY character_player_edit_alerts_gm_update
  ON public.character_player_edit_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS character_player_edit_alerts_player_insert ON public.character_player_edit_alerts;
CREATE POLICY character_player_edit_alerts_player_insert
  ON public.character_player_edit_alerts
  FOR INSERT
  WITH CHECK (player_user_id = auth.uid());

DROP POLICY IF EXISTS character_player_edit_alerts_player_update_own ON public.character_player_edit_alerts;
CREATE POLICY character_player_edit_alerts_player_update_own
  ON public.character_player_edit_alerts
  FOR UPDATE
  USING (player_user_id = auth.uid());
