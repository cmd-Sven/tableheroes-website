import { createClient } from "@/src/lib/supabase/server";

export async function getWorldByCampaign(campaignId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;
  if (!campaign) return null;

  const { data: membership } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (campaign.gm_id !== user.id && !membership) {
    return null;
  }

  if (!campaign.world_id) return null;

  const { data: world, error } = await (supabase.from("worlds") as any)
    .select("*")
    .eq("id", campaign.world_id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Get World Error:", error);
    return null;
  }
  return world;
}

export async function getWorldsByGm(userId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("worlds") as any)
    .select("id, name, description")
    .eq("gm_id", userId)
    .order("name", { ascending: true });
  if (error) {
    console.error("Get Worlds By GM Error:", error);
    return [];
  }
  return (data || []) as { id: string; name: string; description: string | null }[];
}
