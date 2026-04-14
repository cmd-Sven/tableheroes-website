-- Party-Tray: Charaktere mit Spieler-user_id; Spieler nur mit Zusage/Via Online/gm_confirmed,
-- GM sieht alle Kampagnen-PCs (ohne GM-Zeile). SECURITY DEFINER + Mitgliedschaftsprüfung.

CREATE OR REPLACE FUNCTION public.get_session_party_tray(p_session_id uuid)
RETURNS TABLE (
  id uuid,
  char_name text,
  char_class text,
  race text,
  level integer,
  avatar_url text,
  member_user_id uuid
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
    (c.level)::integer AS level,
    c.avatar_url::text,
    cm.user_id
  FROM public.sessions s
  JOIN public.campaigns camp ON camp.id = s.campaign_id
  JOIN public.campaign_members cm
    ON cm.campaign_id = s.campaign_id
   AND cm.status IN ('Accepted', 'Approved', 'Active', 'Drafting', 'In_Review')
   AND cm.character_id IS NOT NULL
  JOIN public.characters c ON c.id = cm.character_id
  LEFT JOIN public.session_rsvps rsvp
    ON rsvp.session_id = s.id AND rsvp.user_id = cm.user_id
  WHERE s.id = p_session_id
    AND (camp.gm_id IS NULL OR cm.user_id <> camp.gm_id)
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
        FROM public.campaigns g
        WHERE g.id = s.campaign_id
          AND (g.gm_id = auth.uid() OR g.owner_id = auth.uid())
      )
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.campaigns g
        WHERE g.id = s.campaign_id
          AND (g.gm_id = auth.uid() OR g.owner_id = auth.uid())
      )
      OR (
        rsvp.session_id IS NOT NULL
        AND (
          rsvp.rsvp_status IN ('Zusage', 'Via Online')
          OR COALESCE(rsvp.gm_confirmed, false) = true
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_session_party_tray(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_party_tray(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_session_party_tray(uuid) IS 'Party-Tray: PCs mit member_user_id; Spieler nur bei RSVP „dabei“, GM alle PCs.';
