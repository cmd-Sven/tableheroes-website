-- Spieler-Charakter: Zuschnitt/Fokus des Porträts (wie image_display bei NPCs)
alter table public.characters
  add column if not exists avatar_display jsonb;

comment on column public.characters.avatar_display is
  'Portrait framing: { fit, posX, posY, letterboxColor } — gleiche Semantik wie npcs.image_display';
