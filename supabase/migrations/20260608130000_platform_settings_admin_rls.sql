-- Admins dürfen Plattform-Einstellungen (z. B. Discord-News-Webhook) per Session lesen/schreiben,
-- ohne zwingend den Service-Role-Key in der Hosting-Umgebung.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.primary_role = 'Admin' OR COALESCE(u.is_super_admin, false) = true)
    )
  );

DROP POLICY IF EXISTS "Admins can upsert platform settings" ON public.platform_settings;
CREATE POLICY "Admins can upsert platform settings"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.primary_role = 'Admin' OR COALESCE(u.is_super_admin, false) = true)
    )
  );

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.primary_role = 'Admin' OR COALESCE(u.is_super_admin, false) = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.primary_role = 'Admin' OR COALESCE(u.is_super_admin, false) = true)
    )
  );
