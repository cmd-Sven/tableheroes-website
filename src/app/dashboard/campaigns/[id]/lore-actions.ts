"use server";

import { createClient } from "@/src/lib/supabase/server";
import { BUILDING_LOCATION_TYPES } from "@/src/lib/lore-types";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "./campaign-visibility-queries";
import { setCampaignVisibility } from "./campaign-visibility-actions";

/**
 * Server Actions für World Lore (Hierarchical)
 * world_id kommt immer aus der Kampagne (campaign.world_id).
 */

type AdditionalImageItem = {
  url: string;
  description: string;
  display?: ReturnType<typeof imageDisplayToJson> | null;
};

/** Normalisiert additional_images für JSONB: Array beibehalten, String parsen, sonst null. */
function normalizeAdditionalImages(
  value: unknown
): Array<AdditionalImageItem> | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => {
        const raw = item as Record<string, unknown>;
        const url = typeof raw?.url === "string" ? raw.url : "";
        const description = typeof raw?.description === "string" ? raw.description : "";
        const displayRaw = raw?.display;
        const display =
          displayRaw != null && typeof displayRaw === "object"
            ? imageDisplayToJson(normalizeImageDisplay(displayRaw))
            : undefined;
        const base: AdditionalImageItem = { url, description };
        if (display) base.display = display;
        return base;
      })
      .filter((item) => item.url.trim() !== "");
    return arr.length > 0 ? arr : null;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? normalizeAdditionalImages(parsed) : null;
    } catch {
      return null;
    }
  }
  return null;
}

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

// Get All Lore Entries: lore-queries.ts (RSC) – hier keine Duplikation.

/** Status, in denen Spieler Kampagnen-Inhalte sehen dürfen. */
const PLAYER_LORE_MEMBER_STATUSES = [
  "Approved",
  "Active",
  "Drafting",
  "In_Review",
  "Changes_Proposed",
] as const;

export type GetLoreByIdOptions = {
  /**
   * Aus dem Kampagnen-Kontext übergeben: prüft Mitgliedschaft nur für diese Kampagne.
   * Ohne diese Option: alle Kampagnen mit derselben world_id — bei mehreren Treffern
   * lieferte `.maybeSingle()` einen Fehler → fälschlich 404 auf der Lore-Detailseite.
   */
  campaignId?: string;
};

// Get Single Lore Entry by ID (Zugriff: GM der Welt oder Spieler in Kampagne mit dieser Welt)
export async function getLoreById(loreId: string, options?: GetLoreByIdOptions) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: lore, error } = await (supabase.from("world_lore") as any)
    .select("*")
    .eq("id", loreId)
    .single();

  if (error || !lore) {
    console.error("Fetch Lore Error:", error);
    throw new Error(error?.message || "Lore-Eintrag nicht gefunden.");
  }

  // GM-Check separat (worlds-Tabelle hat eigene RLS)
  const { data: worldRow } = await (supabase.from("worlds") as any)
    .select("gm_id")
    .eq("id", lore.world_id)
    .maybeSingle();

  if (worldRow && (worldRow as any).gm_id === user.id) {
    return lore;
  }

  // Spieler aus Kampagnen-URL: nur diese eine Kampagne prüfen (robust bei mehreren Welten-Kampagnen)
  if (options?.campaignId) {
    const { data: campaignRow } = await (supabase.from("campaigns") as any)
      .select("id, world_id, gm_id")
      .eq("id", options.campaignId)
      .maybeSingle();
    const camp = campaignRow as { id: string; world_id: string | null; gm_id: string } | null;
    if (!camp?.world_id || camp.world_id !== lore.world_id) {
      throw new Error("Lore-Eintrag gehört nicht zu dieser Kampagne.");
    }
    if (camp.gm_id === user.id) {
      return lore;
    }
    const { data: membership, error: memErr } = await (supabase.from("campaign_members") as any)
      .select("id")
      .eq("campaign_id", options.campaignId)
      .eq("user_id", user.id)
      .in("status", [...PLAYER_LORE_MEMBER_STATUSES])
      .maybeSingle();
    if (memErr) {
      console.error("[getLoreById] membership:", memErr);
    }
    if (!membership) {
      throw new Error("Kein Zugriff auf diesen Lore-Eintrag.");
    }
    return lore;
  }

  // Fallback (z. B. Welt-Dashboard): irgendeine Kampagne mit dieser Welt — höchstens eine Zeile
  const { data: campaignsWithWorld } = await (supabase.from("campaigns") as any)
    .select("id")
    .eq("world_id", lore.world_id);
  const campaignIds = (campaignsWithWorld || []).map((c: { id: string }) => c.id);
  if (campaignIds.length === 0) throw new Error("Lore-Eintrag nicht gefunden.");
  const { data: memberRows, error: multiErr } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("user_id", user.id)
    .in("campaign_id", campaignIds)
    .in("status", [...PLAYER_LORE_MEMBER_STATUSES])
    .limit(1);
  if (multiErr) {
    console.error("[getLoreById] campaign_members:", multiErr);
  }
  if (!memberRows?.length) {
    throw new Error("Kein Zugriff auf diesen Lore-Eintrag.");
  }

  return lore;
}

