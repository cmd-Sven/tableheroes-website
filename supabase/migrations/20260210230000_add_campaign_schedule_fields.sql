-- Verwaiste Sessions aufräumen (Kampagne wurde gelöscht, Session blieb übrig)
DELETE FROM sessions s
WHERE NOT EXISTS (
  SELECT 1 FROM campaigns c WHERE c.id = s.campaign_id
);

-- Strukturierte Schedule-Felder für wiederkehrende Sessions
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS schedule_day smallint DEFAULT NULL
    CHECK (schedule_day >= 0 AND schedule_day <= 6),
  ADD COLUMN IF NOT EXISTS schedule_time time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_interval text DEFAULT NULL
    CHECK (schedule_interval IN ('weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS schedule_duration_hours smallint DEFAULT 4
    CHECK (schedule_duration_hours >= 1 AND schedule_duration_hours <= 12);

-- FK sessions → campaigns (fehlte bisher, verursachte Schema-Cache-Fehler)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name = 'sessions'
      AND constraint_name = 'sessions_campaign_id_fkey'
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
  END IF;
END $$;
