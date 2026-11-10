-- GM can unlock player selling at the open shop (city / stage trade).
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS shop_selling_unlocked boolean NOT NULL DEFAULT false;
