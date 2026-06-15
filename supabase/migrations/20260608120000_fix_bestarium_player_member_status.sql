-- Spieler mit Status Approved/Active etc. sahen keine Bestarium-Einträge (RPC prüfte nur Accepted/Drafting/In_Review).

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
  WHERE cm.status IN (
    'Accepted', 'Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed'
  )
  ORDER BY b.sort_order ASC, b.name ASC;
$$;

CREATE OR REPLACE FUNCTION public.bestarium_for_player_detail(p_campaign_id uuid, p_creature_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  physical_description text,
  player_knowledge text,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.physical_description, b.player_knowledge, b.image_url
  FROM public.bestarium_creatures b
  INNER JOIN public.campaigns c ON c.world_id = b.world_id AND c.id = p_campaign_id
  INNER JOIN public.campaign_members cm
    ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
  INNER JOIN public.campaign_visibility cv
    ON cv.campaign_id = p_campaign_id
    AND cv.entity_id = b.id
    AND cv.entity_type = 'bestarium'
    AND cv.is_revealed = true
  WHERE b.id = p_creature_id
    AND cm.status IN (
      'Accepted', 'Approved', 'Active', 'Drafting', 'In_Review', 'Changes_Proposed'
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.bestarium_for_player_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bestarium_for_player_detail(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bestarium_for_player_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bestarium_for_player_detail(uuid, uuid) TO authenticated;
