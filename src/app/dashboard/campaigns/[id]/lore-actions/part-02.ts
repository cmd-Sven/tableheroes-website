/**
 * lore-actions — part 2: getLoreById, getChildLocationsForOnboarding, getChildLoreEntries, getLoreEntriesForParentByWorld, getOrphanedLoreEntriesByWorld, getLoreEntriesForParent, getOrphanedLoreEntries.
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
  PLAYER_LORE_MEMBER_STATUSES,
  GetLoreByIdOptions
} from "./_shared";


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
