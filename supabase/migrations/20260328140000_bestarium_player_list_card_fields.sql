-- Liste für Spieler: Bild, Gattung (creature_type), Ortsname für Karten-Ansicht & Filter (keine Statblock-Daten).

DROP FUNCTION IF EXISTS public.bestarium_for_player_list(uuid);

CREATE OR REPLACE FUNCTION public.bestarium_for_player_list(p_campaign_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  sort_order integer,
  image_url text,
  creature_type text,
  location_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.name,
    b.sort_order,
    b.image_url,
    b.creature_type,
    l.name AS location_name
  FROM public.bestarium_creatures b
  INNER JOIN public.campaigns c ON c.world_id = b.world_id AND c.id = p_campaign_id
  INNER JOIN public.campaign_members cm
    ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
  INNER JOIN public.campaign_visibility cv
    ON cv.campaign_id = p_campaign_id
    AND cv.entity_id = b.id
    AND cv.entity_type = 'bestarium'
    AND cv.is_revealed = true
  LEFT JOIN public.locations l ON l.id = b.location_id
  WHERE cm.status IN ('Accepted', 'Drafting', 'In_Review')
  ORDER BY b.sort_order ASC, b.name ASC;
$$;

REVOKE ALL ON FUNCTION public.bestarium_for_player_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bestarium_for_player_list(uuid) TO authenticated;
