-- Profil-Design-Spalten für users (Header & Einstellungen)
-- In Supabase SQL Editor ausführen, falls die Spalten noch nicht existieren.
-- Spaltennamen: profile_achievement_mode, avatar_shape, profile_background_url,
-- selected_achievement_id, show_rank, show_points, slogan, show_slogan

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_shape text DEFAULT 'circle' CHECK (avatar_shape IN ('circle', 'square')),
  ADD COLUMN IF NOT EXISTS profile_background_url text,
  ADD COLUMN IF NOT EXISTS show_rank boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_points boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_achievement_mode text DEFAULT 'newest' CHECK (profile_achievement_mode IN ('newest', 'specific')),
  ADD COLUMN IF NOT EXISTS selected_achievement_id text,
  ADD COLUMN IF NOT EXISTS slogan text,
  ADD COLUMN IF NOT EXISTS show_slogan boolean DEFAULT false;

COMMENT ON COLUMN public.users.avatar_shape IS 'Avatar-Form: circle = rund, square = eckig';
COMMENT ON COLUMN public.users.profile_background_url IS 'Banner-URL für den Profil-Header';
COMMENT ON COLUMN public.users.show_rank IS 'Rang im Profil-Header anzeigen';
COMMENT ON COLUMN public.users.show_points IS 'Punkte im Profil-Header anzeigen';
COMMENT ON COLUMN public.users.profile_achievement_mode IS 'Achievement-Anzeige: newest oder specific';
COMMENT ON COLUMN public.users.selected_achievement_id IS 'Bei mode=specific: ID des angezeigten Achievements';
COMMENT ON COLUMN public.users.slogan IS 'Slogan/Zitat für den Header';
COMMENT ON COLUMN public.users.show_slogan IS 'Slogan im Profil anzeigen';
