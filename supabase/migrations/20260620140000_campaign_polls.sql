-- Kampagnen-Umfragen (Polls): GM erstellt, veröffentlicht; Spieler stimmen ab und erhalten Punkte.

CREATE TABLE IF NOT EXISTS public.campaign_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(trim(question)) >= 3),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  closes_at timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_at timestamptz,
  points_per_vote integer NOT NULL DEFAULT 10 CHECK (points_per_vote > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_polls_campaign_id ON public.campaign_polls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_polls_status_closes ON public.campaign_polls(status, closes_at);

COMMENT ON TABLE public.campaign_polls IS 'Kampagnen-Umfragen: draft → published → closed. closes_at = Ende der Abstimmung.';

CREATE TABLE IF NOT EXISTS public.campaign_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.campaign_polls(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(trim(label)) >= 1),
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_poll_options_poll_id ON public.campaign_poll_options(poll_id);

CREATE TABLE IF NOT EXISTS public.campaign_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.campaign_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.campaign_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_poll_votes_poll_id ON public.campaign_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_campaign_poll_votes_user_id ON public.campaign_poll_votes(user_id);

COMMENT ON TABLE public.campaign_poll_votes IS 'Eine Stimme pro Spieler pro Umfrage. Punkte werden serverseitig vergeben.';

-- Hilfsfunktion: aktives Kampagnenmitglied (Spieler)
CREATE OR REPLACE FUNCTION public.th_is_active_campaign_player(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_members cm
    WHERE cm.campaign_id = target_campaign_id
      AND cm.user_id = auth.uid()
      AND cm.status IN ('Approved', 'Active')
  );
$$;

-- Hilfsfunktion: veröffentlichte, noch offene Umfrage
CREATE OR REPLACE FUNCTION public.th_poll_is_open(target_poll_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_polls p
    WHERE p.id = target_poll_id
      AND p.status = 'published'
      AND p.closes_at > now()
  );
$$;

ALTER TABLE public.campaign_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_poll_votes ENABLE ROW LEVEL SECURITY;

-- campaign_polls
CREATE POLICY "GM manages campaign polls"
  ON public.campaign_polls
  FOR ALL
  USING (public.th_can_manage_campaign(campaign_id))
  WITH CHECK (public.th_can_manage_campaign(campaign_id));

CREATE POLICY "Players read published campaign polls"
  ON public.campaign_polls
  FOR SELECT
  USING (
    status = 'published'
    AND public.th_is_active_campaign_player(campaign_id)
  );

-- campaign_poll_options
CREATE POLICY "GM manages poll options"
  ON public.campaign_poll_options
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_options.poll_id
        AND public.th_can_manage_campaign(p.campaign_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_options.poll_id
        AND public.th_can_manage_campaign(p.campaign_id)
    )
  );

CREATE POLICY "Players read options of published polls"
  ON public.campaign_poll_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_options.poll_id
        AND p.status = 'published'
        AND public.th_is_active_campaign_player(p.campaign_id)
    )
  );

-- campaign_poll_votes
CREATE POLICY "Users insert own poll vote when poll open"
  ON public.campaign_poll_votes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.th_poll_is_open(poll_id)
    AND EXISTS (
      SELECT 1
      FROM public.campaign_polls p
      JOIN public.campaign_poll_options o ON o.poll_id = p.id
      WHERE p.id = campaign_poll_votes.poll_id
        AND o.id = campaign_poll_votes.option_id
        AND public.th_is_active_campaign_player(p.campaign_id)
    )
  );

CREATE POLICY "Users read own poll votes"
  ON public.campaign_poll_votes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "GM reads all votes for own campaigns"
  ON public.campaign_poll_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_polls p
      WHERE p.id = campaign_poll_votes.poll_id
        AND public.th_can_manage_campaign(p.campaign_id)
    )
  );
