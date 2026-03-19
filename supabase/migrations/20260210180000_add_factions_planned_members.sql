-- Geplante Fraktions-Mitglieder (Name + Rolle), werden auf der Detailseite als NPC-TODO angezeigt.
-- npc_id wird gesetzt, sobald der GM den NPC aus dem Wizard erstellt hat.
ALTER TABLE public.factions
ADD COLUMN IF NOT EXISTS planned_members jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.factions.planned_members IS 'Array of { name: string, role: string, npc_id?: string }. NPCs to create from faction detail page.';