// ============================================================================
// Get Child Locations for Onboarding (Gebäude/Institutionen unter einem Ort)
// ============================================================================
export async function getChildLocationsForOnboarding(campaignId: string, parentId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { world_id: string | null } | null;
  if (!campaign?.world_id) return [];

  const { data: children, error } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("world_id", campaign.world_id)
    .eq("parent_id", parentId)
    .eq("allow_pc_origin", true)
    .in("type", [...BUILDING_LOCATION_TYPES])
    .order("name", { ascending: true });

  if (error) {
    console.error("getChildLocationsForOnboarding Error:", error);
    return [];
  }
  const visibility = await getVisibilityForCampaign(campaignId, "lore");
  return ((children || []) as { id: string; name: string; type: string }[]).filter(
    (c) => visibility[c.id] === true,
  );
}

// ============================================================================
// Get Child Lore Entries (Sub-regions/places)
// Optional campaignId: wenn gesetzt, wird is_revealed aus campaign_visibility gemerged.
// ============================================================================
export async function getChildLoreEntries(
  parentId: string,
  campaignId?: string,
  isGM = false,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: favorites } = await (supabase.from("lore_favorites") as any)
    .select("lore_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { lore_id: string }) => f.lore_id));

  const { data: children, error } = await (supabase.from("world_lore") as any)
    .select("id, name, type, image_url, created_at")
    .eq("parent_id", parentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fetch Child Lore Entries Error:", {
      message: (error as { message?: string }).message,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
    });
    return [];
  }

  let list = (children || []) as any[];
  if (campaignId) {
    const visibility = await getVisibilityForCampaign(campaignId, "lore");
    list = list.map((entry: any) => ({
      ...entry,
      is_revealed: visibility[entry.id] ?? false,
    }));
    if (!isGM) {
      list = list.filter((entry: any) => entry.is_revealed);
    }
  } else {
    list = list.map((entry: any) => ({ ...entry, is_revealed: false }));
  }

  const childIds = list.map((c: any) => c.id);
  let latestSecretDiscoveredAt: Record<string, string> = {};

  if (childIds.length > 0) {
    const { data: recentSecrets } = await (supabase.from("secrets") as any)
      .select("entity_id, discovered_at")
      .eq("entity_type", "lore")
      .in("entity_id", childIds)
      .not("discovered_at", "is", null)
      .order("discovered_at", { ascending: false });

    if (recentSecrets) {
      for (const secret of recentSecrets as any[]) {
        const loreEntityId = secret.entity_id as string | undefined;
        if (loreEntityId && !latestSecretDiscoveredAt[loreEntityId]) {
          latestSecretDiscoveredAt[loreEntityId] = secret.discovered_at;
        }
      }
    }
  }

  return list.map((entry: any) => {
    const hasRecentSecret = latestSecretDiscoveredAt[entry.id]
      ? (Date.now() - new Date(latestSecretDiscoveredAt[entry.id]).getTime()) / (1000 * 60 * 60) < 48
      : false;
    const isNew = entry.created_at
      ? (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60) < 48
      : false;

    return {
      ...entry,
      is_favorite: favoriteIds.has(entry.id),
      latest_secret_discovered_at: latestSecretDiscoveredAt[entry.id] || null,
      has_recent_secret: hasRecentSecret && !isNew,
    };
  });
}

