-- Refactor player progression:
-- total_points bleibt ausgebbares Guthaben, lifetime_points wird die Rang-/Level-Basis.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS lifetime_points integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.lifetime_points IS
  'Lebenslang verdiente positive Punkte. Basis fuer Level und globale Rang-Fallbacks; wird durch Ausgaben nicht reduziert.';

UPDATE public.users
SET lifetime_points = COALESCE(
  (
    SELECT SUM(pl.amount)
    FROM public.points_log pl
    WHERE pl.user_id = public.users.id
      AND pl.amount > 0
  ),
  0
);

ALTER TABLE public.campaign_members
  ADD COLUMN IF NOT EXISTS campaign_rank text;

COMMENT ON COLUMN public.campaign_members.campaign_rank IS
  'Kampagnenspezifischer, vom GM gesetzter Titel/Rang des Mitglieds.';

UPDATE public.campaign_members cm
SET campaign_rank = u.current_rank
FROM public.users u
WHERE cm.user_id = u.id
  AND u.current_rank IS NOT NULL
  AND length(trim(u.current_rank)) > 0
  AND cm.status IN ('Approved', 'Active');

CREATE OR REPLACE FUNCTION public.award_points_safe(
  target_user_id uuid,
  points_amount integer,
  award_reason text,
  awarded_by uuid DEFAULT NULL,
  related_campaign_id uuid DEFAULT NULL,
  catalog_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id must not be null';
  END IF;

  IF points_amount IS NULL OR points_amount = 0 THEN
    RAISE EXCEPTION 'points_amount must be a non-zero integer';
  END IF;

  IF award_reason IS NULL OR length(trim(award_reason)) = 0 THEN
    RAISE EXCEPTION 'award_reason must not be empty';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
  ) THEN
    RAISE EXCEPTION 'target user not found';
  END IF;

  IF points_amount < 0 AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND COALESCE(u.total_points, 0) + points_amount < 0
  ) THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  INSERT INTO public.points_log (
    user_id,
    amount,
    reason,
    created_by,
    campaign_id,
    catalog_item_id
  )
  VALUES (
    target_user_id,
    points_amount,
    trim(award_reason),
    awarded_by,
    related_campaign_id,
    catalog_id
  );

  UPDATE public.users
  SET
    total_points = COALESCE(total_points, 0) + points_amount,
    lifetime_points = COALESCE(lifetime_points, 0) + GREATEST(points_amount, 0)
  WHERE id = target_user_id
  RETURNING total_points INTO new_total;

  RETURN new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.award_points_safe(uuid, integer, text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_points_safe(uuid, integer, text, uuid, uuid, uuid) TO service_role;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS current_rank,
  DROP COLUMN IF EXISTS current_level,
  DROP COLUMN IF EXISTS rank_id;

DROP TABLE IF EXISTS public.ranks;
