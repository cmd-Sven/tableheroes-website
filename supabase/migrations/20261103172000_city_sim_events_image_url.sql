-- Optionales Kartenmotiv für Stadtereignisse (Anzeige beim Ausspielen).

ALTER TABLE city_sim_events
  ADD COLUMN IF NOT EXISTS image_url text;
