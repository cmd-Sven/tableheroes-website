-- Truhe: geschlossen bis SL öffnet; NPCs auf Bühne ausblenden bis Truhe geöffnet / Beute beendet.

ALTER TABLE public.campaign_loot_containers
  ADD COLUMN IF NOT EXISTS chest_opened boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaign_loot_containers.chest_opened IS
  'SL: Truhe auf der Bühne geöffnet — dann Item-Karten & Gold sichtbar.';

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS loot_hide_npcs boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.session_live_states.loot_hide_npcs IS
  'True: NPC-Karten auf Live-Bühne ausblenden (z. B. geschlossene Beute-Truhe).';

CREATE OR REPLACE FUNCTION public.th_campaign_loot_clear_session_pointer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_len integer;
BEGIN
  IF NEW.items_json IS NULL OR jsonb_typeof(NEW.items_json) <> 'array' THEN
    RETURN NEW;
  END IF;

  item_len := jsonb_array_length(COALESCE(NEW.items_json, '[]'::jsonb));

  IF COALESCE(NEW.gp_remaining, 0) = 0
     AND COALESCE(NEW.sp_remaining, 0) = 0
     AND item_len = 0 THEN
    UPDATE public.session_live_states s
    SET
      current_loot_id = NULL,
      loot_hide_npcs = false
    WHERE s.current_loot_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
