-- Status-Feld für Fraktionen (z. B. 'Neutral', 'Verbündet', 'Feindlich')
-- Behebt Fehler: Could not find the 'current_status' column of 'factions' in the schema cache

ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS current_status text DEFAULT NULL;

