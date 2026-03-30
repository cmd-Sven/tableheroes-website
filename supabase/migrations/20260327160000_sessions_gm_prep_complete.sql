-- GM muss die Session-Planung abschließen, bevor ein Termin gestartet werden darf.
-- Bestehende Termine gelten nach Migration als bereits geplant (true).

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS gm_prep_complete boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN sessions.gm_prep_complete IS 'false = Start gesperrt bis GM „Planung abschließt“. Neu angelegte Termine beginnen mit false.';

UPDATE sessions SET gm_prep_complete = true;
