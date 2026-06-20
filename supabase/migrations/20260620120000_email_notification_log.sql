-- Protokoll für versendete E-Mail-Benachrichtigungen (Dedup).

CREATE TABLE IF NOT EXISTS public.email_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  reference_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_notification_log_unique UNIQUE (user_id, notification_type, reference_key)
);

CREATE INDEX IF NOT EXISTS idx_email_notification_log_user
  ON public.email_notification_log(user_id);

CREATE INDEX IF NOT EXISTS idx_email_notification_log_type_sent
  ON public.email_notification_log(notification_type, sent_at DESC);

COMMENT ON TABLE public.email_notification_log IS
  'Verhindert doppelte transaktionale E-Mails (RSVP, News, Nachrichten).';

ALTER TABLE public.email_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_notification_log_service_only ON public.email_notification_log;
CREATE POLICY email_notification_log_service_only
ON public.email_notification_log
FOR ALL
USING (false)
WITH CHECK (false);
