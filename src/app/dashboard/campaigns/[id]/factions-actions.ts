"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Fraktionen
 *
 * Unterstützt:
 * - Create Faction
 * - Update Faction
 * - Delete Faction
 * - Toggle Reveal Status
 * - Get Factions with Member Count
 */

// ============================================================================
// Create Faction
// ============================================================================
export async function createFaction(formData: {
  campaign_id: string;
  name: string;
  type: string;
  current_status?: string;
  description?: string;
  image_url?: string;
  location_id?: string;
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

  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Fraktionen erstellen.");
  }

  // 3. Get world_id for this campaign
  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", formData.campaign_id)
    .single();

  const world = worldRaw as { id: string } | null;

  if (!world) {
    throw new Error("Für diese Kampagne existiert noch keine Welt. Bitte erstelle zuerst eine Welt.");
  }

  // 4. Insert Faction
  const { data: faction, error } = await (supabase.from("factions") as any)
    .insert({
      campaign_id: formData.campaign_id,
      world_id: world?.id,
      name: formData.name,
      type: formData.type,
      current_status: formData.current_status || null,
      description: formData.description || null,
      image_url: formData.image_url || null,
      location_id: formData.location_id || null,
      gm_notes: formData.gm_notes || null,
      is_revealed: formData.is_revealed ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Create Faction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return faction;
}

// ============================================================================
// Create Faction (Quick/On-the-Fly)
// ============================================================================
export async function createFactionQuick(formData: {
  campaign_id: string;
  name: string;
  type: string;
  location_id?: string | null;
  description?: string | null;
}): Promise<{ id: string; name: string; type: string }> {
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

  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Fraktionen erstellen.");
  }

  // 3. Get world_id for this campaign
  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", formData.campaign_id)
    .single();

  const world = worldRaw as { id: string } | null;

  if (!world) {
    throw new Error("Für diese Kampagne existiert noch keine Welt. Bitte erstelle zuerst eine Welt.");
  }

  // 4. Validate location_id if provided
  if (formData.location_id) {
    const { data: locationRaw } = await (supabase.from("locations") as any)
      .select("id, campaign_id")
      .eq("id", formData.location_id)
      .single();

    const location = locationRaw as { id: string; campaign_id: string } | null;

    if (!location || location.campaign_id !== formData.campaign_id) {
      throw new Error("Ungültiger Ort.");
    }
  }

  // 5. Insert Faction
  const { data: faction, error } = await (supabase.from("factions") as any)
    .insert({
      campaign_id: formData.campaign_id,
      world_id: world?.id,
      name: formData.name,
      type: formData.type,
      description: formData.description || null,
      location_id: formData.location_id || null,
      is_revealed: false, // Standardmäßig verborgen
    })
    .select("id, name, type")
    .single();

  if (error) {
    console.error("❌ [createFactionQuick] Error:", error);
    throw new Error(`Fehler beim Erstellen der Fraktion: ${error.message}`);
  }

  revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
  return faction;
}

// ============================================================================
// Update Faction
// ============================================================================
export async function updateFaction(
  factionId: string,
  updates: {
    name?: string;
    type?: string;
    current_status?: string;
    description?: string;
    image_url?: string;
    location_id?: string;
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

  // 2. Fetch Faction to verify GM ownership
  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!faction) throw new Error("Fraktion nicht gefunden.");

  const campaigns = faction.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Fraktionen bearbeiten.");
  }

  // 3. Update
  const { error } = await (supabase.from("factions") as any)
    .update(updates)
    .eq("id", factionId);

  if (error) {
    console.error("Update Faction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${faction.campaign_id}`);
}

// ============================================================================
// Delete Faction
// ============================================================================
export async function deleteFaction(factionId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Faction to verify GM ownership
  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!faction) throw new Error("Fraktion nicht gefunden.");

  const campaigns = faction.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann Fraktionen löschen.");
  }

  // 3. Delete
  const { error } = await (supabase.from("factions") as any)
    .delete()
    .eq("id", factionId);

  if (error) {
    console.error("Delete Faction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${faction.campaign_id}`);
}

// ============================================================================
// Toggle Reveal Status
// ============================================================================
export async function toggleFactionReveal(
  factionId: string,
  currentState: boolean
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Faction to verify GM ownership
  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!faction) throw new Error("Fraktion nicht gefunden.");

  const campaigns = faction.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Sichtbarkeit ändern.");
  }

  // 3. Toggle
  const { error } = await (supabase.from("factions") as any)
    .update({ is_revealed: !currentState })
    .eq("id", factionId);

  if (error) {
    console.error("Toggle Faction Reveal Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${faction.campaign_id}`);
}

// ============================================================================
// Get Factions with Member Counts
// ============================================================================
export async function getFactionsWithMembers(campaignId: string) {
  const supabase = await createClient();

  // 1. Fetch all factions for this campaign
  const { data: factions, error: factionsError } = await (supabase.from("factions") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (factionsError) {
    console.error("Fetch Factions Error:", factionsError);
    return [];
  }

  if (!factions || factions.length === 0) return [];

  // 2. For each faction, count the NPCs
  const factionsWithCounts = await Promise.all(
    factions.map(async (faction: any) => {
      const { count } = await (supabase.from("npcs") as any)
        .select("id", { count: "exact", head: true })
        .eq("faction_id", faction.id);

      return {
        ...faction,
        member_count: count || 0,
      };
    })
  );

  return factionsWithCounts;
}

// ============================================================================
// Get Factions (simple list for dropdowns)
// ============================================================================
export async function getFactions(campaignId: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("factions") as any)
    .select("id, name")
    .eq("campaign_id", campaignId)
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
export async function getFactionById(factionId: string) {
  const supabase = await createClient();

  console.log("🔍 [getFactionById] Fetching faction with ID:", factionId);

  // Wir laden die Fraktion + Verknüpfte NPCs + Verknüpften Ort (Location) + Lore-Eintrag
  // Hinweis: Wir nutzen LEFT JOINS (!left) mit explizitem Foreign Key (location_id, lore_id),
  // damit die Fraktion auch geladen wird, wenn keine Location, NPCs oder Lore verknüpft sind.
  const { data: faction, error } = await (supabase.from("factions") as any)
    .select(
      `
      *,
      locations:location_id!left (
        id,
        name,
        type
      ),
      lore_entry:lore_id!left (
        id,
        name,
        type,
        description,
        gm_notes,
        is_revealed
      ),
      npcs!left (
        id,
        name,
        title,
        role,
        race,
        status,
        image_url,
        is_revealed,
        user_id
      )
    `
    )
    .eq("id", factionId)
    .single();

  if (error) {
    console.error("❌ [getFactionById] Error occurred:", error);
    console.error("❌ [getFactionById] Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      factionId: factionId,
    });
    console.error(
      "❌ [getFactionById] Full error object:",
      JSON.stringify(error, null, 2)
    );
    // Wir werfen hier keinen harten Fehler, sondern geben null zurück,
    // damit die UI 'Not Found' anzeigen kann, statt zu crashen.
    return null;
  }

  console.log("✅ [getFactionById] Faction loaded successfully:", {
    id: faction?.id,
    name: faction?.name,
    location_id: (faction as any)?.location_id,
    hasLocation: !!faction?.locations,
    locationName: (faction as any)?.locations?.name || "Keine Location",
    npcsCount: Array.isArray(faction?.npcs) ? faction.npcs.length : 0,
  });

  return faction;
}

// ============================================================================
// Get Faction Details for AI Generation (inkl. GM-Notizen)
// ============================================================================
export async function getFactionDetailsForAI(factionId: string, campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check (nur GM kann GM-Notizen sehen)
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Faction-Details für die KI-Generierung laden.");
  }

  // 3. Fetch Faction with all details (inkl. GM-Notizen)
  const { data: faction, error } = await (supabase.from("factions") as any)
    .select(`
      *,
      locations:location_id!left (
        id,
        name,
        type
      ),
      lore_entry:lore_id!left (
        id,
        name,
        type,
        description,
        gm_notes,
        is_revealed
      )
    `)
    .eq("id", factionId)
    .single();

  if (error) {
    console.error("❌ [getFactionDetailsForAI] Error:", error);
    return null;
  }

  return faction;
}

// ============================================================================
// Update Faction Notes
// ============================================================================
export async function updateFactionNotes(
  factionId: string,
  notes: {
    gm_notes?: string;
    player_notes?: string;
  }
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Fetch Faction to verify access and get campaign_id
  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!faction) throw new Error("Fraktion nicht gefunden.");

  const campaigns = faction.campaigns as any;
  const isGM = campaigns.gm_id === user.id;

  // 3. Prepare updates
  const updates: any = {};
  if (isGM && notes.gm_notes !== undefined) {
    updates.gm_notes = notes.gm_notes;
  }
  if (notes.player_notes !== undefined) {
    // Both GM and players can edit player_notes
    updates.player_notes = notes.player_notes;
  }

  // 4. Update
  const { error } = await (supabase.from("factions") as any)
    .update(updates)
    .eq("id", factionId);

  if (error) {
    console.error("❌ [updateFactionNotes] Error:", error);
    throw new Error("Fehler beim Speichern der Notizen.");
  }

  // Cache leeren
  revalidatePath(`/dashboard/campaigns/${faction.campaign_id}`);
}

