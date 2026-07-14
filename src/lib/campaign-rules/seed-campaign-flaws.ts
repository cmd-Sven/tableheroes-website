import { CHARACTER_FLAWS } from "@/src/lib/characters/character-flaws";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CampaignFlawRow = {
  id: string;
  campaign_id: string;
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

export function mapCharacterFlawToInsert(campaignId: string, flaw: (typeof CHARACTER_FLAWS)[number]) {
  return {
    campaign_id: campaignId,
    flaw_key: flaw.id,
    nr: flaw.nr,
    name: flaw.name,
    main_disadvantage: flaw.mainDisadvantage,
    small_advantage: flaw.smallAdvantage,
    description: flaw.description,
    effects: flaw.effects,
    roleplay: flaw.roleplay,
    is_enabled: true,
    is_custom: false,
    sort_order: flaw.nr,
  };
}

/** Legt Standard-Makel an, falls die Kampagne noch keinen Katalog hat. */
export async function ensureCampaignFlawsSeeded(
  client: SupabaseClient,
  campaignId: string,
): Promise<void> {
  const { count, error: countError } = await (client.from("campaign_flaws") as any)
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (countError) {
    console.warn("[ensureCampaignFlawsSeeded] count failed:", countError.message);
    return;
  }
  if ((count ?? 0) > 0) return;

  const rows = CHARACTER_FLAWS.map((f) => mapCharacterFlawToInsert(campaignId, f));
  const { error } = await (client.from("campaign_flaws") as any).insert(rows);
  if (error) {
    console.warn("[ensureCampaignFlawsSeeded] insert failed:", error.message);
  }
}
