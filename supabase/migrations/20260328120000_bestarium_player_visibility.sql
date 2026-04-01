-- Spieler:innen sehen keine Statblock-Daten; nur über SECURITY DEFINER RPC bei Freigabe (campaign_visibility).
-- Spalte player_knowledge: für Spieler sichtbares Hintergrundwissen (Gerüchte, Volksmund, etc.).

ALTER TABLE public.bestarium_creatures
  ADD COLUMN IF NOT EXISTS player_knowledge text;

COMMENT ON COLUMN public.bestarium_creatures.player_knowledge IS
  'Für Spieler:innen sichtbar, wenn die Kreatur in der Kampagne freigegeben ist (ohne Attribute/Statblock).';

-- Direktes Lesen der vollen Tabelle nur noch für GMs der Welt
DROP POLICY IF EXISTS "Campaign members can view world bestarium" ON public.bestarium_creatures;

-- Liste: nur freigegebene Kreaturen, nur minimale Felder
CREATE OR REPLACE FUNCTION public.bestarium_for_player_list(p_campaign_id uuid)
RETURNS TABLE (id uuid, name text, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.sort_order
  FROM public.bestarium_creatures b
  INNER JOIN public.campaigns c ON c.world_id = b.world_id AND c.id = p_campaign_id
  INNER JOIN public.campaign_members cm
    ON cm.campaign_id = c.id AND cm.user_id = auth.uid()
  INNER JOIN public.campaign_visibility cv
    ON cv.campaign_id = p_campaign_id
    AND cv.entity_id = b.id
    AND cv.entity_type = 'bestarium'
    AND cv.is_revealed = true
  WHERE cm.status IN ('Accepted', 'Drafting', 'In_Review')
  ORDER BY b.sort_order ASC, b.name ASC;
$$;

-- Detail: nur Beschreibung + Spielerwissen + Bild
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
    AND cm.status IN ('Accepted', 'Drafting', 'In_Review')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.bestarium_for_player_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bestarium_for_player_detail(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bestarium_for_player_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bestarium_for_player_detail(uuid, uuid) TO authenticated;
