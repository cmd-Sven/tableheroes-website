-- Add detailed character info columns to support Character Lifecycle System
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS fears text,
ADD COLUMN IF NOT EXISTS goals text,
ADD COLUMN IF NOT EXISTS important_people text,
ADD COLUMN IF NOT EXISTS rivals text,
ADD COLUMN IF NOT EXISTS faction_membership text,
ADD COLUMN IF NOT EXISTS profession text,
ADD COLUMN IF NOT EXISTS backstory_summary text;

-- Optional: Add comment for documentation
COMMENT ON COLUMN public.characters.fears IS 'Character fears and phobias';
COMMENT ON COLUMN public.characters.goals IS 'Character goals and aspirations';
COMMENT ON COLUMN public.characters.important_people IS 'Important people in character life';
COMMENT ON COLUMN public.characters.rivals IS 'Character rivals and enemies';
COMMENT ON COLUMN public.characters.faction_membership IS 'Faction membership or affiliation';
COMMENT ON COLUMN public.characters.profession IS 'Character profession or occupation';
COMMENT ON COLUMN public.characters.backstory_summary IS 'Character backstory summary';





