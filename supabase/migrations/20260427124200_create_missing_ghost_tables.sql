-- Create missing tables that are already used by the TypeScript application.
-- These tables were referenced by the frontend/actions but were absent from the live schema.

-- ---------------------------------------------------------------------------
-- site_settings: small admin-managed key/value store
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.site_settings IS
  'Admin-managed site-wide key/value settings, e.g. maintenance_mode.';

-- ---------------------------------------------------------------------------
-- points_catalog: rewards players can redeem with spendable points
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  type text NOT NULL DEFAULT 'physical' CHECK (type IN ('physical', 'achievement')),
  image_url text,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.points_catalog IS
  'GM/Admin-created rewards that players can redeem with points.';

COMMENT ON COLUMN public.points_catalog.type IS
  'physical = physical reward, achievement = grants an achievement.';

ALTER TABLE public.points_log
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'points_log_catalog_item_id_fkey'
      AND conrelid = 'public.points_log'::regclass
  ) THEN
    ALTER TABLE public.points_log
      ADD CONSTRAINT points_log_catalog_item_id_fkey
      FOREIGN KEY (catalog_item_id)
      REFERENCES public.points_catalog(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- lore_favorites: per-user favorite marker for world_lore entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lore_favorites (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lore_id uuid NOT NULL REFERENCES public.world_lore(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lore_id)
);

COMMENT ON TABLE public.lore_favorites IS
  'Per-user favorites for lore/world entries.';

-- ---------------------------------------------------------------------------
-- secrets: universal campaign secrets for NPCs, factions and lore entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('npc', 'faction', 'lore')),
  title text,
  content text NOT NULL,
  meaning text,
  secret_type text DEFAULT 'Wissen',
  discovery_dc integer DEFAULT 15 CHECK (discovery_dc IS NULL OR discovery_dc BETWEEN 1 AND 30),
  skill_check text,
  is_ai_generated boolean NOT NULL DEFAULT false,
  is_revealed boolean NOT NULL DEFAULT false,
  lore_id uuid REFERENCES public.world_lore(id) ON DELETE SET NULL,
  discovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.secrets IS
  'Universal GM secrets attached to campaign entities: npc, faction or lore.';

