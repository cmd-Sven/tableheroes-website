"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import {
  type BeastDiscoveryKey,
  parseBeastDiscoveries,
} from "@/src/lib/beast-check-results";

async function assertGmCampaign(campaignId: string, userId: string) {
  const supabase = await createClient();
  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== userId) {
    throw new Error("Nur der Spielleiter kann Kreaturen-Status ändern.");
  }
  return campaign as { id: string; gm_id: string; world_id: string | null };
}

export type CampaignCreatureStateRow = {
  creature_id: string;
  discoveries: ReturnType<typeof parseBeastDiscoveries>;
  is_defeated: boolean;
  defeated_at: string | null;
};

export async function getCampaignCreatureStates(
  campaignId: string,
): Promise<Record<string, CampaignCreatureStateRow>> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("campaign_creature_state")
    .select("creature_id, discoveries, is_defeated, defeated_at")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("[getCampaignCreatureStates]", error);
    return {};
  }

  const map: Record<string, CampaignCreatureStateRow> = {};
  for (const row of (data || []) as Record<string, unknown>[]) {
    const id = String(row.creature_id ?? "");
    if (!id) continue;
    map[id] = {
      creature_id: id,
      discoveries: parseBeastDiscoveries(row.discoveries),
      is_defeated: row.is_defeated === true,
      defeated_at: row.defeated_at != null ? String(row.defeated_at) : null,
    };
  }
  return map;
}

export async function setCreatureDiscovery(
  campaignId: string,
  creatureId: string,
  key: BeastDiscoveryKey,
  discovered: boolean,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertGmCampaign(campaignId, user.id);

  const { data: existing } = await (supabase as any)
    .from("campaign_creature_state")
    .select("discoveries")
    .eq("campaign_id", campaignId)
    .eq("creature_id", creatureId)
    .maybeSingle();

  const discoveries = parseBeastDiscoveries(
    (existing as { discoveries?: unknown } | null)?.discoveries,
  );
  if (discovered) discoveries[key] = true;
  else delete discoveries[key];

  const { error } = await (supabase as any).from("campaign_creature_state").upsert(
    {
      campaign_id: campaignId,
      creature_id: creatureId,
      discoveries,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id,creature_id" },
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/session`);
}

export async function setCreatureDefeated(
  campaignId: string,
  creatureId: string,
  sessionId: string,
  defeated: boolean,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  await assertGmCampaign(campaignId, user.id);

  const { data: existing } = await (supabase as any)
    .from("campaign_creature_state")
    .select("discoveries")
    .eq("campaign_id", campaignId)
    .eq("creature_id", creatureId)
    .maybeSingle();

  const discoveries = parseBeastDiscoveries(
    (existing as { discoveries?: unknown } | null)?.discoveries,
  );

  const { error } = await (supabase as any).from("campaign_creature_state").upsert(
    {
      campaign_id: campaignId,
      creature_id: creatureId,
      discoveries,
      is_defeated: defeated,
      defeated_at: defeated ? new Date().toISOString() : null,
      defeated_session_id: defeated ? sessionId : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id,creature_id" },
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/session`);
}
