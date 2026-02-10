-- Achievement-System: Tabellen achievements und user_achievements
-- In Supabase SQL Editor ausführen.

-- Tabelle achievements (Master-Liste)
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  points_awarded int NOT NULL DEFAULT 10,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Tabelle user_achievements (Vergabe an User)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements sind lesbar für alle angemeldeten User"
  ON public.achievements FOR SELECT TO authenticated USING (true);

CREATE POLICY "User-Achievements: User sieht nur eigene"
  ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "User-Achievements: Insert nur über Service Role oder nach Prüfung"
  ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (true);

-- Seed: 30 Achievements
INSERT INTO public.achievements (name, points_awarded, icon) VALUES
  ('Slogan-Schmied', 10, null),
  ('Der erste Atemzug', 15, null),
  ('Ein neues Gesicht', 10, null),
  ('Pizza-Bestechung', 20, null),
  ('Schauspiel-Legende', 25, null),
  ('Quest-Meister', 15, null),
  ('Lore-Wächter', 15, null),
  ('NPC-Flüsterer', 10, null),
  ('Session-Held', 20, null),
  ('Würfel-Glück', 10, null),
  ('Team-Player', 10, null),
  ('Erzähler', 15, null),
  ('Taktiker', 15, null),
  ('Entdecker', 10, null),
  ('Diplomat', 15, null),
  ('Schatzsucher', 10, null),
  ('Kartenzeichner', 15, null),
  ('Weltenschmied', 20, null),
  ('Charakter-Veteran', 15, null),
  ('Kampagnen-Gründer', 25, null),
  ('Treuer Begleiter', 10, null),
  ('Kritiker-Würze', 15, null),
  ('Nachtwache', 10, null),
  ('Geschichten-Sammler', 15, null),
  ('Rollen-Spieler', 15, null),
  ('Impro-König', 20, null),
  ('Regel-Wächter', 10, null),
  ('Atmosphären-Zauberer', 20, null),
  ('Epischer Moment', 25, null),
  ('Community-Stern', 20, null)
ON CONFLICT (name) DO NOTHING;
