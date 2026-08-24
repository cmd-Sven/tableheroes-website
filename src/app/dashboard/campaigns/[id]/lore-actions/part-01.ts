/**
 * lore-actions — part 1: StoryLegendSection, createLoreEntry, updateLoreEntry, updateLoreAllowPcOrigin, deleteLoreEntry, toggleLoreReveal, getLoreEntriesByWorld.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { BUILDING_LOCATION_TYPES } from "@/src/lib/lore-types";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "../campaign-visibility-queries";
import { setCampaignVisibility } from "../campaign-visibility-actions";

/**
 * Server Actions für World Lore (Hierarchical)
 * world_id kommt immer aus der Kampagne (campaign.world_id).
 */

import {
  normalizeAdditionalImages
} from "./_shared";


// ============================================================================
// Create Lore Entry
// ============================================================================
export type StoryLegendSection = { dc: number; skill: string; content: string; is_revealed: boolean };


export async function createLoreEntry(formData: {
  campaign_id?: string;
  world_id?: string;
  name: string;
  type: string;
  parent_id?: string | null;
  image_url?: string;
  additional_images?: Array<{ url: string; description: string }> | null;
  description?: string;
  gm_notes?: string;
  allow_pc_origin?: boolean;
  stories_and_legends?: StoryLegendSection[] | null;
  /** Verknüpfte Religionen (world_lore.religion_ids) */
  religion_ids?: string[] | null;
  /** Verknüpfte Sprachen (world_lore.language_ids) */
  language_ids?: string[] | null;
  /** Verknüpfte Rassen (world_lore.race_ids) – primär für Kulturen */
  race_ids?: string[] | null;
  /** Zugeordnete Kultur (world_lore.culture_id) – primär für Orte/Regionen */
  culture_id?: string | null;
  /** Unterarten / Unterrassen (world_lore.race_subtypes) */
  race_subtypes?: string | null;
  /** Besondere Merkmale (world_lore.race_traits) */
  race_traits?: string | null;
  /** URL-Bild: Cover/Contain, Fokus, Letterbox-Farbe */
  image_display?: unknown;
  image_is_ai_generated?: boolean;
  image_upload_rights_confirmed?: boolean | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  let worldId: string;
  let campaignId: string | null = formData.campaign_id || null;

  if (formData.world_id) {
    const { data: world } = await (supabase.from("worlds") as any)
      .select("id, gm_id")
      .eq("id", formData.world_id)
      .single();
    if (!world || (world as { gm_id: string }).gm_id !== user.id) {
      throw new Error("Nur der GM dieser Welt kann Lore erstellen.");
    }
    worldId = formData.world_id;
  } else if (formData.campaign_id) {
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("id, gm_id, world_id")
      .eq("id", formData.campaign_id)
      .single();
    const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;
    if (!campaign || campaign.gm_id !== user.id) {
      throw new Error("Nur der GM kann Lore-Einträge erstellen.");
    }
    if (!campaign.world_id) {
      throw new Error("Diese Kampagne hat keine Basis-Welt. Bitte Welt in den Kampagnen-Einstellungen zuweisen.");
    }
    worldId = campaign.world_id;
  } else {
    throw new Error("Entweder campaign_id oder world_id angeben.");
  }

  const additionalImages = normalizeAdditionalImages(formData.additional_images);

  const insertPayload: Record<string, unknown> = {
    world_id: worldId,
    name: formData.name,
    type: formData.type,
    parent_id: formData.parent_id || null,
    image_url: formData.image_url || null,
    additional_images: additionalImages,
    image_display:
      formData.image_display != null
        ? imageDisplayToJson(normalizeImageDisplay(formData.image_display))
        : null,
    image_is_ai_generated: formData.image_is_ai_generated ?? false,
    image_upload_rights_confirmed: formData.image_upload_rights_confirmed ?? null,
    description: formData.description || null,
    gm_notes: formData.gm_notes || null,
    allow_pc_origin: formData.allow_pc_origin ?? false,
  };
  if (Array.isArray(formData.religion_ids)) {
    insertPayload.religion_ids = formData.religion_ids;
  }
  if (Array.isArray(formData.language_ids)) {
    insertPayload.language_ids = formData.language_ids;
  }
  if (Array.isArray(formData.race_ids)) {
    insertPayload.race_ids = formData.race_ids;
  }
  if (formData.culture_id !== undefined) {
    insertPayload.culture_id = formData.culture_id || null;
  }
  if (formData.race_subtypes !== undefined) {
    insertPayload.race_subtypes = formData.race_subtypes || null;
  }
  if (formData.race_traits !== undefined) {
    insertPayload.race_traits = formData.race_traits || null;
  }

  // Für Rassen: Sprachen aus verknüpfter Kultur erben, falls keine explizit gesetzt.
  if (
    formData.type === "Rasse" &&
    insertPayload.culture_id &&
    insertPayload.language_ids === undefined
  ) {
    const supabase = await createClient();
    const { data: cultureRow } = await (supabase.from("world_lore") as any)
      .select("language_ids")
      .eq("id", insertPayload.culture_id)
      .maybeSingle();
    if (cultureRow && (cultureRow as any).language_ids) {
      insertPayload.language_ids = (cultureRow as any).language_ids;
    }
  }
  if (formData.stories_and_legends != null && Array.isArray(formData.stories_and_legends)) {
    insertPayload.stories_and_legends = formData.stories_and_legends;
  }
  const { data: loreEntry, error } = await (supabase.from("world_lore") as any)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Create Lore Entry Error:", error);
    throw new Error(error.message);
  }

  // 4. If this is a location type, also insert into locations table
  const { isLocationType } = await import("@/src/lib/lore-types");
  if (isLocationType(formData.type)) {
    const { error: locationError } = await (supabase.from("locations") as any)
      .insert({
        id: loreEntry.id,
        world_id: worldId,
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        image_url: formData.image_url || null,
      });

    if (locationError) {
      console.error("⚠️ [createLoreEntry] Failed to sync to locations table:", locationError);
      // Don't throw error - world_lore entry was created successfully
      // This is a sync issue that can be fixed later
    } else {
      console.log("✅ [createLoreEntry] Location synced to locations table:", loreEntry.id);
    }
  }

  if (campaignId) revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard");
  return loreEntry;
}


