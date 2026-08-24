/**
 * npc-actions — part 3: getNPCsByFactionForOnboarding, getNPCsForAnalysis, getNPCsByWorld, getNPCById, getNPCNarrativeHooks, toggleNPCFavorite, updateNPCNotes, searchAllNPCs.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getVisibilityForCampaign } from "../campaign-visibility-queries";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { resolveNpcPortraitMetaForServer } from "@/src/lib/npc-portrait-meta";

/**
 * Server Actions für NPCs
 * 
 * Unterstützt:
 * - Create NPC
 * - Update NPC
 * - Delete NPC
 * - Toggle Reveal Status
 * - Get NPCs (with Faction Join)
 */

// ============================================================================
// Create NPC
// ============================================================================
import { NarrativeHook } from "@/src/types/npc";
import { imageDisplayToJson, normalizeImageDisplay } from "@/src/lib/image-display";


// ============================================================================
// Nur NPCs, die in dieser Kampagne für Spieler freigegeben sind UND für Onboarding markiert sind
// ============================================================================
export async function getNPCsByFactionForOnboarding(campaignId: string, factionId: string) {
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

  const { data: npcsRaw, error } = await (supabase.from("npcs") as any)
    .select("id, name, title, role, allow_pc_onboarding")
    .eq("world_id", campaign.world_id)
    .eq("faction_id", factionId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getNPCsByFactionForOnboarding Error:", error);
    return [];
  }

  const visibility = await getVisibilityForCampaign(campaignId, "npc");
  const npcs = (npcsRaw || []).filter(
    (npc: any) => visibility[npc.id] === true && npc.allow_pc_onboarding === true,
  );
  return npcs.map((n: any) => ({ id: n.id, name: n.name, title: n.title, role: n.role })) as { id: string; name: string; title: string | null; role: string | null }[];
}


// ============================================================================
// Get NPCs (with Faction Join, Quests, Favorites)
// ============================================================================
// ============================================================================
// Get NPCs for Analysis (Simplified version for AI analysis)
// ============================================================================
export async function getNPCsForAnalysis(campaignId: string) {
  const supabase = await createClient();

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

  const { data: npcs, error } = await (supabase.from("npcs") as any)
    .select("id, name")
    .eq("world_id", campaign.world_id);

  if (error) {
    console.error("Error fetching NPCs for analysis:", error);
    throw new Error("Fehler beim Laden der NPCs.");
  }

  return npcs || [];
}


/** Alle NPCs einer Welt (GM-Zentrale). Kein Sichtbarkeits-Filter. */
export async function getNPCsByWorld(worldId: string) {
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

  const { data: npcsRaw, error } = await (supabase.from("npcs") as any)
    .select(`
      *,
      factions ( id, name, type )
    `)
    .eq("world_id", worldId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getNPCsByWorld Error:", error);
    return [];
  }

  return (npcsRaw || []).map((npc: any) => ({
    ...npc,
    is_revealed: true,
    is_favorite: false,
    has_active_quest: false,
    has_active_quest_as_giver: false,
    active_quests: [],
    active_quest_titles_as_giver: [],
  }));
}


// Get Single NPC by ID (with Quests and Favorites)
export async function getNPCById(npcId: string) {
  const supabase = await createClient();

  console.log("🔍 [getNPCById] Fetching NPC with ID:", npcId);

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("❌ [getNPCById] User not authenticated");
    throw new Error("Nicht authentifiziert.");
  }

  // 2. Fetch NPC with Faction and Location (ohne Quest-Embeds – FK quests.quest_giver_id kann fehlen)
  const { data: npc, error } = await (supabase.from("npcs") as any)
    .select(`
      *,
      factions:faction_id!left (
        id,
        name,
        type
      ),
      current_location:current_location_id!left (
        id,
        name,
        type
      ),
      home_location:home_location_id!left (
        id,
        name,
        type
      )
    `)
    .eq("id", npcId)
    .maybeSingle();

  if (error) {
    console.error("❌ [getNPCById] Error:", JSON.stringify(error, null, 2));
    console.error("❌ [getNPCById] Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      npcId: npcId,
    });
    return null;
  }

  // 3. Check if NPC was found
  if (!npc) {
    console.warn("⚠️ [getNPCById] NPC not found:", npcId);
    return null;
  }

  // 4. Quests separat laden (kein Embed, da Beziehung npcs↔quests im Schema fehlen kann)
  let questsAsGiver: any[] = [];
  let questsAsParticipant: any[] = [];
  try {
    const { data: giverQuests } = await (supabase.from("quests") as any)
      .select("id, title, status, type, description")
      .eq("quest_giver_id", npcId);
    questsAsGiver = giverQuests || [];
  } catch {
    // Tabelle quests oder Spalte quest_giver_id fehlt – ignorieren
  }
  try {
    const { data: participantRows } = await (supabase.from("quest_participants") as any)
      .select("quest_id, role_description, quests(id, title, status, type, description)")
      .eq("npc_id", npcId);
    questsAsParticipant = (participantRows || []).map((p: any) => ({
      ...(p.quests || {}),
      participant_role: p.role_description,
    }));
  } catch {
    // quest_participants oder Embed fehlt – ignorieren
  }

  // 5. Check if user has favorited this NPC
  const { data: favorite } = await (supabase.from("npc_favorites") as any)
    .select("npc_id")
    .eq("user_id", user.id)
    .eq("npc_id", npcId)
    .maybeSingle();

  console.log("✅ [getNPCById] NPC loaded successfully:", {
    id: npc?.id,
    name: npc?.name,
    faction_id: (npc as any)?.faction_id,
    hasFaction: !!npc?.factions,
    current_location_id: (npc as any)?.current_location_id,
    hasLocation: !!npc?.locations,
    locationName: (npc as any)?.locations?.name || "Keine Location",
  });

  // 5. Map locations for backward compatibility
  const result = {
    ...npc,
    current_location: (npc as any).current_location || null,
    home_location: (npc as any).home_location || null,
    // Backward compatibility: locations -> current_location
    locations: (npc as any).current_location || null,
    is_favorite: !!favorite,
    all_quests: [...questsAsGiver, ...questsAsParticipant],
  };

  return result;
}


