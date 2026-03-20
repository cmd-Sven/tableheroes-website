-- Session RSVPs und Einstellungen für Terminbestätigung
-- rsvp_status: Zusage, Absage, Via Online (bei Live-Sessions nur 1 Platz)
-- rsvp_deadline_days: 1, 2 oder 3 Tage vor Session
-- is_live: true = Live vor Ort, nur 1 "Via Online" Platz

-- 1. Neue Spalten in sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS rsvp_deadline_days smallint DEFAULT 2
    CHECK (rsvp_deadline_days IS NULL OR rsvp_deadline_days IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT true;

COMMENT ON COLUMN sessions.rsvp_deadline_days IS 'Anmeldefrist in Tagen vor Session (1, 2 oder 3). NULL = keine Frist.';
COMMENT ON COLUMN sessions.is_live IS 'true = Live vor Ort (nur 1 Via-Online-Platz). false = reine Online-Session.';

-- 2. Tabelle session_rsvps
CREATE TABLE IF NOT EXISTS session_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsvp_status text NOT NULL CHECK (rsvp_status IN ('Zusage', 'Absage', 'Via Online')),
  gm_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_rsvps_session_id ON session_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_session_rsvps_user_id ON session_rsvps(user_id);

COMMENT ON TABLE session_rsvps IS 'Spieler-RSVPs für Sessions: Zusage, Absage, Via Online. gm_confirmed = manuell vom GM bestätigt.';

-- RLS
ALTER TABLE session_rsvps ENABLE ROW LEVEL SECURITY;

-- Spieler: eigene RSVPs lesen/schreiben
CREATE POLICY "Users can manage own session rsvps"
  ON session_rsvps
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- GM: alle RSVPs seiner Kampagnen lesen und gm_confirmed setzen
CREATE POLICY "GM can view and update rsvps for own campaigns"
  ON session_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_rsvps.session_id AND c.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_rsvps.session_id AND c.gm_id = auth.uid()
    )
  );