// ============================================================================
// Update Lore Entry
// ============================================================================
export async function updateLoreEntry(
  loreId: string,
  updates: {
    name?: string;
    type?: string;
    parent_id?: string | null;
    image_url?: string;
    additional_images?: Array<{ url: string; description: string }> | null;
    description?: string;
    gm_notes?: string;
    stories_and_legends?: StoryLegendSection[] | null;
    religion_ids?: string[] | null;
    language_ids?: string[] | null;
    race_ids?: string[] | null;
    culture_id?: string | null;
    race_subtypes?: string | null;
    race_traits?: string | null;
    image_display?: unknown | null;
    image_is_ai_generated?: boolean;
    image_upload_rights_confirmed?: boolean | null;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Lore Entry and verify GM ownership via world
  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("world_id, type, worlds!inner(gm_id)")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  const worlds = lore.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann Lore-Einträge bearbeiten.");
  }

  // 3. Prevent circular references (if changing parent)
  if (updates.parent_id && updates.parent_id === loreId) {
    throw new Error("Ein Eintrag kann nicht sein eigenes Elternelement sein.");
  }

  const updatePayload: Record<string, unknown> = { ...updates };
  if ("additional_images" in updates) {
    updatePayload.additional_images = normalizeAdditionalImages(updates.additional_images);
  }
  if ("image_display" in updates) {
    const raw = updates.image_display;
    updatePayload.image_display =
      raw == null ? null : imageDisplayToJson(normalizeImageDisplay(raw));
  }

  const { error } = await (supabase.from("world_lore") as any)
    .update(updatePayload)
    .eq("id", loreId);

  if (error) {
    console.error("Update Lore Entry Error:", error);
    throw new Error(error.message);
  }

  // 5. Sync to locations table if this is a location type
  const { isLocationType } = await import("@/src/lib/lore-types");
  const currentType = updates.type || lore.type;
  if (isLocationType(currentType)) {
    const locationUpdates: any = {};
    if (updates.name !== undefined) locationUpdates.name = updates.name;
    if (updates.type !== undefined) locationUpdates.type = updates.type;
    if (updates.description !== undefined) locationUpdates.description = updates.description;
    if (updates.image_url !== undefined) locationUpdates.image_url = updates.image_url;

    if (Object.keys(locationUpdates).length > 0) {
      const { error: locationError } = await (supabase.from("locations") as any)
        .update(locationUpdates)
        .eq("id", loreId);

      if (locationError) {
        console.error("⚠️ [updateLoreEntry] Failed to sync to locations table:", locationError);
        // Don't throw error - world_lore update was successful
      } else {
        console.log("✅ [updateLoreEntry] Location synced to locations table:", loreId);
      }
    }
  }

  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard");
}


