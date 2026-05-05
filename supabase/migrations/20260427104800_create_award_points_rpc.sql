-- Atomare Punktevergabe/-abbuchung inkl. Historie.
-- Verhindert Race Conditions zwischen public.users.total_points und public.points_log.

ALTER TABLE public.points_log
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES public.points_catalog(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.points_log.catalog_item_id IS
  'Bei Punkte-Ausgabe: welche Belohnung aus dem Punktekatalog eingelöst wurde.';

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
  SET total_points = COALESCE(total_points, 0) + points_amount
  WHERE id = target_user_id
  RETURNING total_points INTO new_total;

  RETURN new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.award_points_safe(uuid, integer, text, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_points_safe(uuid, integer, text, uuid, uuid, uuid) TO service_role;
