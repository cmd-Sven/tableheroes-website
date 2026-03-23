-- session_live_states.journal_text fehlt – wird von endSession und LiveSessionBoard genutzt
ALTER TABLE session_live_states
  ADD COLUMN IF NOT EXISTS journal_text TEXT;

COMMENT ON COLUMN session_live_states.journal_text IS 'Session-Journal/Notizen für Logbuch-Eintrag beim Beenden';
