-- Discord-Webhook-Integration (kostenlose Discord-Version: Kanal-Webhooks)

CREATE TABLE IF NOT EXISTS public.campaign_discord_integrations (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  webhook_url text,
  notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.campaign_discord_integrations IS
  'Pro Kampagne ein Discord-Kanal-Webhook für Spieler-Benachrichtigungen (Reveals, Recaps, …).';

ALTER TABLE public.campaign_discord_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GM can manage campaign discord integration"
  ON public.campaign_discord_integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_discord_integrations.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_discord_integrations.campaign_id
        AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
    )
  );

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_settings IS
  'Plattformweite Einstellungen (z. B. Discord-News-Webhook). Nur über Service Role / Server Actions.';

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
-- Keine Policies: nur Service Role (Admin-Client) hat Zugriff.
