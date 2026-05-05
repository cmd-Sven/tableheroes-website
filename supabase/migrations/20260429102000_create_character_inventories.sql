-- Private character inventories for live-session and offline character views.
-- Access model: character owner OR campaign GM/Owner only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'character_item_category'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.character_item_category AS ENUM (
      'Weapon',
      'Equipment',
      'Consumable',
      'Story',
      'CoinGem'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.character_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category public.character_item_category NOT NULL DEFAULT 'Equipment',
  icon_type text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.character_wealth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  gp integer NOT NULL DEFAULT 0,
  sp integer NOT NULL DEFAULT 0,
  cp integer NOT NULL DEFAULT 0,
  ep integer NOT NULL DEFAULT 0,
  pp integer NOT NULL DEFAULT 0,
  gem_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_wealth_character_id_key UNIQUE (character_id),
  CONSTRAINT character_wealth_non_negative_currency CHECK (
    gp >= 0 AND sp >= 0 AND cp >= 0 AND ep >= 0 AND pp >= 0
  ),
  CONSTRAINT character_wealth_gem_data_array CHECK (jsonb_typeof(gem_data) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_character_items_character_id
  ON public.character_items(character_id);

CREATE INDEX IF NOT EXISTS idx_character_items_character_category
  ON public.character_items(character_id, category)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_character_wealth_character_id
  ON public.character_wealth(character_id);

CREATE OR REPLACE FUNCTION public.th_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_character_items ON public.character_items;
CREATE TRIGGER trg_touch_character_items
BEFORE UPDATE ON public.character_items
FOR EACH ROW
EXECUTE FUNCTION public.th_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_character_wealth ON public.character_wealth;
CREATE TRIGGER trg_touch_character_wealth
BEFORE UPDATE ON public.character_wealth
FOR EACH ROW
EXECUTE FUNCTION public.th_touch_updated_at();

CREATE OR REPLACE FUNCTION public.th_can_access_character_inventory(target_character_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.characters ch
    JOIN public.campaigns ca ON ca.id = ch.campaign_id
    WHERE ch.id = target_character_id
      AND (
        ch.user_id = auth.uid()
        OR ca.gm_id = auth.uid()
        OR ca.owner_id = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.th_can_access_character_inventory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.th_can_access_character_inventory(uuid) TO authenticated;

ALTER TABLE public.character_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_wealth ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS character_items_select_owner_or_gm ON public.character_items;
DROP POLICY IF EXISTS character_items_insert_owner_or_gm ON public.character_items;
DROP POLICY IF EXISTS character_items_update_owner_or_gm ON public.character_items;
DROP POLICY IF EXISTS character_items_delete_owner_or_gm ON public.character_items;

CREATE POLICY character_items_select_owner_or_gm
ON public.character_items
FOR SELECT
TO authenticated
USING (public.th_can_access_character_inventory(character_id));

CREATE POLICY character_items_insert_owner_or_gm
ON public.character_items
FOR INSERT
TO authenticated
WITH CHECK (public.th_can_access_character_inventory(character_id));

CREATE POLICY character_items_update_owner_or_gm
ON public.character_items
FOR UPDATE
TO authenticated
USING (public.th_can_access_character_inventory(character_id))
WITH CHECK (public.th_can_access_character_inventory(character_id));

CREATE POLICY character_items_delete_owner_or_gm
ON public.character_items
FOR DELETE
TO authenticated
USING (public.th_can_access_character_inventory(character_id));

DROP POLICY IF EXISTS character_wealth_select_owner_or_gm ON public.character_wealth;
DROP POLICY IF EXISTS character_wealth_insert_owner_or_gm ON public.character_wealth;
DROP POLICY IF EXISTS character_wealth_update_owner_or_gm ON public.character_wealth;
DROP POLICY IF EXISTS character_wealth_delete_owner_or_gm ON public.character_wealth;

CREATE POLICY character_wealth_select_owner_or_gm
ON public.character_wealth
FOR SELECT
TO authenticated
USING (public.th_can_access_character_inventory(character_id));

CREATE POLICY character_wealth_insert_owner_or_gm
ON public.character_wealth
FOR INSERT
TO authenticated
WITH CHECK (public.th_can_access_character_inventory(character_id));

CREATE POLICY character_wealth_update_owner_or_gm
ON public.character_wealth
FOR UPDATE
TO authenticated
USING (public.th_can_access_character_inventory(character_id))
WITH CHECK (public.th_can_access_character_inventory(character_id));

CREATE POLICY character_wealth_delete_owner_or_gm
ON public.character_wealth
FOR DELETE
TO authenticated
USING (public.th_can_access_character_inventory(character_id));

COMMENT ON TABLE public.character_items IS 'Private RPG-focused inventory items per character.';
COMMENT ON TABLE public.character_wealth IS 'D&D style character currency and gem list.';
COMMENT ON COLUMN public.character_items.icon_type IS 'UI hint for simple item icon selection, e.g. sword, mug, bag.';
COMMENT ON COLUMN public.character_items.is_deleted IS 'Soft delete flag; normal UI filters deleted items out.';
COMMENT ON COLUMN public.character_wealth.gem_data IS 'Array of gems: [{ "name": text, "estimated_value": int }].';
