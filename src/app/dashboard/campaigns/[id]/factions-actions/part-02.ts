/**
 * factions-actions — part 2: updateFaction, updateFactionPlannedMemberNpcId, linkPlannedMemberByNameToNpc, deleteFaction, toggleFactionReveal, updateFactionAllowPcJoin, getFactionsByWorld, generateFactionForWorld, getFactions.
 */
"use server";

import { getFactionRelations } from "./part-03";
import { createFactionRelation } from "./part-03";
import { deleteFactionRelation } from "./part-03";

import { createClient } from "@/src/lib/supabase/server";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { revalidatePath } from "next/cache";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { resolveFactionImageMeta } from "@/src/lib/faction-image-meta";
import { setCampaignVisibility } from "../campaign-visibility-actions";

/**
 * Server Actions für Fraktionen (welt-zentrisch).
 * Fraktionen hängen an world_id. Sichtbarkeit pro Kampagne über campaign_visibility.
 */

// ============================================================================
// Create Faction (world_id oder campaign_id für Abwärtskompatibilität)
// ============================================================================

export async function updateFaction(
  factionId: string,
  updates: {
    name?: string;
    type?: string;
    current_status?: string;
    description?: string;
    image_url?: string;
    image_is_ai_generated?: boolean;
    image_upload_rights_confirmed?: boolean | null;
    banner_url?: string;
    banner_is_ai_generated?: boolean;
    banner_upload_rights_confirmed?: boolean | null;
    location_id?: string;
    hq_location_id?: string;
    gm_notes?: string;
    is_revealed?: boolean;
    appearance?: string;
    structure?: string;
    philosophy?: string;
    important_npcs_info?: string;
    planned_members?: Array<{ name: string; role: string; npc_id?: string }>;
    faction_relations?: Array<{
      target_faction_id: string;
      relation_type: string;
      description?: string | null;
    }>;
    image_display?: unknown | null;
    banner_display?: unknown | null;
    /** Erforderlich zum Sync von faction_relations (kampagnen-spezifisch). */
    campaign_id?: string;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("id, world_id, worlds!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { world_id: string; worlds: { gm_id: string } } | null;
  if (!faction) throw new Error("Fraktion nicht gefunden.");
  const worlds = faction.worlds as any;
  if (worlds.gm_id !== user.id) {
    throw new Error("Nur der GM dieser Welt kann Fraktionen bearbeiten.");
  }

  const {
    planned_members: pm,
    faction_relations: factionRelations,
    image_display: imageDisplayRaw,
    banner_display: bannerDisplayRaw,
    campaign_id: campaignIdForRelations,
    ...restUpdates
  } = updates;
  const updatePayload: Record<string, unknown> = { ...restUpdates };
  if (imageDisplayRaw !== undefined) {
    updatePayload.image_display =
      imageDisplayRaw == null
        ? null
        : imageDisplayToJson(normalizeImageDisplay(imageDisplayRaw));
  }
  if (bannerDisplayRaw !== undefined) {
    updatePayload.banner_display =
      bannerDisplayRaw == null
        ? null
        : imageDisplayToJson(normalizeImageDisplay(bannerDisplayRaw));
  }

  if (restUpdates.image_url !== undefined) {
    const emblemMeta = resolveFactionImageMeta(user.id, "emblem", {
      imageUrl: restUpdates.image_url,
      isAiGenerated: restUpdates.image_is_ai_generated as boolean | undefined,
      uploadRightsConfirmed: restUpdates.image_upload_rights_confirmed as boolean | null | undefined,
    });
    updatePayload.image_is_ai_generated = emblemMeta.image_is_ai_generated;
    updatePayload.image_upload_rights_confirmed = emblemMeta.image_upload_rights_confirmed;
  }

  if (restUpdates.banner_url !== undefined) {
    const bannerMeta = resolveFactionImageMeta(user.id, "banner", {
      imageUrl: restUpdates.banner_url,
      isAiGenerated: restUpdates.banner_is_ai_generated as boolean | undefined,
      uploadRightsConfirmed: restUpdates.banner_upload_rights_confirmed as boolean | null | undefined,
    });
    updatePayload.banner_is_ai_generated = bannerMeta.image_is_ai_generated;
    updatePayload.banner_upload_rights_confirmed = bannerMeta.image_upload_rights_confirmed;
  }

  if (pm !== undefined) {
    updatePayload.planned_members = Array.isArray(pm)
      ? pm.map((m) => ({ name: m.name || "", role: m.role || "Mitglied", npc_id: m.npc_id ?? null }))
      : [];
  }

  const { error } = await (supabase.from("factions") as any)
    .update(updatePayload)
    .eq("id", factionId);

  if (error) {
    console.error("Update Faction Error:", error);
    throw new Error(error.message);
  }

  if (campaignIdForRelations && factionRelations !== undefined) {
    const existing = await getFactionRelations(campaignIdForRelations, factionId);
    const desired = (factionRelations || []).filter(
      (rel) => rel.target_faction_id && rel.target_faction_id !== factionId,
    );
    const desiredPartnerIds = new Set(desired.map((rel) => rel.target_faction_id));

    for (const rel of existing) {
      if (!desiredPartnerIds.has(rel.partnerFactionId)) {
        await deleteFactionRelation(rel.id, campaignIdForRelations);
      }
    }

    for (const rel of desired) {
      await createFactionRelation(
        campaignIdForRelations,
        factionId,
        rel.target_faction_id,
        rel.relation_type,
        rel.description ?? null,
      );
    }

    revalidatePath(`/dashboard/campaigns/${campaignIdForRelations}`);
  }

  revalidatePath(`/dashboard/worlds/${faction.world_id}`);
}

// ============================================================================
// Update planned member with created NPC id (nach NPC-Generierung aus TODO)
// ============================================================================
export async function updateFactionPlannedMemberNpcId(
  factionId: string,
  memberIndex: number,
  npcId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("id, world_id, planned_members, worlds!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as {
    world_id: string;
    planned_members?: Array<{ name: string; role: string; npc_id?: string | null }>;
    worlds: { gm_id: string };
  } | null;
  if (!faction) throw new Error("Fraktion nicht gefunden.");
  const worlds = faction.worlds as { gm_id: string };
  if (worlds.gm_id !== user.id) {
    throw new Error("Nur der GM kann geplante Mitglieder verknüpfen.");
  }

  const list = Array.isArray(faction.planned_members) ? [...faction.planned_members] : [];
  if (memberIndex < 0 || memberIndex >= list.length) {
    throw new Error("Ungültiger Index für geplantes Mitglied.");
  }
  list[memberIndex] = { ...list[memberIndex], npc_id: npcId };

  const { error } = await (supabase.from("factions") as any)
    .update({ planned_members: list })
    .eq("id", factionId);

  if (error) {
    console.error("Update planned_members Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/worlds/${faction.world_id}`);
}

/**
 * Verknüpft ein geplantes Mitglied einer Fraktion (per Name) mit einem neu angelegten NPC.
 * Sucht den ersten Eintrag in planned_members mit passendem Namen und ohne npc_id und setzt npc_id.
 */
export async function linkPlannedMemberByNameToNpc(
  factionId: string,
  memberName: string,
  npcId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("id, world_id, planned_members, worlds!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as {
    world_id: string;
    planned_members?: Array<{ name: string; role: string; npc_id?: string | null }>;
    worlds: { gm_id: string };
  } | null;
  if (!faction) throw new Error("Fraktion nicht gefunden.");
  const worlds = faction.worlds as { gm_id: string };
  if (worlds.gm_id !== user.id) {
    throw new Error("Nur der GM kann geplante Mitglieder verknüpfen.");
  }

  const list = Array.isArray(faction.planned_members) ? [...faction.planned_members] : [];
  const normalizedSearch = memberName.trim().toLowerCase();
  const idx = list.findIndex(
    (m) =>
      !m.npc_id &&
      (m.name || "").trim().toLowerCase() === normalizedSearch
  );
  if (idx < 0) return;

  list[idx] = { ...list[idx], npc_id: npcId };

  const { error } = await (supabase.from("factions") as any)
    .update({ planned_members: list })
    .eq("id", factionId);

  if (error) {
    console.error("linkPlannedMemberByNameToNpc Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/worlds/${faction.world_id}`);
}

// ============================================================================
// Delete Faction
// ============================================================================
export async function deleteFaction(factionId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("id, world_id, worlds!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { world_id: string; worlds: { gm_id: string } } | null;
  if (!faction) throw new Error("Fraktion nicht gefunden.");
  const worlds = faction.worlds as any;
  if (worlds.gm_id !== user.id) {
    throw new Error("Nur der GM dieser Welt kann Fraktionen löschen.");
  }

  const { error } = await (supabase.from("factions") as any)
    .delete()
    .eq("id", factionId);

  if (error) {
    console.error("Delete Faction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/worlds/${faction.world_id}`);
}

// ============================================================================
// Toggle Reveal Status (pro Kampagne via campaign_visibility)
// ============================================================================
export async function toggleFactionReveal(
  campaignId: string,
  factionId: string,
  currentState: boolean
) {
  await setCampaignVisibility(campaignId, "faction", factionId, !currentState);
}

// ============================================================================
// Onboarding: Toggle allow_pc_join_on_creation (GM only)
// Tabelle: factions, Spalte: allow_pc_join_on_creation, ID: factions.id
// ============================================================================
export async function updateFactionAllowPcJoin(
  factionId: string,
  allow: boolean
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: factionRaw, error: fetchError } = await (supabase.from("factions") as any)
    .select("*, worlds!inner(gm_id)")
    .eq("id", factionId)
    .single();

  if (fetchError) {
    console.error("[updateFactionAllowPcJoin] Fetch faction error:", fetchError);
    throw new Error("Fraktion nicht gefunden oder kein Zugriff.");
  }
  const faction = factionRaw as { world_id: string; worlds: { gm_id: string } } | null;
  if (!faction) throw new Error("Fraktion nicht gefunden.");
  const worlds = faction.worlds as any;
  if (worlds.gm_id !== user.id) {
    throw new Error("Nur der GM dieser Welt kann die Onboarding-Einstellung ändern.");
  }

  const { data: updated, error } = await (supabase.from("factions") as any)
    .update({ allow_pc_join_on_creation: allow })
    .eq("id", factionId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateFactionAllowPcJoin] Update error:", error);
    throw new Error(error.message || "Speichern fehlgeschlagen.");
  }
  if (!updated) {
    console.error("[updateFactionAllowPcJoin] Update nicht bestätigt:", { factionId, allow, updated });
    throw new Error("Update konnte nicht bestätigt werden. Bitte Seite neu laden und erneut versuchen.");
  }
  revalidatePath(`/dashboard/worlds/${faction.world_id}`);
}

// ============================================================================
// Get Factions by World (GM-Zentrale)
// ============================================================================
export async function getFactionsByWorld(worldId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  if (!world || (world as { gm_id: string }).gm_id !== user.id) return [];

  const { data: factions, error } = await (supabase.from("factions") as any)
    .select("*")
    .eq("world_id", worldId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getFactionsByWorld Error:", error);
    return [];
  }

  const withCounts = await Promise.all(
    (factions || []).map(async (faction: any) => {
      const { count } = await (supabase.from("npcs") as any)
        .select("id", { count: "exact", head: true })
        .eq("faction_id", faction.id);
      return { ...faction, member_count: count || 0 };
    })
  );
  return withCounts;
}

// ============================================================================
// Generate Faction with AI (für World-Kontext, ohne Kampagne)
// ============================================================================
export async function generateFactionForWorld(worldId: string, userPrompt: string) {
  const { generateFactionForWorld: generateFromAI } = await import("../ai-actions");
  return generateFromAI(worldId, userPrompt);
}

// getFactionsWithMembers: factions-queries.ts

// ============================================================================
// Get Factions (simple list for dropdowns; world über campaign)
// ============================================================================
export async function getFactions(campaignId: string) {
  const supabase = await createClient();

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const worldId = (campaignRaw as { world_id: string | null } | null)?.world_id;
  if (!worldId) return [];

  const { data, error } = await (supabase.from("factions") as any)
    .select("id, name")
    .eq("world_id", worldId)
    .order("name");

  if (error) {
    console.error("Error fetching factions:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Get Faction by ID (with all related data)
// ============================================================================
