-- Bestarium: Monster/Biester pro Welt (D&D 5e und später weitere Systeme über game_system).
-- Analog zu NPCs/Fraktionen: world_id, optionaler Ort (locations), optionaler Lore-Eintrag (world_lore).

CREATE TABLE IF NOT EXISTS public.bestarium_creatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,

  -- Regelsystem (z. B. dnd5e) – für Beast-Creator / KI und UI-Filter
  game_system text NOT NULL DEFAULT 'dnd5e',

  -- 1) Identität
  name text NOT NULL,
  size_category text,
  creature_type text,
  subtype text,
  alignment text,

  -- 2) Defensive
  armor_class integer,
  hit_points integer,
  hit_dice text,
  damage_vulnerabilities text,
  damage_resistances text,
  damage_immunities text,
  condition_immunities text,

  -- 3) Attribute (D&D 6 Werte)
  ability_str integer,
  ability_dex integer,
  ability_con integer,
  ability_int integer,
  ability_wis integer,
  ability_cha integer,

  -- 4) Offensive (strukturiert + Freitext für Statblocks)
  multiattack_notes text,
  attacks jsonb NOT NULL DEFAULT '[]'::jsonb,
  special_abilities text,
  legendary_actions text,
  lair_actions text,

  -- 5) Schwierigkeit
  challenge_rating numeric(8, 3),
  xp_awarded integer,

  -- 6) Flavor / Traits
  senses text,
  languages text,
  passive_traits text,
  physical_description text,
  lore_notes text,

  -- Medien (analog npcs)
  image_url text,
  image_display jsonb,

  -- Orts-/Lore-Zuordnung (wie Fraktionen)
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  lore_id uuid REFERENCES public.world_lore(id) ON DELETE SET NULL,

  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bestarium_creatures_world_id
  ON public.bestarium_creatures(world_id);

CREATE INDEX IF NOT EXISTS idx_bestarium_creatures_location_id
  ON public.bestarium_creatures(location_id);

CREATE INDEX IF NOT EXISTS idx_bestarium_creatures_lore_id
  ON public.bestarium_creatures(lore_id);

CREATE INDEX IF NOT EXISTS idx_bestarium_creatures_game_system
  ON public.bestarium_creatures(world_id, game_system);

COMMENT ON TABLE public.bestarium_creatures IS
  'Welt-Bestarium: Kreaturen für GMs; attacks als JSON-Array z. B. [{ "name", "attack_bonus", "damage_notation", "damage_type", "range", "notes" }].';

ALTER TABLE public.bestarium_creatures ENABLE ROW LEVEL SECURITY;

-- GM: voller Zugriff
DROP POLICY IF EXISTS "bestarium_select_gm" ON public.bestarium_creatures;
CREATE POLICY "bestarium_select_gm"
  ON public.bestarium_creatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.worlds w
      WHERE w.id = bestarium_creatures.world_id
        AND w.gm_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bestarium_insert_gm" ON public.bestarium_creatures;
CREATE POLICY "bestarium_insert_gm"
  ON public.bestarium_creatures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.worlds w
      WHERE w.id = bestarium_creatures.world_id
        AND w.gm_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bestarium_update_gm" ON public.bestarium_creatures;
CREATE POLICY "bestarium_update_gm"
  ON public.bestarium_creatures
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.worlds w
      WHERE w.id = bestarium_creatures.world_id
        AND w.gm_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bestarium_delete_gm" ON public.bestarium_creatures;
CREATE POLICY "bestarium_delete_gm"
  ON public.bestarium_creatures
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.worlds w
      WHERE w.id = bestarium_creatures.world_id
        AND w.gm_id = auth.uid()
    )
  );

-- Spieler: Lesen wie bei NPCs (Kampagnenmitglied derselben Welt)
DROP POLICY IF EXISTS "Campaign members can view world bestarium" ON public.bestarium_creatures;
CREATE POLICY "Campaign members can view world bestarium"
  ON public.bestarium_creatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.campaign_members cm ON cm.campaign_id = c.id
      WHERE c.world_id = bestarium_creatures.world_id
        AND cm.user_id = auth.uid()
        AND cm.status IN ('Accepted', 'Drafting', 'In_Review')
    )
  );
