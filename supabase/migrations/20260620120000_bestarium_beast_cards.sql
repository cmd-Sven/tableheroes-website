-- Beast Cards: Spieler-Discovery, Portrait-Rechte, Bühnen-Integration, Besiegt/Loot

-- Bestarium: Würfel-Discovery, Loot-Hinweise, Portrait-Attribution
ALTER TABLE public.bestarium_creatures
  ADD COLUMN IF NOT EXISTS check_results jsonb,
  ADD COLUMN IF NOT EXISTS known_loot text,
  ADD COLUMN IF NOT EXISTS lifestyle_habitat text,
  ADD COLUMN IF NOT EXISTS image_is_ai_generated boolean,
  ADD COLUMN IF NOT EXISTS image_upload_rights_confirmed boolean;

COMMENT ON COLUMN public.bestarium_creatures.check_results IS
  'Würfel-Ergebnisse für Spieler-Analyse: Monsterkategorie, Schwächen, Immunität, Besondere Fähigkeit, Loot, Lebensweise.';
COMMENT ON COLUMN public.bestarium_creatures.known_loot IS
  'GM: bekannter oder typischer Loot (z. B. Schuppen für Reagenzien) – Basis für KI-Loot-Vorschläge.';
COMMENT ON COLUMN public.bestarium_creatures.lifestyle_habitat IS
  'GM: Lebensweise und Lebensraum (ergänzt location_id / passive_traits).';

-- Bühnendeck: welche Kreaturen im Stage Manager erscheinen
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS stage_deck_creature_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.sessions.stage_deck_creature_ids IS
  'NULL = alle freigegebenen Bestarium-Kreaturen im Stage Manager; sonst nur diese IDs.';

-- Live-Bühne: sichtbare Kreaturen
ALTER TABLE public.session_live_states
  ADD COLUMN IF NOT EXISTS visible_creature_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.session_live_states.visible_creature_ids IS
  'Bestarium-Kreaturen, die aktuell auf der Live-Bühne liegen.';

-- Kampagnenweite Entdeckungen & Besiegt-Status (Gruppenwissen)
CREATE TABLE IF NOT EXISTS public.campaign_creature_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creature_id uuid NOT NULL REFERENCES public.bestarium_creatures(id) ON DELETE CASCADE,
  discoveries jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_defeated boolean NOT NULL DEFAULT false,
  defeated_at timestamptz,
  defeated_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, creature_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_creature_state_campaign
  ON public.campaign_creature_state(campaign_id);

COMMENT ON TABLE public.campaign_creature_state IS
  'Freigeschaltete Analyse-Infos und Besiegt-Status pro Kreatur und Kampagne (Gruppenwissen).';

ALTER TABLE public.campaign_creature_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_creature_state_select_member" ON public.campaign_creature_state;
CREATE POLICY "campaign_creature_state_select_member"
  ON public.campaign_creature_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_creature_state.campaign_id
        AND (
          c.gm_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.campaign_members cm
            WHERE cm.campaign_id = c.id
              AND cm.user_id = auth.uid()
              AND cm.status IN ('Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed')
          )
        )
    )
  );

DROP POLICY IF EXISTS "campaign_creature_state_write_gm" ON public.campaign_creature_state;
CREATE POLICY "campaign_creature_state_write_gm"
  ON public.campaign_creature_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_creature_state.campaign_id
        AND c.gm_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_creature_state.campaign_id
        AND c.gm_id = auth.uid()
    )
  );

-- Spieler-Notizen auch für Bestarium
ALTER TABLE public.campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_entity_type_check;

ALTER TABLE public.campaign_notes
  ADD CONSTRAINT campaign_notes_entity_type_check
  CHECK (entity_type IN ('npc', 'faction', 'lore', 'location', 'bestarium'));

COMMENT ON TABLE public.campaign_notes IS
  'Spieler-Notizen zu NPCs, Bestarium, Orten, Lore pro Kampagne; isoliert pro campaign_id.';
