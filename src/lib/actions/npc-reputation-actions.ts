"use server";

import { isCampaignGm } from "@/src/lib/campaign-gm";
import { createClient } from "@/src/lib/supabase/server";

type ReputationRow = {
  id: string;
  campaign_id: string;
  npc_id: string;
  reputation_score: number;
  created_at: string;
  updated_at: string;
};

export async function adjustNpcReputation(
  campaignId: string,
  npcId: string,
  amount: number,
): Promise<ReputationRow> {
  if (!campaignId || !npcId) {
    throw new Error("Kampagne oder NPC fehlt.");
  }

  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error("Der Ruf-Wert muss eine ganze Zahl ungleich 0 sein.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht authentifiziert.");
  }

  const { data: campaignRaw, error: campaignError } = await (supabase.from(
    "campaigns",
  ) as any)
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  if (campaignError) {
    throw new Error(campaignError.message || "Kampagne konnte nicht geladen werden.");
  }

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur GM oder Owner können den NPC-Ruf ändern.");
  }

  const { data, error } = await (supabase as any).rpc(
    "adjust_campaign_npc_reputation",
    {
      p_campaign_id: campaignId,
      p_npc_id: npcId,
      p_amount: amount,
    },
  );

  if (error) {
    throw new Error(error.message || "NPC-Ruf konnte nicht geändert werden.");
  }

  return data as ReputationRow;
}
