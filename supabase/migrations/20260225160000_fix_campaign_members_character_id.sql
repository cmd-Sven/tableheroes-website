-- Reparatur: campaign_members mit status Accepted/Approved aber character_id = null
-- Setzt character_id aus characters (user_id + campaign_id, status Active/Alive/Approved)
UPDATE campaign_members cm
SET character_id = (
  SELECT c.id FROM characters c
  WHERE c.user_id = cm.user_id AND c.campaign_id = cm.campaign_id
    AND c.status IN ('Active', 'Alive', 'Approved')
  ORDER BY c.id DESC
  LIMIT 1
)
WHERE cm.character_id IS NULL
  AND cm.status IN ('Accepted', 'Approved');
