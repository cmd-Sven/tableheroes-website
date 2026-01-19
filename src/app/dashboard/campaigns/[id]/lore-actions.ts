"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für World Lore (Hierarchical)
 * 
 * Unterstützt:
 * - Create Lore Entry (with optional parent_id)
 * - Update Lore Entry
 * - Delete Lore Entry (cascading)
 * - Toggle Reveal Status
 * - Get All Lore Entries (flat list for tree reconstruction)
 */

// ============================================================================
// Create Lore Entry
// ============================================================================
export async function createLoreEntry(formData: {
  campaign_id: string;
  name: string;
  type: string;
  parent_id?: string | null;
  image_url?: string;
  additional_images?: Array<{ url: string; description: string }> | null;
  description?: string;
  gm_notes?: string;
  is_revealed?: boolean;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", formData.campaign_id)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Lore-Einträge erstellen.");
  }

  // 3. Get world_id for this campaign
  // IMPORTANT: Every lore entry MUST have a world_id, even if parent_id is null (world root level)
  const { data: world } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", formData.campaign_id)
    .single();

  if (!world) {
    throw new Error("Für diese Kampagne existiert noch keine Welt. Bitte erstelle zuerst eine Welt.");
  }

  // 4. Insert Lore Entry
  // Note: world_id is ALWAYS set, even when parent_id is null (entry is at world root level)
  const { data: loreEntry, error } = await (supabase.from("world_lore") as any)
    .insert({
      campaign_id: formData.campaign_id,
      world_id: world.id, // ALWAYS set - required for all entries
      name: formData.name,
      type: formData.type,
      parent_id: formData.parent_id || null, // null = world root level
      image_url: formData.image_url || null,
      additional_images: formData.additional_images || null,
      description: formData.description || null,
      gm_notes: formData.gm_notes || null,
      is_revealed: formData.is_revealed ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Create Lore Entry Error:", error);
    throw new Error(error.message);
  }

  // 4. If this is a geographical location type, also insert into locations table
  const geographicalTypes = ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"];
  if (geographicalTypes.includes(formData.type)) {
    const { error: locationError } = await (supabase.from("locations") as any)
      .insert({
        id: loreEntry.id, // Use same ID as world_lore entry
        campaign_id: formData.campaign_id,
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

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
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
    is_revealed?: boolean;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Lore Entry to verify GM ownership and get current type
  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("campaign_id, type, campaigns!inner(gm_id)")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  const campaigns = lore.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Lore-Einträge bearbeiten.");
  }

  // 3. Prevent circular references (if changing parent)
  if (updates.parent_id && updates.parent_id === loreId) {
    throw new Error("Ein Eintrag kann nicht sein eigenes Elternelement sein.");
  }

  // 4. Update world_lore
  const { error } = await (supabase.from("world_lore") as any)
    .update(updates)
    .eq("id", loreId);

  if (error) {
    console.error("Update Lore Entry Error:", error);
    throw new Error(error.message);
  }

  // 5. Sync to locations table if this is a geographical type
  const geographicalTypes = ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"];
  const currentType = updates.type || lore.type;
  if (geographicalTypes.includes(currentType)) {
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

  revalidatePath(`/dashboard/campaigns/${lore.campaign_id}`);
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

  // 2. Fetch Lore Entry to verify GM ownership and get type
  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("campaign_id, type, campaigns!inner(gm_id)")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  const campaigns = lore.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Lore-Einträge löschen.");
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

  // 4. Delete from locations table first (if geographical type)
  const geographicalTypes = ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"];
  if (geographicalTypes.includes(lore.type)) {
    const { error: locationDeleteError } = await (supabase.from("locations") as any)
      .delete()
      .eq("id", loreId);

    if (locationDeleteError) {
      console.error("⚠️ [deleteLoreEntry] Failed to delete from locations table:", locationDeleteError);
      // Continue with world_lore deletion anyway
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

  revalidatePath(`/dashboard/campaigns/${lore.campaign_id}`);
}

// ============================================================================
// Toggle Reveal Status
// ============================================================================
export async function toggleLoreReveal(loreId: string, currentState: boolean) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Lore Entry to verify GM ownership
  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", loreId)
    .single();

  if (!lore) throw new Error("Lore-Eintrag nicht gefunden.");

  const campaigns = lore.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Sichtbarkeit ändern.");
  }

  // 3. Toggle
  const { error } = await (supabase.from("world_lore") as any)
    .update({ is_revealed: !currentState })
    .eq("id", loreId);

  if (error) {
    console.error("Toggle Lore Reveal Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${lore.campaign_id}`);
}

// ============================================================================
// Get All Lore Entries (Flat list for tree reconstruction in UI)
// ============================================================================
export async function getLoreEntries(campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch all lore entries for this campaign
  // RLS will filter based on user role (GM sees all, Player sees only revealed)
  const { data: lore, error } = await (supabase.from("world_lore") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch Lore Entries Error:", error);
    return [];
  }

  // 3. Fetch user's favorites
  const { data: favorites } = await (supabase.from("lore_favorites") as any)
    .select("lore_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { lore_id: string }) => f.lore_id));

  // 4. Fetch recent secrets for each lore entry (for UPDATE badge)
  const loreIds = (lore || []).map((l: any) => l.id);
  const { data: recentSecrets } = await (supabase.from("secrets") as any)
    .select("entity_id, created_at")
    .eq("entity_type", "lore")
    .in("entity_id", loreIds)
    .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()); // Last 48 hours

  const loreWithRecentSecrets = new Set(
    (recentSecrets || []).map((s: { entity_id: string }) => s.entity_id)
  );

  // 5. Enrich lore entries with favorite status and recent secret flag
  const enrichedLore = (lore || []).map((entry: any) => {
    const hasRecentSecret = loreWithRecentSecrets.has(entry.id);
    const isNew = entry.created_at
      ? (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60) < 48
      : false;

    return {
      ...entry,
      is_favorite: favoriteIds.has(entry.id),
      has_recent_secret: hasRecentSecret && !isNew, // Only show UPDATE if not NEW
    };
  });

  return enrichedLore;
}

// Get Single Lore Entry by ID
export async function getLoreById(loreId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Lore Entry
  const { data: lore, error } = await (supabase.from("world_lore") as any)
    .select("*")
    .eq("id", loreId)
    .single();

  if (error) {
    console.error("Fetch Lore Error:", error);
    throw new Error(error.message || "Lore-Eintrag nicht gefunden.");
  }

  return lore;
}

// ============================================================================
// Get Child Lore Entries (Sub-regions/places)
// ============================================================================
export async function getChildLoreEntries(parentId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch user's favorite lore IDs
  const { data: favorites } = await (supabase.from("lore_favorites") as any)
    .select("lore_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f: { lore_id: string }) => f.lore_id));

  // 3. Fetch Child Lore Entries
  const { data: children, error } = await (supabase.from("world_lore") as any)
    .select("id, name, type, image_url, is_revealed, created_at, published_at")
    .eq("parent_id", parentId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fetch Child Lore Entries Error:", error);
    return [];
  }

  // 4. Fetch recent secret discoveries for child entries
  const childIds = (children || []).map((c: any) => c.id);
  let latestSecretDiscoveredAt: Record<string, string> = {};

  if (childIds.length > 0) {
    const { data: recentSecrets } = await (supabase.from("secrets") as any)
      .select("lore_id, discovered_at")
      .in("lore_id", childIds)
      .not("discovered_at", "is", null)
      .order("discovered_at", { ascending: false });

    if (recentSecrets) {
      // Get the most recent discovery per lore entry
      for (const secret of recentSecrets as any[]) {
        if (secret.lore_id && !latestSecretDiscoveredAt[secret.lore_id]) {
          latestSecretDiscoveredAt[secret.lore_id] = secret.discovered_at;
        }
      }
    }
  }

  // 5. Enrich child entries with favorite status and recent secret flag
  return (children || []).map((entry: any) => {
    const hasRecentSecret = latestSecretDiscoveredAt[entry.id]
      ? (Date.now() - new Date(latestSecretDiscoveredAt[entry.id]).getTime()) / (1000 * 60 * 60) < 48
      : false;
    const isNew = entry.created_at || entry.published_at
      ? (Date.now() - new Date(entry.created_at || entry.published_at).getTime()) / (1000 * 60 * 60) < 48
      : false;

    return {
      ...entry,
      is_favorite: favoriteIds.has(entry.id),
      latest_secret_discovered_at: latestSecretDiscoveredAt[entry.id] || null,
      has_recent_secret: hasRecentSecret && !isNew, // Only show UPDATE if not NEW
    };
  });
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

  // 2. Fetch all Lore Entries (excluding current entry)
  let query = (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("campaign_id", campaignId)
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

  // 2. Fetch Lore Entries without parent_id (orphaned)
  let query = (supabase.from("world_lore") as any)
    .select("id, name, type, image_url")
    .eq("campaign_id", campaignId)
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

  // 2. Fetch Lore to get campaign_id
  const { data: lore } = await (supabase.from("world_lore") as any)
    .select("campaign_id")
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

  revalidatePath(`/dashboard/campaigns/${lore.campaign_id}?tab=lore`);
  revalidatePath(`/dashboard/campaigns/${lore.campaign_id}/lore/${loreId}`);
}