CREATE INDEX IF NOT EXISTS idx_secrets_campaign_entity
  ON public.secrets (campaign_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_secrets_lore_discovered
  ON public.secrets (lore_id, discovered_at)
  WHERE lore_id IS NOT NULL AND discovered_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.th_sync_secret_lore_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entity_type = 'lore' THEN
    NEW.lore_id := NEW.entity_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_secret_lore_id ON public.secrets;
CREATE TRIGGER trg_sync_secret_lore_id
  BEFORE INSERT OR UPDATE ON public.secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.th_sync_secret_lore_id();

CREATE TABLE IF NOT EXISTS public.secret_holders (
  secret_id uuid NOT NULL,
  character_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (secret_id, character_id)
);

-- The existing table has no generated FK relationships because secrets did not exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'secret_holders'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'secret_holders_secret_id_fkey'
        AND conrelid = 'public.secret_holders'::regclass
    ) THEN
      ALTER TABLE public.secret_holders
        ADD CONSTRAINT secret_holders_secret_id_fkey
        FOREIGN KEY (secret_id)
        REFERENCES public.secrets(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'secret_holders_character_id_fkey'
        AND conrelid = 'public.secret_holders'::regclass
    ) THEN
      ALTER TABLE public.secret_holders
        ADD CONSTRAINT secret_holders_character_id_fkey
        FOREIGN KEY (character_id)
        REFERENCES public.characters(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_secret_holders_character
  ON public.secret_holders (character_id, secret_id);

-- SECURITY DEFINER helpers keep RLS policies readable and avoid recursive
-- policy evaluation between secrets and secret_holders.
CREATE OR REPLACE FUNCTION public.th_is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.primary_role = 'Admin' OR COALESCE(u.is_super_admin, false) = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.th_is_gm_or_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.primary_role IN ('GameMaster', 'Admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.th_can_manage_campaign(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = target_campaign_id
      AND (c.gm_id = auth.uid() OR c.owner_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.th_can_manage_secret(target_secret_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.secrets s
    WHERE s.id = target_secret_id
      AND public.th_can_manage_campaign(s.campaign_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.th_can_view_secret(target_secret_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.secrets s
    WHERE s.id = target_secret_id
      AND (
        public.th_can_manage_campaign(s.campaign_id)
        OR (
          s.is_revealed = true
          AND EXISTS (
            SELECT 1
            FROM public.campaign_members cm
            WHERE cm.campaign_id = s.campaign_id
              AND cm.user_id = auth.uid()
              AND cm.status IN ('Approved', 'Active')
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.secret_holders sh
          JOIN public.characters ch ON ch.id = sh.character_id
          WHERE sh.secret_id = s.id
            AND ch.user_id = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS helpers and policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lore_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_holders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_admin_select" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON public.site_settings;

CREATE POLICY "site_settings_admin_select"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.th_is_admin_user());

CREATE POLICY "site_settings_admin_insert"
  ON public.site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.th_is_admin_user());

CREATE POLICY "site_settings_admin_update"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (public.th_is_admin_user())
  WITH CHECK (public.th_is_admin_user());

CREATE POLICY "site_settings_admin_delete"
  ON public.site_settings
  FOR DELETE
  TO authenticated
  USING (public.th_is_admin_user());

DROP POLICY IF EXISTS "points_catalog_authenticated_select" ON public.points_catalog;
DROP POLICY IF EXISTS "points_catalog_gm_admin_insert" ON public.points_catalog;
DROP POLICY IF EXISTS "points_catalog_gm_admin_update" ON public.points_catalog;
DROP POLICY IF EXISTS "points_catalog_gm_admin_delete" ON public.points_catalog;

CREATE POLICY "points_catalog_authenticated_select"
  ON public.points_catalog
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "points_catalog_gm_admin_insert"
  ON public.points_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (public.th_is_gm_or_admin_user());

CREATE POLICY "points_catalog_gm_admin_update"
  ON public.points_catalog
  FOR UPDATE
  TO authenticated
  USING (public.th_is_gm_or_admin_user())
  WITH CHECK (public.th_is_gm_or_admin_user());

CREATE POLICY "points_catalog_gm_admin_delete"
  ON public.points_catalog
  FOR DELETE
  TO authenticated
  USING (public.th_is_gm_or_admin_user());

DROP POLICY IF EXISTS "lore_favorites_own_select" ON public.lore_favorites;
DROP POLICY IF EXISTS "lore_favorites_own_insert" ON public.lore_favorites;
DROP POLICY IF EXISTS "lore_favorites_own_delete" ON public.lore_favorites;

CREATE POLICY "lore_favorites_own_select"
  ON public.lore_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "lore_favorites_own_insert"
  ON public.lore_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lore_favorites_own_delete"
  ON public.lore_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "secrets_campaign_access_select" ON public.secrets;
DROP POLICY IF EXISTS "secrets_gm_owner_insert" ON public.secrets;
DROP POLICY IF EXISTS "secrets_gm_owner_update" ON public.secrets;
DROP POLICY IF EXISTS "secrets_gm_owner_delete" ON public.secrets;

CREATE POLICY "secrets_campaign_access_select"
  ON public.secrets
  FOR SELECT
  TO authenticated
  USING (public.th_can_view_secret(id));

CREATE POLICY "secrets_gm_owner_insert"
  ON public.secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.th_can_manage_campaign(campaign_id));

CREATE POLICY "secrets_gm_owner_update"
  ON public.secrets
  FOR UPDATE
  TO authenticated
  USING (public.th_can_manage_campaign(campaign_id))
  WITH CHECK (public.th_can_manage_campaign(campaign_id));

CREATE POLICY "secrets_gm_owner_delete"
  ON public.secrets
  FOR DELETE
  TO authenticated
  USING (public.th_can_manage_campaign(campaign_id));

DROP POLICY IF EXISTS "secret_holders_related_select" ON public.secret_holders;
DROP POLICY IF EXISTS "secret_holders_gm_owner_insert" ON public.secret_holders;
DROP POLICY IF EXISTS "secret_holders_gm_owner_delete" ON public.secret_holders;

CREATE POLICY "secret_holders_related_select"
  ON public.secret_holders
  FOR SELECT
  TO authenticated
  USING (
    public.th_can_manage_secret(secret_id)
    OR EXISTS (
      SELECT 1
      FROM public.characters ch
      WHERE ch.id = secret_holders.character_id
        AND ch.user_id = auth.uid()
    )
  );

CREATE POLICY "secret_holders_gm_owner_insert"
  ON public.secret_holders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.th_can_manage_secret(secret_id));

CREATE POLICY "secret_holders_gm_owner_delete"
  ON public.secret_holders
  FOR DELETE
  TO authenticated
  USING (public.th_can_manage_secret(secret_id));
