-- Session chronicle & audio transcription (Phase 0 schema).
-- Audio files land in Storage bucket "session-audio-chunks" (create in Supabase dashboard if missing).

-- Vorbereitung: bevorzugter Aufnahmemodus (Tisch / Jitsi)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS transcription_mode text
    CHECK (transcription_mode IS NULL OR transcription_mode IN ('table', 'jitsi'));

COMMENT ON COLUMN public.sessions.transcription_mode IS
  'Geplanter Chronist-Modus: table = Mikrofon am Tisch, jitsi = Online-Runde.';

-- Laufende Aufnahme-Session pro Live-Session
CREATE TABLE IF NOT EXISTS public.session_transcription_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('table', 'jitsi')),
  status text NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'recording', 'paused', 'stopped')),
  jitsi_room_url text NOT NULL DEFAULT 'https://meet.osna.social/tableheroes',
  recording_notice_acknowledged_at timestamptz,
  started_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_transcription_sessions_session_unique UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_transcription_sessions_campaign
  ON public.session_transcription_sessions (campaign_id, created_at DESC);

-- 10-Minuten-Chunks (+ Overlap-Metadaten)
CREATE TABLE IF NOT EXISTS public.session_transcription_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_session_id uuid NOT NULL
    REFERENCES public.session_transcription_sessions(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  storage_path text,
  duration_ms integer,
  overlap_ms integer NOT NULL DEFAULT 5000,
  transcript_text text,
  whisper_status text NOT NULL DEFAULT 'pending'
    CHECK (whisper_status IN ('pending', 'processing', 'done', 'failed')),
  summarize_status text NOT NULL DEFAULT 'pending'
    CHECK (summarize_status IN ('pending', 'processing', 'done', 'failed')),
  live_markers jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  summarized_at timestamptz,
  CONSTRAINT session_transcription_chunks_index_unique
    UNIQUE (transcription_session_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_session_transcription_chunks_session
  ON public.session_transcription_chunks (transcription_session_id, chunk_index);

-- Laufender KI-Zustand während der Session
CREATE TABLE IF NOT EXISTS public.session_chronicle_state (
  session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  story_recap text,
  discovered_loot jsonb NOT NULL DEFAULT '[]'::jsonb,
  spontaneous_npcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  spontaneous_locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  spontaneous_quests jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_chunk_index integer NOT NULL DEFAULT -1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_chronicle_state_campaign
  ON public.session_chronicle_state (campaign_id);

-- Spieler-taugliche Zusammenfassung im Archiv (nach Session-Ende)
ALTER TABLE public.session_archives
  ADD COLUMN IF NOT EXISTS player_recap jsonb;

COMMENT ON COLUMN public.session_archives.player_recap IS
  'Finale Spieler-Chronik mit verlinkbaren Entitäten (NPC, Ort, Fraktion, Quests, Loot).';

-- RLS
ALTER TABLE public.session_transcription_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcription_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_chronicle_state ENABLE ROW LEVEL SECURITY;

-- Helper: GM/Owner einer Kampagne
-- (Policies folgen session_archives-Muster)

DROP POLICY IF EXISTS "session_transcription_sessions_select_campaign"
  ON public.session_transcription_sessions;
CREATE POLICY "session_transcription_sessions_select_campaign"
  ON public.session_transcription_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active')
      WHERE c.id = session_transcription_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid() OR cm.user_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "session_transcription_sessions_write_gm"
  ON public.session_transcription_sessions;
CREATE POLICY "session_transcription_sessions_write_gm"
  ON public.session_transcription_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = session_transcription_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = session_transcription_sessions.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_transcription_chunks_select_campaign"
  ON public.session_transcription_chunks;
CREATE POLICY "session_transcription_chunks_select_campaign"
  ON public.session_transcription_chunks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_transcription_sessions sts
      JOIN public.campaigns c ON c.id = sts.campaign_id
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active')
      WHERE sts.id = session_transcription_chunks.transcription_session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid() OR cm.user_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "session_transcription_chunks_write_gm"
  ON public.session_transcription_chunks;
CREATE POLICY "session_transcription_chunks_write_gm"
  ON public.session_transcription_chunks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_transcription_sessions sts
      JOIN public.campaigns c ON c.id = sts.campaign_id
      WHERE sts.id = session_transcription_chunks.transcription_session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_transcription_sessions sts
      JOIN public.campaigns c ON c.id = sts.campaign_id
      WHERE sts.id = session_transcription_chunks.transcription_session_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "session_chronicle_state_select_campaign"
  ON public.session_chronicle_state;
CREATE POLICY "session_chronicle_state_select_campaign"
  ON public.session_chronicle_state FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      LEFT JOIN public.campaign_members cm
        ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
        AND cm.status IN ('Approved', 'Active')
      WHERE c.id = session_chronicle_state.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid() OR cm.user_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "session_chronicle_state_write_gm"
  ON public.session_chronicle_state;
CREATE POLICY "session_chronicle_state_write_gm"
  ON public.session_chronicle_state FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = session_chronicle_state.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = session_chronicle_state.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );
