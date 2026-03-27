import { createClient } from "@/src/lib/supabase/server";

export type CampaignScopeForLayout = {
  name: string;
  bannerUrl: string | null;
  isGm: boolean;
};

/**
 * Minimale Kampagnen-Infos für Kontext-Leiste (Sidebar ersetzt das nicht).
 * Nur wenn der Nutzer GM ist oder Mitglied der Kampagne.
 */
export async function getCampaignScopeForLayout(
  campaignId: string,
): Promise<CampaignScopeForLayout | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, banner_url, gm_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaignRaw?.id) return null;

  const isGm = (campaignRaw as { gm_id: string }).gm_id === user.id;
  if (!isGm) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return null;
  }

  return {
    name: String((campaignRaw as any).name ?? "Kampagne"),
    bannerUrl: ((campaignRaw as any).banner_url as string | null) ?? null,
    isGm,
  };
}
