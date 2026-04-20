-- Optionales Speichern des Storage-Pfads für Charakterportraits (Bucket profile-media)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS avatar_storage_path text;

COMMENT ON COLUMN public.characters.avatar_storage_path IS
  'Relativpfad im Bucket profile-media, z. B. {user_id}/characters/{character_id}/portrait.webp';
