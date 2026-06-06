-- Online-Anwesenheit für Teilnahme-Punkte + Idempotenz beim Session-Abschluss

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS online_present_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.session_live_states.online_present_user_ids IS
  'Spieler-Accounts, die während der Live-Session die Session-Seite geöffnet hatten (Realtime-Presence, serverseitig persistiert).';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS participation_rewards_settled_at timestamptz;

COMMENT ON COLUMN public.sessions.participation_rewards_settled_at IS
  'Zeitpunkt der automatischen Teilnahme-Punktevergabe beim Session-Ende (5 Pkt. pro anwesendem Spieler).';

NOTIFY pgrst, 'reload schema';
