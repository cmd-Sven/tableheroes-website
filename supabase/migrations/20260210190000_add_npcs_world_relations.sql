-- Weltweite NPC-Beziehungen (weltbezogen, nicht kampagnenbezogen).
-- Format: JSONB-Array von { "target_npc_id": "uuid", "relation_types": ["Bruder", "Gegenspieler"] }, max. 2 Typen pro Ziel.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'npcs' AND column_name = 'world_relations'
  ) THEN
    ALTER TABLE public.npcs
    ADD COLUMN world_relations jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
