import type { CampaignFatePointsRules } from "@/src/lib/campaign-rules/default-fate-points-rules";
import type { CampaignFlawRow } from "@/src/lib/campaign-rules/seed-campaign-flaws";

export const CAMPAIGN_RULES_PRESET_VERSION = 1 as const;

export type CampaignRulesPresetFlawSnapshot = {
  flaw_key: string;
  nr: number;
  name: string;
  main_disadvantage: string;
  small_advantage: string;
  description: string;
  effects: string;
  roleplay: string;
  is_enabled: boolean;
  is_custom: boolean;
  sort_order: number;
};

export type CampaignRulesPresetSnapshot = {
  version: typeof CAMPAIGN_RULES_PRESET_VERSION;
  flaws: CampaignRulesPresetFlawSnapshot[];
  fate_points: CampaignFatePointsRules;
};

export type CampaignRulesPresetListItem = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  flaw_count: number;
};

export function buildCampaignRulesPresetSnapshot(input: {
  flaws: CampaignFlawRow[];
  fatePointsRules: CampaignFatePointsRules;
}): CampaignRulesPresetSnapshot {
  return {
    version: CAMPAIGN_RULES_PRESET_VERSION,
    flaws: input.flaws.map((flaw) => ({
      flaw_key: flaw.flaw_key,
      nr: flaw.nr,
      name: flaw.name,
      main_disadvantage: flaw.main_disadvantage,
      small_advantage: flaw.small_advantage,
      description: flaw.description,
      effects: flaw.effects,
      roleplay: flaw.roleplay,
      is_enabled: flaw.is_enabled,
      is_custom: flaw.is_custom,
      sort_order: flaw.sort_order,
    })),
    fate_points: {
      fate_points_intro: input.fatePointsRules.fate_points_intro,
      fate_points_w10_rules: input.fatePointsRules.fate_points_w10_rules,
      fate_points_gm_notes: input.fatePointsRules.fate_points_gm_notes,
    },
  };
}

export function parseCampaignRulesPresetSnapshot(raw: unknown): CampaignRulesPresetSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== CAMPAIGN_RULES_PRESET_VERSION) return null;
  if (!Array.isArray(data.flaws)) return null;
  if (!data.fate_points || typeof data.fate_points !== "object") return null;

  const fate = data.fate_points as Record<string, unknown>;
  const flaws: CampaignRulesPresetFlawSnapshot[] = [];
  for (const item of data.flaws) {
    if (!item || typeof item !== "object") return null;
    const flaw = item as Record<string, unknown>;
    const flawKey = String(flaw.flaw_key ?? "").trim();
    const name = String(flaw.name ?? "").trim();
    if (!flawKey || !name) return null;
    flaws.push({
      flaw_key: flawKey,
      nr: Number(flaw.nr) || 0,
      name,
      main_disadvantage: String(flaw.main_disadvantage ?? ""),
      small_advantage: String(flaw.small_advantage ?? ""),
      description: String(flaw.description ?? ""),
      effects: String(flaw.effects ?? ""),
      roleplay: String(flaw.roleplay ?? ""),
      is_enabled: flaw.is_enabled !== false,
      is_custom: flaw.is_custom === true,
      sort_order: Number(flaw.sort_order) || 0,
    });
  }

  return {
    version: CAMPAIGN_RULES_PRESET_VERSION,
    flaws,
    fate_points: {
      fate_points_intro: String(fate.fate_points_intro ?? ""),
      fate_points_w10_rules: String(fate.fate_points_w10_rules ?? ""),
      fate_points_gm_notes: String(fate.fate_points_gm_notes ?? ""),
    },
  };
}
