-- Wenn eine campaign_loot_containers-Zeile leer ist, Pointer in session_live_states leeren.
-- Spieler dürfen session_live_states nicht updaten (RLS) — Trigger läuft als SECURITY DEFINER.

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
    SET current_loot_id = NULL
    WHERE s.current_loot_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.th_campaign_loot_clear_session_pointer() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_loot_container_clear_session ON public.campaign_loot_containers;
CREATE TRIGGER trg_loot_container_clear_session
  AFTER UPDATE OF gp_remaining, sp_remaining, items_json ON public.campaign_loot_containers
  FOR EACH ROW
  EXECUTE FUNCTION public.th_campaign_loot_clear_session_pointer();