// ============================================================================
// Create Faction Lore Entry
// ============================================================================
export async function createFactionLore(
  factionId: string,
  factionName: string,
  campaignId: string
): Promise<{ success: boolean; loreId?: string; error?: any }> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Nicht authentifiziert." };
  }

  // 2. Fetch Faction to verify GM ownership
  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("campaign_id, campaigns!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;

  if (!faction) {
    return { success: false, error: "Fraktion nicht gefunden." };
  }

  const campaigns = faction.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    return {
      success: false,
      error: "Nur der GM kann Lore-Einträge für Fraktionen erstellen.",
    };
  }

  // 3. Create Lore Entry
  const { data: loreEntryRaw, error: loreError } = await (supabase.from("world_lore") as any)
    .insert({
      campaign_id: campaignId,
      name: factionName,
      type: "Organisation", // Oder "Fraktion", je nach Datenbank-Schema
      description: `Hintergrundgeschichte und Details zur Fraktion "${factionName}".`,
      is_revealed: false, // Standardmäßig verborgen, GM kann später ändern
    })
    .select("id")
    .single();

  const loreEntry = loreEntryRaw as { id: string } | null;

  if (loreError) {
    console.error("❌ [createFactionLore] Create Lore Error:", loreError);
    return {
      success: false,
      error: "Fehler beim Erstellen des Lore-Eintrags: " + loreError.message,
    };
  }

  if (!loreEntry || !loreEntry.id) {
    return {
      success: false,
      error: "Lore-Eintrag wurde erstellt, aber keine ID zurückgegeben.",
    };
  }

  // 4. Update Faction with lore_id
  const { error: updateError } = await (supabase.from("factions") as any)
    .update({ lore_id: loreEntry.id })
    .eq("id", factionId);

  if (updateError) {
    console.error("❌ [createFactionLore] Update Faction Error:", updateError);
    // Wir geben trotzdem success zurück, da der Lore-Eintrag erstellt wurde
    // Die Verknüpfung kann später manuell erfolgen
    console.warn(
      "⚠️ [createFactionLore] Lore-Eintrag erstellt, aber Verknüpfung fehlgeschlagen."
    );
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true, loreId: loreEntry.id };
}
