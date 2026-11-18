-- Datelose Spielersuche (Call to Adventure). Kein Termin, nur Warteliste.
-- Neue Accounts landen über handle_new_user, wenn die Registrierung das Flag setzt.

CREATE TABLE IF NOT EXISTS public.casting_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text NOT NULL,
  body text NOT NULL,
  min_players integer NOT NULL DEFAULT 3 CHECK (min_players > 0),
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.casting_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casting_id uuid NOT NULL REFERENCES public.casting_calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  date_sent boolean NOT NULL DEFAULT false,
  date_sent_at timestamptz,
  UNIQUE (casting_id, user_id)
);

INSERT INTO public.casting_calls (slug, title, subtitle, body, min_players, is_active)
VALUES (
  'call-to-adventure',
  'Call to Adventure: Spieler-Casting',
  'Find your next Adventure.',
  E'Du bist neu in DnD und Co und suchst eine gemütliche Anfängerrunde zum abendlichen Feierabend?\n\nDann melde dich bei Table-Heroes. Einfach registrieren und schon bist du vorab eingetragen.\n\nBei einer Mindestspielerzahl von 3 Leuten wird euch der nächste mögliche Termin mitgeteilt. Bis dahin steht ihr auf der Warteliste.',
  3,
  true
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.casting_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS casting_calls_public_read ON public.casting_calls;
CREATE POLICY casting_calls_public_read ON public.casting_calls
  FOR SELECT TO anon, authenticated
  USING (is_active);

DROP POLICY IF EXISTS casting_calls_admin_read ON public.casting_calls;
CREATE POLICY casting_calls_admin_read ON public.casting_calls
  FOR SELECT TO authenticated
  USING (public.th_is_admin_user());

DROP POLICY IF EXISTS casting_calls_admin_update ON public.casting_calls;
CREATE POLICY casting_calls_admin_update ON public.casting_calls
  FOR UPDATE TO authenticated
  USING (public.th_is_admin_user())
  WITH CHECK (public.th_is_admin_user());

DROP POLICY IF EXISTS casting_signups_select ON public.casting_signups;
CREATE POLICY casting_signups_select ON public.casting_signups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.th_is_admin_user());

DROP POLICY IF EXISTS casting_signups_insert_self ON public.casting_signups;
CREATE POLICY casting_signups_insert_self ON public.casting_signups
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.casting_calls c
      WHERE c.id = casting_id AND c.is_active
    )
  );

DROP POLICY IF EXISTS casting_signups_admin_update ON public.casting_signups;
CREATE POLICY casting_signups_admin_update ON public.casting_signups
  FOR UPDATE TO authenticated
  USING (public.th_is_admin_user())
  WITH CHECK (public.th_is_admin_user());

DROP POLICY IF EXISTS casting_signups_admin_delete ON public.casting_signups;
CREATE POLICY casting_signups_admin_delete ON public.casting_signups
  FOR DELETE TO authenticated
  USING (public.th_is_admin_user());

GRANT SELECT ON public.casting_calls TO anon, authenticated;
GRANT UPDATE ON public.casting_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.casting_signups TO authenticated;

CREATE OR REPLACE FUNCTION public.casting_signups_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.th_is_admin_user() THEN
    NEW.date_sent := false;
    NEW.date_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS casting_signups_guard ON public.casting_signups;
CREATE TRIGGER casting_signups_guard
  BEFORE INSERT ON public.casting_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.casting_signups_guard();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen_name text;
  casting_slug text;
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

  casting_slug := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'casting_call', '')), '');
  IF casting_slug IS NOT NULL THEN
    INSERT INTO public.casting_signups (casting_id, user_id)
    SELECT c.id, NEW.id
    FROM public.casting_calls c
    WHERE c.slug = casting_slug
      AND c.is_active = true
    ON CONFLICT (casting_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
