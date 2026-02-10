-- Achievements: description, is_custom (GM-erstellte), INSERT für authentifizierte User
-- In Supabase SQL Editor ausführen.

ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.achievements.description IS 'Was man tun muss, um das Achievement zu erhalten.';
COMMENT ON COLUMN public.achievements.is_custom IS 'TRUE wenn vom GM über die Achievement-Verwaltung erstellt (Bilder unter /images/achievement/).';

-- GM bzw. authentifizierte User dürfen Achievements anlegen (für GM Achievement Creator)
CREATE POLICY "Achievements: INSERT für authentifizierte User"
  ON public.achievements FOR INSERT TO authenticated WITH CHECK (true);
