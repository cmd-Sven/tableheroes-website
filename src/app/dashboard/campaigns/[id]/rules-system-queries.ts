"use server";

import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  defaultFatePointsRules,
  type CampaignFatePointsRules,
} from "@/src/lib/campaign-rules/default-fate-points-rules";
import {
  ensureCampaignFlawsSeeded,
  type CampaignFlawRow,
} from "@/src/lib/campaign-rules/seed-campaign-flaws";
import type {
  CampaignRulesPresetListItem,
} from "@/src/lib/campaign-rules/campaign-rules-preset-snapshot";
import { parseCampaignRulesPresetSnapshot } from "@/src/lib/campaign-rules/campaign-rules-preset-snapshot";

export type CampaignRulesSystemPayload = {
  campaignId: string;
  campaignName: string;
  isGM: boolean;
  flaws: CampaignFlawRow[];
  fatePointsRules: CampaignFatePointsRules;
  presets: CampaignRulesPresetListItem[];
};

async function getWriteClientForSeed() {
  return tryCreateAdminClient() ?? (await createClient());
}

export async function loadCampaignRulesSystem(
  campaignId: string,
): Promise<CampaignRulesSystemPayload | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as {
    id: string;
    name: string;
    gm_id: string;
    owner_id?: string | null;
  } | null;
  if (!campaign) return null;

  const isGM = isCampaignGm(campaign, user.id);

  const seedClient = await getWriteClientForSeed();
  await ensureCampaignFlawsSeeded(seedClient, campaignId);

  const defaults = defaultFatePointsRules();
  const { data: settingsRaw } = await (supabase.from("campaign_rules_settings") as any)
    .select("fate_points_intro, fate_points_w10_rules, fate_points_gm_notes")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  let fatePointsRules: CampaignFatePointsRules = { ...defaults };
  if (settingsRaw) {
    fatePointsRules = {
      fate_points_intro: String(settingsRaw.fate_points_intro ?? defaults.fate_points_intro),
      fate_points_w10_rules: String(
        settingsRaw.fate_points_w10_rules ?? defaults.fate_points_w10_rules,
      ),
      fate_points_gm_notes: String(settingsRaw.fate_points_gm_notes ?? defaults.fate_points_gm_notes),
    };
  } else if (isGM) {
    const writeClient = tryCreateAdminClient() ?? supabase;
    await (writeClient.from("campaign_rules_settings") as any).upsert({
      campaign_id: campaignId,
      ...defaults,
      updated_at: new Date().toISOString(),
    });
  }

  const { data: flawRows } = await (supabase.from("campaign_flaws") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })
    .order("nr", { ascending: true });

  const flaws = ((flawRows as CampaignFlawRow[]) ?? []).map((row) => ({
    ...row,
    nr: Number(row.nr) || 0,
    sort_order: Number(row.sort_order) || 0,
    is_enabled: row.is_enabled !== false,
    is_custom: row.is_custom === true,
  }));

  let presets: CampaignRulesPresetListItem[] = [];
  if (isGM) {
    const { data: presetRows } = await (supabase.from("campaign_rules_presets") as any)
      .select("id, name, snapshot, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    presets = ((presetRows as Array<{
      id: string;
      name: string;
      snapshot: unknown;
      created_at: string;
      updated_at: string;
    }>) ?? []).map((row) => {
      const snapshot = parseCampaignRulesPresetSnapshot(row.snapshot);
      return {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        updated_at: row.updated_at,
        flaw_count: snapshot?.flaws.length ?? 0,
      };
    });
  }

  return {
    campaignId,
    campaignName: campaign.name,
    isGM,
    flaws,
    fatePointsRules,
    presets,
  };
}
