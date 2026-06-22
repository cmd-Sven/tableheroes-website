-- Umfragen: Mehrfachauswahl, Freitext, bis zu 10 Optionen, mehrere Stimmen pro User

ALTER TABLE public.campaign_polls
  ADD COLUMN IF NOT EXISTS allow_multiple boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_free_text boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaign_polls.allow_multiple IS 'true = Spieler dürfen mehrere Optionen wählen.';
COMMENT ON COLUMN public.campaign_polls.allow_free_text IS 'true = optionales Freitextfeld für eigene Antwort.';

-- Mehrere Stimmen pro User (eine pro Option)
ALTER TABLE public.campaign_poll_votes
  DROP CONSTRAINT IF EXISTS campaign_poll_votes_poll_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_poll_votes_poll_user_option_unique
  ON public.campaign_poll_votes (poll_id, user_id, option_id);

-- Freitext-Antworten (eine pro Spieler pro Umfrage)
CREATE TABLE IF NOT EXISTS public.campaign_poll_text_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.campaign_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text text NOT NULL CHECK (char_length(trim(response_text)) >= 1 AND char_length(trim(response_text)) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_poll_text_responses_poll_id
  ON public.campaign_poll_text_responses(poll_id);

-- Punkte nur einmal pro Teilnahme
CREATE TABLE IF NOT EXISTS public.campaign_poll_participation (
  poll_id uuid NOT NULL REFERENCES public.campaign_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

ALTER TABLE public.campaign_poll_text_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_poll_participation ENABLE ROW LEVEL SECURITY;

-- Freitext: Spieler lesen alle Antworten veröffentlichter Umfragen ihrer Kampagne
CREATE POLICY "Players read text responses of published polls"
  ON public.campaign_poll_text_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_text_responses.poll_id
        AND p.status = 'published'
        AND public.th_is_active_campaign_player(p.campaign_id)
    )
  );

CREATE POLICY "Users insert own text response when poll open"
  ON public.campaign_poll_text_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.th_poll_is_open(poll_id)
    AND EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_text_responses.poll_id
        AND p.allow_free_text = true
        AND public.th_is_active_campaign_player(p.campaign_id)
    )
  );

CREATE POLICY "Users update own text response when poll open"
  ON public.campaign_poll_text_responses
  FOR UPDATE
  USING (auth.uid() = user_id AND public.th_poll_is_open(poll_id))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "GM manages poll text responses"
  ON public.campaign_poll_text_responses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_text_responses.poll_id
        AND public.th_can_manage_campaign(p.campaign_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_text_responses.poll_id
        AND public.th_can_manage_campaign(p.campaign_id)
    )
  );

-- Teilnahme (Punkte-Dedup)
CREATE POLICY "GM reads poll participation"
  ON public.campaign_poll_participation
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_participation.poll_id
        AND public.th_can_manage_campaign(p.campaign_id)
    )
  );

-- Spieler sehen Stimmen-Ergebnisse veröffentlichter Umfragen (Aggregat)
CREATE POLICY "Players read votes of published polls"
  ON public.campaign_poll_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_polls p
      WHERE p.id = campaign_poll_votes.poll_id
        AND p.status = 'published'
        AND public.th_is_active_campaign_player(p.campaign_id)
    )
  );
