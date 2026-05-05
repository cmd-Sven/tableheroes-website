-- Persistent fate coins for the VTT stage.

ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS fate_coins jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destroyed_fate_coins integer NOT NULL DEFAULT 0;

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_fate_coins_array_check,
  ADD CONSTRAINT session_live_states_fate_coins_array_check
    CHECK (jsonb_typeof(fate_coins) = 'array');

ALTER TABLE public.session_live_states
  DROP CONSTRAINT IF EXISTS session_live_states_destroyed_fate_coins_check,
  ADD CONSTRAINT session_live_states_destroyed_fate_coins_check
    CHECK (destroyed_fate_coins >= 0);
