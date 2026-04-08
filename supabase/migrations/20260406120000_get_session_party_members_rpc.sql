-- Party-Liste für Live-Session: SECURITY DEFINER, aber nur wenn User Kampagnenmitglied oder GM/Owner ist.
-- Umgeht RLS auf characters für verschachtelte Reads — Spieler sehen die Gruppe im Party-Tray.

CREATE OR REPLACE FUNCTION public.get_session_party_members(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  char_name text,
  char_class text,
  race text,
  level integer,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name::text AS char_name,
    c.class::text AS char_class,
    c.race::text,
    c.level::integer,
    c.avatar_url::text
  FROM public.sessions s
  JOIN public.campaign_members cm
    ON cm.campaign_id = s.campaign_id
   AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
   AND cm.character_id IS NOT NULL
  JOIN public.characters c ON c.id = cm.character_id
  WHERE s.id = p_session_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.campaign_members m
        WHERE m.campaign_id = s.campaign_id
          AND m.user_id = auth.uid()
          AND m.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
      )
      OR EXISTS (
        SELECT 1
        FROM public.campaigns camp
        WHERE camp.id = s.campaign_id
          AND (camp.gm_id = auth.uid() OR camp.owner_id = auth.uid())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_session_party_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_party_members(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_session_party_members(uuid) IS 'Party-Charaktere einer Session für alle berechtigten Kampagnenmitglieder (Lesen trotz characters-RLS).';