// ============================================================================
// Get Lore Entries for Parent Selection (by world - für World Lore Detail)
// ============================================================================
export async function getLoreEntriesForParentByWorld(worldId: string, excludeId?: string) {
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

  let query = (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("world_id", worldId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (excludeId) query = query.neq("id", excludeId);

  const { data: lore, error } = await query;
  if (error) {
    console.error("getLoreEntriesForParentByWorld Error:", error);
    return [];
  }

  if (excludeId) {
    const descendants: string[] = [];
    let currentLevel = [excludeId];
    while (currentLevel.length > 0) {
      const { data: children } = await (supabase.from("world_lore") as any)
        .select("id")
        .in("parent_id", currentLevel);
      if (children?.length) {
        const ids = (children as any[]).map((c: any) => c.id);
        descendants.push(...ids);
        currentLevel = ids;
      } else break;
    }
    if (descendants.length) {
      return (lore || []).filter((l: any) => !descendants.includes(l.id));
    }
  }
  return lore || [];
}

// ============================================================================
// Get Orphaned Lore Entries (by world - für World Lore Detail)
// ============================================================================
export async function getOrphanedLoreEntriesByWorld(worldId: string, excludeId?: string) {
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

  let query = (supabase.from("world_lore") as any)
    .select("id, name, type, image_url")
    .eq("world_id", worldId)
    .is("parent_id", null)
    .order("name", { ascending: true });

  if (excludeId) query = query.neq("id", excludeId);

  const { data: lore, error } = await query;
  if (error) {
    console.error("getOrphanedLoreEntriesByWorld Error:", error);
    return [];
  }
  return lore ?? [];
}

// ============================================================================
// Get Lore Entries for Parent Selection (all types, excluding current entry and its children)
// ============================================================================
export async function getLoreEntriesForParent(campaignId: string, excludeId?: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { world_id: string | null } | null;
  if (!campaign?.world_id) return [];

  let query = (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("world_id", campaign.world_id)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data: lore, error } = await query;

  if (error) {
    console.error("Fetch Lore Entries for Parent Error:", error);
    return [];
  }

  // 3. Exclude all descendants of the current entry (prevent circular references)
  if (excludeId) {
    const descendants: string[] = [];
    let currentLevel = [excludeId];
    
    while (currentLevel.length > 0) {
      const { data: children } = await (supabase.from("world_lore") as any)
        .select("id")
        .in("parent_id", currentLevel);
      
      if (children && children.length > 0) {
        const childIds = (children as any[]).map((c: any) => c.id);
        descendants.push(...childIds);
        currentLevel = childIds;
      } else {
        break;
      }
    }
    
    if (descendants.length > 0) {
      return (lore || []).filter((l: any) => !descendants.includes(l.id));
    }
  }

  return lore || [];
}

// ============================================================================
// Get Orphaned Lore Entries (entries without parent_id)
// ============================================================================
export async function getOrphanedLoreEntries(campaignId: string, excludeId?: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { world_id: string | null } | null;
  if (!campaign?.world_id) return [];

  let query = (supabase.from("world_lore") as any)
    .select("id, name, type, image_url")
    .eq("world_id", campaign.world_id)
    .is("parent_id", null)
    .order("name", { ascending: true });

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data: lore, error } = await query;

  if (error) {
    console.error("Fetch Orphaned Lore Entries Error:", error);
    return [];
  }

  return lore || [];
}

// ============================================================================
// Get Breadcrumb Path (recursive parent chain)
// ============================================================================
export async function getLoreBreadcrumb(loreId: string): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const breadcrumb: Array<{ id: string; name: string }> = [];
  let currentId: string | null = loreId;
  const visited = new Set<string>(); // Prevent infinite loops

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const { data: loreEntry }: { data: any } = await (supabase.from("world_lore") as any)
      .select("id, name, parent_id")
      .eq("id", currentId)
      .single();

    if (!loreEntry) break;

    breadcrumb.unshift({ id: loreEntry.id, name: loreEntry.name });
    currentId = loreEntry.parent_id;
  }

  return breadcrumb;
}

// ============================================================================
// Toggle Lore Favorite
// ============================================================================
export async function toggleLoreFavorite(loreId: string, isFavorite: boolean) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("id")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  if (isFavorite) {
    // Remove favorite
    const { error } = await (supabase.from("lore_favorites") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("lore_id", loreId);

    if (error) {
      console.error("Remove Favorite Error:", error);
      throw new Error(error.message);
    }
  } else {
    // Add favorite
    const { error } = await (supabase.from("lore_favorites") as any)
      .insert({
        user_id: user.id,
        lore_id: loreId,
      });

    if (error) {
      console.error("Add Favorite Error:", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard");
}