// ============================================================================
// Onboarding: Toggle allow_pc_origin (GM only) – Heimatort im Charakter-Wizard
// Tabelle: world_lore, Spalte: allow_pc_origin, ID: world_lore.id
// ============================================================================
export async function updateLoreAllowPcOrigin(loreId: string, allow: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: lore, error: fetchError } = await (supabase.from("world_lore") as any)
    .select("id, world_id, allow_pc_origin, worlds!inner(gm_id)")
    .eq("id", loreId)
    .single();

  if (fetchError) {
    console.error("[updateLoreAllowPcOrigin] Fetch lore error:", fetchError);
    throw new Error("Lore-Eintrag nicht gefunden oder kein Zugriff.");
  }
  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");
  const worlds = lore.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann die Onboarding-Einstellung ändern.");
  }

  const { data: updated, error } = await (supabase.from("world_lore") as any)
    .update({ allow_pc_origin: allow })
    .eq("id", loreId)
    .select("id, allow_pc_origin")
    .single();

  if (error) {
    console.error("[updateLoreAllowPcOrigin] Update error:", error);
    throw new Error(error.message || "Speichern fehlgeschlagen.");
  }
  if (!updated || (updated as any).allow_pc_origin !== allow) {
    console.error("[updateLoreAllowPcOrigin] Update nicht bestätigt:", { loreId, allow, updated });
    throw new Error("Update konnte nicht bestätigt werden. Bitte Seite neu laden und erneut versuchen.");
  }
  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard");
}


// ============================================================================
// Delete Lore Entry
// ============================================================================
export async function deleteLoreEntry(loreId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Lore Entry and verify GM ownership via world
  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("world_id, type, worlds!inner(gm_id)")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  const worlds = lore.worlds as { gm_id: string } | undefined;
  if (!worlds || worlds.gm_id !== user.id) {
    throw new Error("Nur der GM der Welt kann Lore-Einträge löschen.");
  }

  // 3. Check for children
  const { data: children } = await (supabase.from("world_lore") as any)
    .select("id")
    .eq("parent_id", loreId);

  if (children && children.length > 0) {
    throw new Error(
      `Dieser Eintrag hat ${children.length} Unterelement(e). Bitte lösche oder verschiebe diese zuerst.`
    );
  }

  // 4. Delete from locations table first (if location type)
  const { isLocationType } = await import("@/src/lib/lore-types");
  if (isLocationType(lore.type)) {
    const { error: locationDeleteError } = await (supabase.from("locations") as any)
      .delete()
      .eq("id", loreId);

    if (locationDeleteError) {
      console.error("⚠️ [deleteLoreEntry] Failed to delete from locations table:", locationDeleteError);
    } else {
      console.log("✅ [deleteLoreEntry] Location deleted from locations table:", loreId);
    }
  }

  // 5. Delete from world_lore
  const { error } = await (supabase.from("world_lore") as any).delete().eq("id", loreId);

  if (error) {
    console.error("Delete Lore Entry Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard");
}


// ============================================================================
// Toggle Reveal Status (pro Kampagne via campaign_visibility)
// ============================================================================
export async function toggleLoreReveal(campaignId: string, loreId: string, currentRevealed: boolean) {
  await setCampaignVisibility(campaignId, "lore", loreId, !currentRevealed);
}


// ============================================================================
// Get All Lore Entries by World (GM-Zentrale: keine Kampagne, keine Filterung)
// ============================================================================
export async function getLoreEntriesByWorld(worldId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();

  if (!world || (world as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM dieser Welt kann Lore laden.");
  }

  const { data: lore, error } = await (supabase.from("world_lore") as any)
    .select("*")
    .eq("world_id", worldId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch Lore Entries by World Error:", error);
    return [];
  }

  return (lore || []).map((entry: any) => ({
    ...entry,
    is_revealed: false,
  }));
}
