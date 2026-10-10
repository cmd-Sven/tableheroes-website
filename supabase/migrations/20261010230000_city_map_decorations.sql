-- Deko-Modelle auf der Stadtkarte. Lesen: Weltzugriff. Schreiben: nur Spielleiter.

CREATE TABLE public.city_map_decorations (
  world_id uuid NOT NULL,
  decoration_id uuid NOT NULL DEFAULT gen_random_uuid(),
  model_key text NOT NULL,
  name text,
  u double precision NOT NULL,
  v double precision NOT NULL,
  scale double precision NOT NULL DEFAULT 1,
  rotation double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT city_map_decorations_pkey PRIMARY KEY (world_id, decoration_id),
  CONSTRAINT city_map_decorations_world_id_fkey FOREIGN KEY (world_id) REFERENCES public.worlds(id) ON DELETE CASCADE,
  CONSTRAINT city_map_decorations_model_key_nonempty CHECK (length(btrim(model_key)) > 0),
  CONSTRAINT city_map_decorations_name_nonempty CHECK (name IS NULL OR length(btrim(name)) > 0),
  CONSTRAINT city_map_decorations_scale_range CHECK (scale >= 0.25::double precision AND scale <= 4::double precision),
  CONSTRAINT city_map_decorations_rotation_range CHECK (rotation >= 0::double precision AND rotation <= 360::double precision),
  CONSTRAINT city_map_decorations_u_range CHECK (u >= -0.05::double precision AND u <= 1.05::double precision),
  CONSTRAINT city_map_decorations_v_range CHECK (v >= -0.05::double precision AND v <= 1.05::double precision)
);

COMMENT ON TABLE public.city_map_decorations IS 'Gesetzte 3D-Deko auf der Stadtkarte, mehrere Exemplare pro Modell.';

ALTER TABLE public.city_map_decorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY city_map_decorations_select
  ON public.city_map_decorations
  FOR SELECT
  TO authenticated
  USING ((SELECT public.user_can_access_world_maps(world_id)));

CREATE POLICY city_map_decorations_insert
  ON public.city_map_decorations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.user_is_world_gm(world_id)));

CREATE POLICY city_map_decorations_update
  ON public.city_map_decorations
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.user_is_world_gm(world_id)))
  WITH CHECK ((SELECT public.user_is_world_gm(world_id)));

CREATE POLICY city_map_decorations_delete
  ON public.city_map_decorations
  FOR DELETE
  TO authenticated
  USING ((SELECT public.user_is_world_gm(world_id)));

REVOKE ALL ON TABLE public.city_map_decorations FROM PUBLIC;
REVOKE ALL ON TABLE public.city_map_decorations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.city_map_decorations TO authenticated;
GRANT ALL ON TABLE public.city_map_decorations TO service_role;