// ============================================================================
// Get NPC Narrative Hooks (for transitive hook suggestions)
// ============================================================================
export async function getNPCNarrativeHooks(npcId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc, error } = await (supabase.from("npcs") as any)
    .select("narrative_hooks")
    .eq("id", npcId)
    .maybeSingle();

  if (error) {
    console.error("Error loading narrative hooks:", error);
    return [];
  }

  return (npc?.narrative_hooks as NarrativeHook[]) || [];
}


// ============================================================================
// Toggle NPC Favorite
// ============================================================================
export async function toggleNPCFavorite(npcId: string, isFavorite: boolean) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch NPC to get campaign_id
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("campaign_id")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  if (isFavorite) {
    // Remove favorite
    const { error } = await (supabase.from("npc_favorites") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("npc_id", npcId);

    if (error) {
      console.error("Remove Favorite Error:", error);
      throw new Error(error.message);
    }
  } else {
    // Add favorite
    const { error } = await (supabase.from("npc_favorites") as any)
      .insert({
        user_id: user.id,
        npc_id: npcId,
      });

    if (error) {
      console.error("Add Favorite Error:", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}


// ============================================================================
// Update NPC Notes
// ============================================================================
export async function updateNPCNotes(
  npcId: string,
  notes: {
    gm_notes?: string;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: npc } = await (supabase.from("npcs") as any)
    .select("world_id, worlds!inner(gm_id)")
    .eq("id", npcId)
    .single();

  if (!npc) throw new Error("NPC nicht gefunden.");

  const worlds = (npc as { worlds?: { gm_id: string } }).worlds;
  const isGM = worlds && worlds.gm_id === user.id;

  // 3. Prepare updates
  const updates: any = {};
  if (isGM && notes.gm_notes !== undefined) {
    updates.gm_notes = notes.gm_notes;
  }
  // Spieler-Notizen: siehe campaign_notes (pro Kampagne isoliert)

  if (Object.keys(updates).length === 0) return;

  const { error } = await (supabase.from("npcs") as any).update(updates).eq("id", npcId);

  if (error) {
    console.error("Update NPC Notes Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
}


// ============================================================================
// Search All NPCs (for global relationship selection)
// ============================================================================
export async function searchAllNPCs(
  campaignId: string,
  searchQuery?: string
): Promise<Array<{
  id: string;
  name: string;
  image_url: string | null;
  role: string | null;
  current_location_id: string | null;
  location_name: string | null;
}>> {
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

  let query = (supabase.from("npcs") as any)
    .select(`
      id,
      name,
      image_url,
      role,
      current_location_id,
      locations:current_location_id (
        name
      )
    `)
    .eq("world_id", campaign.world_id);

  // 3. Optional: Filter by search query
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("name", `%${searchQuery.trim()}%`);
  }

  const { data: npcs, error } = await query;

  if (error) {
    console.error("Search All NPCs Error:", error);
    throw new Error(error.message);
  }

  // 4. Normalize the response (locations is an array, but we only need the first item)
  return (npcs || []).map((npc: any) => ({
    id: npc.id,
    name: npc.name,
    image_url: npc.image_url,
    role: npc.role,
    current_location_id: npc.current_location_id,
    location_name: npc.locations?.[0]?.name || null,
  }));
}
