-- Rang/Position des Charakters bei einer Fraktion (z.B. Explorer, Mitglied, Feind, Schuldner)
ALTER TABLE character_faction_reputation
ADD COLUMN IF NOT EXISTS rank text DEFAULT NULL;

COMMENT ON COLUMN character_faction_reputation.rank IS 'Rang oder Position des Charakters bei dieser Fraktion (z.B. Explorer, Mitglied, Feind, Schuldner)';
