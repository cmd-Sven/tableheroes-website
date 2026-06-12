-- NPCs in Initiative, Friend/Nemesis-Kennzeichnung, Kampfrunden-Zähler.

ALTER TYPE public.combat_participant_type ADD VALUE IF NOT EXISTS 'npc';

ALTER TABLE public.combat_participants
  ADD COLUMN IF NOT EXISTS npc_id uuid REFERENCES public.npcs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS side text;

ALTER TABLE public.combat_participants
  DROP CONSTRAINT IF EXISTS combat_participants_side_check;

ALTER TABLE public.combat_participants
  ADD CONSTRAINT combat_participants_side_check
  CHECK (side IS NULL OR side IN ('friend', 'nemesis'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_combat_participants_session_npc
  ON public.combat_participants(session_id, npc_id)
  WHERE npc_id IS NOT NULL AND is_active = true;

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS combat_round integer NOT NULL DEFAULT 1;

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_combat_round_check;

ALTER TABLE public.session_live_states
  ADD CONSTRAINT session_live_states_combat_round_check
  CHECK (combat_round >= 1);

COMMENT ON COLUMN public.combat_participants.npc_id IS
  'Verknüpfung mit Bühnen-NPC, wenn der Teilnehmer aus einer NPC-Karte stammt.';

COMMENT ON COLUMN public.combat_participants.side IS
  'Friend (grün) oder Nemesis (rot) für NSC/NPC-Token in der Initiative.';

COMMENT ON COLUMN public.session_live_states.combat_round IS
  'Aktuelle Kampfrunde; erhöht sich, wenn der Zug wieder beim ersten Teilnehmer beginnt.';
