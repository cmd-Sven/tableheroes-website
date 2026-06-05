-- handle_new_user() still referenced public.ranks and users.rank_id / current_level
-- after 20260427122700_refactor_ranks_and_lifetime_points.sql removed them.
-- That caused auth sign-up to fail with "Database error saving new user".

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen_name text;
BEGIN
  chosen_name := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (
    id,
    email,
    username,
    display_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    chosen_name,
    chosen_name
  );

  RETURN NEW;
END;
$$;
