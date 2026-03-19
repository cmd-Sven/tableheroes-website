-- Sichtbarkeits-Feld für Fraktionen (für Spieler sichtbar / verborgen)
-- Behebt: Could not find the 'is_revealed' column of 'factions' in the schema cache

ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS is_revealed boolean DEFAULT FALSE;

