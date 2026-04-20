-- Profil-Medien: Speicherpfade (Supabase Storage) + Anzeige-Metadaten für Live-Vorschau / CSS object-position
-- Ausführung: Supabase Dashboard → SQL Editor → gesamtes Skript oder schrittweise.
--
-- Hinweis: Bucket wird im Dashboard angelegt (siehe Projekt-Doku); dieses Skript nur DB-Spalten + Storage-Policies.

-- ---------------------------------------------------------------------------
-- 1) users: Pfade relativ zum Bucket (ohne Bucket-Namen), z. B. "<user_uuid>/avatar/2025.webp"
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_storage_path text,
  ADD COLUMN IF NOT EXISTS profile_banner_storage_path text,
  ADD COLUMN IF NOT EXISTS avatar_position_x smallint DEFAULT 50
    CHECK (avatar_position_x >= 0 AND avatar_position_x <= 100),
  ADD COLUMN IF NOT EXISTS avatar_position_y smallint DEFAULT 50
    CHECK (avatar_position_y >= 0 AND avatar_position_y <= 100),
  ADD COLUMN IF NOT EXISTS banner_position_x smallint DEFAULT 50
    CHECK (banner_position_x >= 0 AND banner_position_x <= 100),
  ADD COLUMN IF NOT EXISTS banner_position_y smallint DEFAULT 50
    CHECK (banner_position_y >= 0 AND banner_position_y <= 100);

COMMENT ON COLUMN public.users.avatar_storage_path IS
  'Objektpfad im Storage-Bucket profile-media (Relativpfad), z. B. {user_id}/avatar/datei.webp';
COMMENT ON COLUMN public.users.profile_banner_storage_path IS
  'Objektpfad im Bucket für Profil-Hintergrund/Banner';
COMMENT ON COLUMN public.users.avatar_position_x IS
  'horizontaler Fokus 0–100 für object-position (%), Live-Vorschau Avatar';
COMMENT ON COLUMN public.users.avatar_position_y IS
  'vertikaler Fokus 0–100 für object-position (%), Live-Vorschau Avatar';
COMMENT ON COLUMN public.users.banner_position_x IS
  'horizontaler Fokus 0–100 für Banner-Hintergrund (object-position)';
COMMENT ON COLUMN public.users.banner_position_y IS
  'vertikaler Fokus 0–100 für Banner-Hintergrund (object-position)';

-- Bestehende avatar_url / profile_background_url bleiben für externe URLs oder Übergangszeit;
-- sobald Pfad gesetzt ist, soll die App bei Anzeige den Storage bevorzugen.

-- ---------------------------------------------------------------------------
-- 2) Storage: Policies (nachdem Bucket „profile-media“ existiert — siehe Dashboard-Schritte unten)
-- ---------------------------------------------------------------------------
-- Erwartete Objektpfade: erste Pfadkomponente = auth.uid(), z. B. "<uuid>/avatar.webp"
-- Hinweis: Bei öffentlichem Bucket sind Objekte oft ohne Policy lesbar; Policies schützen Schreibzugriff.
-- Öffentliches SELECT: nur nötig wenn Bucket „private“ ist und ihr öffentliche URLs ohne Signatur wollt.

DROP POLICY IF EXISTS "profile_media_select_public_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_delete_own_folder" ON storage.objects;

CREATE POLICY "profile_media_select_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-media');

CREATE POLICY "profile_media_insert_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-media'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "profile_media_update_own_folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-media'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-media'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "profile_media_delete_own_folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-media'
  AND split_part(name, '/', 1) = auth.uid()::text
);
