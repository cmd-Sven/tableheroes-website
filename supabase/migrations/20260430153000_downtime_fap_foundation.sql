-- Downtime / travel + FAP (Freizeitaktionspunkte) foundation

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS downtime_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS downtime_type text NOT NULL DEFAULT 'travel',
  ADD COLUMN IF NOT EXISTS downtime_current_day integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS downtime_total_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fap_allocations jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS sleep_debt_fap integer NOT NULL DEFAULT 0;

ALTER TABLE public.campaign_shop_items
  ADD COLUMN IF NOT EXISTS target_fap integer NOT NULL DEFAULT 0;

ALTER TABLE public.character_items
  ADD COLUMN IF NOT EXISTS target_fap integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_fap integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.session_live_states.fap_allocations IS 'Per characterId: { status: planning|ready, allocations: [{ activity, fap, targetItemId? }] }';
COMMENT ON COLUMN public.campaign_shop_items.target_fap IS 'FAP total to complete studying this item; copied to character_items on purchase.';
COMMENT ON COLUMN public.character_items.target_fap IS 'FAP-Ziel fuer Langzeit-Studium (z. B. aus Shop-Artikel); 0 = kein FAP-Projekt.';
COMMENT ON COLUMN public.character_items.current_fap IS 'Progress toward target_fap from downtime allocations.';
