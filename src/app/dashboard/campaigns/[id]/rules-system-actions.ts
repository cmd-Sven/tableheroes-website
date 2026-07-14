"use server";

import { revalidatePath } from "next/cache";
import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import type { CampaignFatePointsRules } from "@/src/lib/campaign-rules/default-fate-points-rules";
import {
  buildCampaignRulesPresetSnapshot,
  parseCampaignRulesPresetSnapshot,
} from "@/src/lib/campaign-rules/campaign-rules-preset-snapshot";

async function assertGm(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as { gm_id?: string; owner_id?: string | null } | null;
  if (!campaign || !isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der Spielleiter darf Regeln bearbeiten.");
  }

  const writeClient = tryCreateAdminClient() ?? supabase;
  return { supabase, writeClient, userId: user.id };
}

function revalidateRules(campaignId: string) {
  revalidatePath(`/dashboard/campaigns/${campaignId}/regelsystem`);
}

export async function updateCampaignFlaw(input: {
  campaignId: string;
  flawId: string;
  patch: {
    name?: string;
    nr?: number;
    main_disadvantage?: string;
    small_advantage?: string;
    description?: string;
    effects?: string;
    roleplay?: string;
    is_enabled?: boolean;
    sort_order?: number;
  };
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient } = await assertGm(input.campaignId);
    const { error } = await (writeClient.from("campaign_flaws") as any)
      .update({ ...input.patch, updated_at: new Date().toISOString() })
      .eq("id", input.flawId)
      .eq("campaign_id", input.campaignId);
    if (error) return { success: false, error: error.message };
    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function createCampaignFlaw(input: {
  campaignId: string;
  name: string;
  main_disadvantage: string;
  small_advantage: string;
  description: string;
  effects: string;
  roleplay: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient } = await assertGm(input.campaignId);
    const name = input.name.trim();
    if (!name) return { success: false, error: "Name ist erforderlich." };

    const flawKey = `custom_${Date.now()}`;
    const { data: maxRow } = await (writeClient.from("campaign_flaws") as any)
      .select("nr, sort_order")
      .eq("campaign_id", input.campaignId)
      .order("nr", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNr = (Number(maxRow?.nr) || 0) + 1;

    const { error } = await (writeClient.from("campaign_flaws") as any).insert({
      campaign_id: input.campaignId,
      flaw_key: flawKey,
      nr: nextNr,
      name,
      main_disadvantage: input.main_disadvantage.trim(),
      small_advantage: input.small_advantage.trim(),
      description: input.description.trim(),
      effects: input.effects.trim(),
      roleplay: input.roleplay.trim(),
      is_enabled: true,
      is_custom: true,
      sort_order: nextNr,
    });
    if (error) return { success: false, error: error.message };
    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Anlegen fehlgeschlagen." };
  }
}

export async function deleteCampaignFlaw(input: {
  campaignId: string;
  flawId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient } = await assertGm(input.campaignId);
    const { data: row } = await (writeClient.from("campaign_flaws") as any)
      .select("is_custom")
      .eq("id", input.flawId)
      .eq("campaign_id", input.campaignId)
      .maybeSingle();
    if (!row?.is_custom) {
      return { success: false, error: "Standard-Makel können nicht gelöscht, nur deaktiviert werden." };
    }
    const { error } = await (writeClient.from("campaign_flaws") as any)
      .delete()
      .eq("id", input.flawId)
      .eq("campaign_id", input.campaignId);
    if (error) return { success: false, error: error.message };
    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}

export async function updateCampaignFatePointsRules(input: {
  campaignId: string;
  rules: CampaignFatePointsRules;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient } = await assertGm(input.campaignId);
    const { error } = await (writeClient.from("campaign_rules_settings") as any).upsert({
      campaign_id: input.campaignId,
      fate_points_intro: input.rules.fate_points_intro,
      fate_points_w10_rules: input.rules.fate_points_w10_rules,
      fate_points_gm_notes: input.rules.fate_points_gm_notes,
      updated_at: new Date().toISOString(),
    });
    if (error) return { success: false, error: error.message };
    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

async function loadCampaignRulesSnapshotData(campaignId: string, writeClient: Awaited<ReturnType<typeof assertGm>>["writeClient"]) {
  const { data: flawRows, error: flawsError } = await (writeClient.from("campaign_flaws") as any)
    .select(
      "flaw_key, nr, name, main_disadvantage, small_advantage, description, effects, roleplay, is_enabled, is_custom, sort_order",
    )
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })
    .order("nr", { ascending: true });
  if (flawsError) throw new Error(flawsError.message);

  const { data: settingsRaw, error: settingsError } = await (writeClient.from("campaign_rules_settings") as any)
    .select("fate_points_intro, fate_points_w10_rules, fate_points_gm_notes")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (settingsError) throw new Error(settingsError.message);

  const defaults = {
    fate_points_intro: "",
    fate_points_w10_rules: "",
    fate_points_gm_notes: "",
  };

  return buildCampaignRulesPresetSnapshot({
    flaws: ((flawRows as Array<Record<string, unknown>>) ?? []).map((row) => ({
      id: "",
      campaign_id: campaignId,
      flaw_key: String(row.flaw_key ?? ""),
      nr: Number(row.nr) || 0,
      name: String(row.name ?? ""),
      main_disadvantage: String(row.main_disadvantage ?? ""),
      small_advantage: String(row.small_advantage ?? ""),
      description: String(row.description ?? ""),
      effects: String(row.effects ?? ""),
      roleplay: String(row.roleplay ?? ""),
      is_enabled: row.is_enabled !== false,
      is_custom: row.is_custom === true,
      sort_order: Number(row.sort_order) || 0,
    })),
    fatePointsRules: settingsRaw
      ? {
          fate_points_intro: String(settingsRaw.fate_points_intro ?? ""),
          fate_points_w10_rules: String(settingsRaw.fate_points_w10_rules ?? ""),
          fate_points_gm_notes: String(settingsRaw.fate_points_gm_notes ?? ""),
        }
      : defaults,
  });
}

