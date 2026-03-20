-- points_log: Falls die Tabelle noch nicht existiert (z.B. bei manueller DB-Setup)
-- Wird von achievement-actions, point-actions und points-catalog-actions genutzt.

CREATE TABLE IF NOT EXISTS public.points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_points_log_user_id ON public.points_log(user_id);
CREATE INDEX IF NOT EXISTS idx_points_log_created_at ON public.points_log(created_at DESC);

ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Einträge
DROP POLICY IF EXISTS "Users can view own points log" ON public.points_log;
CREATE POLICY "Users can view own points log"
  ON public.points_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Insert nur über Service/Server (authenticated kann für sich und andere eintragen)
DROP POLICY IF EXISTS "Authenticated can insert points log" ON public.points_log;
CREATE POLICY "Authenticated can insert points log"
  ON public.points_log FOR INSERT TO authenticated
  WITH CHECK (true);
