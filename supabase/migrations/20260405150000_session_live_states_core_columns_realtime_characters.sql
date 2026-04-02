-- Fehlende Kern-Spalten auf session_live_states (Fix: PostgREST „current_location … not in schema cache“,
-- leere Live-Zeilen, Hintergrund-Insert schlägt fehl).
-- Realtime: Spieler sehen Ort/Zeit/Wetter/NPC-Updates des GMs.
-- characters: Party-Tray — verschachtelter characters()-Join braucht Leserecht für Mitspieler.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Kern-Spalten (nur anlegen, falls ältere DB sie nie bekam)
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS current_location text,
  ADD COLUMN IF NOT EXISTS current_time text,
  ADD COLUMN IF NOT EXISTS weather text,
  ADD COLUMN IF NOT EXISTS journal_text text,
  ADD COLUMN IF NOT EXISTS visible_npc_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS visible_faction_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS scribe_id uuid;

COMMENT ON COLUMN public.session_live_states.current_location IS 'Freitext-Ort / Anzeigename';
COMMENT ON COLUMN public.session_live_states.current_time IS 'In-Game-Zeit (Freitext)';
COMMENT ON COLUMN public.session_live_states.weather IS 'Wetter (Freitext oder Anzeige)';

-- Realtime (Supabase): Tabelle zur Publikation hinzufügen, falls noch nicht drin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_rel pr
      JOIN pg_class c ON c.oid = pr.prrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
        AND n.nspname = 'public'
        AND c.relname = 'session_live_states'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_live_states;
    END IF;
  END IF;
END $$;

-- Sinnvolle Replica-Identität für UPDATE-Payloads (Realtime)
ALTER TABLE public.session_live_states REPLICA IDENTITY FULL;

-- session_rsvps: GM wie in App (gm_id ODER owner_id)
DROP POLICY IF EXISTS "GM can view and update rsvps for own campaigns" ON public.session_rsvps;
CREATE POLICY "GM can view and update rsvps for own campaigns"
  ON public.session_rsvps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_rsvps.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_rsvps.session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

-- characters: Mitglieder derselben Kampagne dürfen Charaktere für Party/Session lesen
DROP POLICY IF EXISTS "Campaign peers select characters same campaign" ON public.characters;
CREATE POLICY "Campaign peers select characters same campaign"
  ON public.characters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_members cm
      WHERE cm.campaign_id = characters.campaign_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = characters.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
