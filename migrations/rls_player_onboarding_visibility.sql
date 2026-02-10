-- ============================================================================
-- RLS: Player Visibility for Character Wizard (Onboarding)
-- ============================================================================
-- Zweck: Authenticated User (Spieler) dürfen für den Charakter-Wizard
--        Fraktionen, Orte und NPCs lesen, die für Onboarding freigegeben sind.
--
-- - world_lore: SELECT erlaubt, wenn allow_pc_origin = TRUE (oder is_revealed).
-- - factions:   SELECT erlaubt, wenn allow_pc_join_on_creation = TRUE (oder is_revealed).
-- - npcs:      SELECT erlaubt, wenn allow_pc_onboarding = TRUE oder is_revealed = TRUE.
--
-- Einschränkung: Nur Kampagnen, in denen der User GM ist oder Mitglied (Accepted/Drafting/In_Review).
-- ============================================================================

-- Hilfs-Subquery: Kampagnen-IDs, auf die der User Zugriff hat (GM oder Mitglied)
-- Wird in den USING-Klauseln wiederverwendet.

-- ============================================================================
-- 1. world_lore: Spieler können Einträge lesen, die als Heimatort freigegeben sind
-- ============================================================================

ALTER TABLE public.world_lore ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "world_lore_select_player_onboarding" ON public.world_lore;
CREATE POLICY "world_lore_select_player_onboarding"
  ON public.world_lore
  FOR SELECT
  TO authenticated
  USING (
    (allow_pc_origin = TRUE OR is_revealed = TRUE)
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE gm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members
      WHERE user_id = auth.uid()
        AND status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );

-- ============================================================================
-- 2. factions: Spieler können Fraktionen lesen, die für Charaktererstellung freigegeben sind
-- ============================================================================

ALTER TABLE public.factions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "factions_select_player_onboarding" ON public.factions;
CREATE POLICY "factions_select_player_onboarding"
  ON public.factions
  FOR SELECT
  TO authenticated
  USING (
    (allow_pc_join_on_creation = TRUE OR is_revealed = TRUE)
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE gm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members
      WHERE user_id = auth.uid()
        AND status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );

-- ============================================================================
-- 3. npcs: Spieler können NPCs lesen, die als Kontakt angeboten oder enthüllt sind
-- ============================================================================

ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "npcs_select_player_onboarding" ON public.npcs;
CREATE POLICY "npcs_select_player_onboarding"
  ON public.npcs
  FOR SELECT
  TO authenticated
  USING (
    (allow_pc_onboarding = TRUE OR is_revealed = TRUE)
    AND campaign_id IN (
      SELECT id FROM public.campaigns WHERE gm_id = auth.uid()
      UNION
      SELECT campaign_id FROM public.campaign_members
      WHERE user_id = auth.uid()
        AND status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );

-- ============================================================================
-- Hinweis: Falls bereits andere SELECT-Policies auf diesen Tabellen existieren
-- (z. B. für GM oder nur is_revealed), werden sie mit dieser Policy per OR
-- kombiniert. GM-Policies sollten weiterhin vorher definiert sein (GM sieht alles).
-- ============================================================================