export async function saveCampaignRulesPreset(input: {
  campaignId: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient, userId } = await assertGm(input.campaignId);
    const name = input.name.trim();
    if (!name) return { success: false, error: "Bitte einen Namen für die Vorlage eingeben." };
    if (name.length > 120) {
      return { success: false, error: "Der Name darf maximal 120 Zeichen lang sein." };
    }

    const snapshot = await loadCampaignRulesSnapshotData(input.campaignId, writeClient);
    const now = new Date().toISOString();
    const { error } = await (writeClient.from("campaign_rules_presets") as any).insert({
      user_id: userId,
      name,
      snapshot,
      created_at: now,
      updated_at: now,
    });
    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Du hast bereits eine Vorlage mit diesem Namen." };
      }
      return { success: false, error: error.message };
    }

    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function importCampaignRulesPreset(input: {
  campaignId: string;
  presetId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient, userId } = await assertGm(input.campaignId);

    const { data: presetRaw, error: presetError } = await (writeClient.from("campaign_rules_presets") as any)
      .select("id, user_id, name, snapshot")
      .eq("id", input.presetId)
      .maybeSingle();
    if (presetError) return { success: false, error: presetError.message };
    if (!presetRaw || presetRaw.user_id !== userId) {
      return { success: false, error: "Regelvorlage nicht gefunden." };
    }

    const snapshot = parseCampaignRulesPresetSnapshot(presetRaw.snapshot);
    if (!snapshot) {
      return { success: false, error: "Die Regelvorlage ist ungültig oder veraltet." };
    }

    const { error: deleteError } = await (writeClient.from("campaign_flaws") as any)
      .delete()
      .eq("campaign_id", input.campaignId);
    if (deleteError) return { success: false, error: deleteError.message };

    if (snapshot.flaws.length > 0) {
      const now = new Date().toISOString();
      const rows = snapshot.flaws.map((flaw) => ({
        campaign_id: input.campaignId,
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
        created_at: now,
        updated_at: now,
      }));
      const { error: insertError } = await (writeClient.from("campaign_flaws") as any).insert(rows);
      if (insertError) return { success: false, error: insertError.message };
    }

    const { error: settingsError } = await (writeClient.from("campaign_rules_settings") as any).upsert({
      campaign_id: input.campaignId,
      fate_points_intro: snapshot.fate_points.fate_points_intro,
      fate_points_w10_rules: snapshot.fate_points.fate_points_w10_rules,
      fate_points_gm_notes: snapshot.fate_points.fate_points_gm_notes,
      updated_at: new Date().toISOString(),
    });
    if (settingsError) return { success: false, error: settingsError.message };

    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Import fehlgeschlagen." };
  }
}

export async function deleteCampaignRulesPreset(input: {
  campaignId: string;
  presetId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { writeClient, userId } = await assertGm(input.campaignId);

    const { data: presetRaw } = await (writeClient.from("campaign_rules_presets") as any)
      .select("id, user_id")
      .eq("id", input.presetId)
      .maybeSingle();
    if (!presetRaw || presetRaw.user_id !== userId) {
      return { success: false, error: "Regelvorlage nicht gefunden." };
    }

    const { error } = await (writeClient.from("campaign_rules_presets") as any)
      .delete()
      .eq("id", input.presetId)
      .eq("user_id", userId);
    if (error) return { success: false, error: error.message };

    revalidateRules(input.campaignId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}
