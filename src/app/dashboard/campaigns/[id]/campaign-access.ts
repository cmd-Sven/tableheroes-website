/**
 * Server-only: Lädt Kampagne, prüft Zugriff (GM oder akzeptiertes Mitglied) und optional die Welt.
 * Für Listen-Seiten unter /dashboard/campaigns/[id]/npcs, /factions, /lore.
 */
import "server-only";

import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export type CampaignAccessResult = {
  campaignId: string;
  campaign: { id: string; gm_id: string; world_id: string | null; [key: string]: any };
  isGM: boolean;
  hasAccess: boolean;
  userId: string;
  worldId: string | null;
  world: { id: string; name: string; [key: string]: any } | null;
  gmWorlds: { id: string; name: string; description: string | null }[];
};

export async function getCampaignAccess(campaignId: string): Promise<CampaignAccessResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaignRaw, error } = await (supabase.from("campaigns") as any)
    .select("*")
    .eq("id", campaignId)
    .single();

  if (error || !campaignRaw) notFound();
  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null; [key: string]: any };
  const isGM = campaign.gm_id === user.id || (campaign as any).owner_id === user.id;

  let isAcceptedMember = false;
  if (!isGM) {
    const { data: membership } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .single();
    isAcceptedMember = ["Accepted", "Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"].includes((membership as any)?.status ?? "");
  }

  const hasAccess = isGM || isAcceptedMember;
  if (!hasAccess) redirect("/dashboard");

  const worldId = campaign.world_id ?? null;
  let world: CampaignAccessResult["world"] = null;
  if (worldId) {
    const { data: worldRaw } = await (supabase.from("worlds") as any)
      .select("id, name, description")
      .eq("id", worldId)
      .single();
    world = worldRaw as CampaignAccessResult["world"];
  }

  let gmWorlds: { id: string; name: string; description: string | null }[] = [];
  if (isGM && !world) {
    const { getWorldsByGm } = await import("./world-queries");
    gmWorlds = await getWorldsByGm(user.id);
  }

  return {
    campaignId,
    campaign,
    isGM,
    hasAccess,
    userId: user.id,
    worldId,
    world,
    gmWorlds,
  };
}
