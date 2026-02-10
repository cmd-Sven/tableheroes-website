-- NPCs: In Charaktererstellung als Kontakt anbieten (Onboarding)
ALTER TABLE public.npcs
ADD COLUMN IF NOT EXISTS allow_pc_onboarding BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.npcs.allow_pc_onboarding IS 'Wenn TRUE, können Spieler diesen NPC im Charakter-Wizard als bekannten Kontakt wählen (wenn is_revealed ODER allow_pc_onboarding).';
