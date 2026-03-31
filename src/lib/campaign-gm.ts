/**
 * Gleiche SL-Logik wie Kampagnen-Seite: gm_id oder owner_id (String-Vergleich).
 */
export function isCampaignGm(
  campaign:
    | { gm_id?: string | null; owner_id?: string | null }
    | null
    | undefined,
  userId: string,
): boolean {
  if (!campaign) return false;
  const uid = String(userId);
  const gm = campaign.gm_id != null ? String(campaign.gm_id) : null;
  const owner = campaign.owner_id != null ? String(campaign.owner_id) : null;
  return (gm !== null && gm === uid) || (owner !== null && owner === uid);
}
