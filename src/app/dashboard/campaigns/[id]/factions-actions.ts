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
  appearance?: string;
  structure?: string;
  philosophy?: string;
  important_npcs_info?: string;
  faction_relations?: Array<{
    target_faction_id: string;
    relation_type: string;
    description?: string | null;
  }>;
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

  // 4. Insert Faction (inkl. erweiterter Felder)
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
      // neue in der DB gespeicherte Felder
      appearance: formData.appearance ?? null,
      structure: formData.structure ?? null,
      philosophy: formData.philosophy ?? null,
      important_npcs_info: formData.important_npcs_info ?? null,
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

  // 4. Prüfe, ob Fraktion bereits existiert
  const { data: existingFaction } = await (supabase.from("factions") as any)
    .select("id, name, type, campaign_id")
    .eq("campaign_id", formData.campaign_id)
    .ilike("name", formData.name.trim())
    .maybeSingle();

  if (existingFaction) {
    console.log("ℹ️ [createFactionQuick] Fraktion existiert bereits:", {
      id: existingFaction.id,
      name: existingFaction.name,
    });
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
    return {
      id: existingFaction.id,
      name: existingFaction.name,
      type: existingFaction.type,
    };
  }

  // 5. Validate location_id if provided (mit Fallback zu world_lore)
  let validatedLocationId: string | null = null;
  if (formData.location_id) {
    // 5.a Primär: Prüfe, ob Location in locations existiert
    const { data: locationRaw } = await (supabase.from("locations") as any)
      .select("id, campaign_id")
      .eq("id", formData.location_id)
      .maybeSingle();

    const location = locationRaw as { id: string; campaign_id: string } | null;

    if (location && location.campaign_id === formData.campaign_id) {
      validatedLocationId = location.id;
    } else {
      // 5.b Fallback: Prüfe, ob Location in world_lore existiert
      const { data: locationLore } = await (supabase.from("world_lore") as any)
        .select("id, campaign_id, name, type, description, parent_id")
        .eq("id", formData.location_id)
        .maybeSingle();

      if (locationLore && locationLore.campaign_id === formData.campaign_id) {
        // Location existiert nur in world_lore, erstelle sie in locations
        // Verwende die gleiche Logik wie in createLocationQuick (rekursive Parent-Validierung)
        try {
          // Prüfe, ob Location bereits in locations existiert (nochmal, falls sie zwischenzeitlich erstellt wurde)
          const { data: existingLocation } = await (supabase.from("locations") as any)
            .select("id, campaign_id")
            .eq("id", formData.location_id)
            .maybeSingle();

          if (existingLocation) {
            validatedLocationId = existingLocation.id;
          } else {
            // Erstelle Location aus world_lore (vereinfachte Version, ohne Parent-Rekursion)
            const { data: createdLocation, error: createLocationError } = await (supabase.from("locations") as any)
              .insert({
                id: locationLore.id,
                campaign_id: locationLore.campaign_id,
                name: locationLore.name,
                type: locationLore.type,
                description: locationLore.description || null,
                parent_location_id: null, // Vereinfacht: Keine Parent-Rekursion hier
                lore_id: locationLore.id,
              })
              .select("id, campaign_id")
              .single();

            if (createLocationError || !createdLocation) {
              console.warn("⚠️ [createFactionQuick] Location konnte nicht erstellt werden:", {
                locationId: formData.location_id,
                error: createLocationError,
              });
              // Setze auf null, um die Transaktion nicht abzubrechen
              validatedLocationId = null;
            } else {
              validatedLocationId = createdLocation.id;
              console.log("✅ [createFactionQuick] Location erstellt:", {
                locationId: validatedLocationId,
                name: locationLore.name,
              });
            }
          }
        } catch (locationError) {
          console.warn("⚠️ [createFactionQuick] Fehler beim Erstellen der Location:", {
            locationId: formData.location_id,
            error: locationError instanceof Error ? locationError.message : String(locationError),
          });
          // Setze auf null, um die Transaktion nicht abzubrechen
          validatedLocationId = null;
        }
      } else {
        console.warn("⚠️ [createFactionQuick] Location nicht gefunden:", {
          locationId: formData.location_id,
        });
        throw new Error(`Ungültiger Ort: Der Ort mit der ID "${formData.location_id}" existiert nicht in dieser Kampagne.`);
      }
    }
  }

  // 6. Insert Faction
  const { data: faction, error } = await (supabase.from("factions") as any)
    .insert({
      campaign_id: formData.campaign_id, // WICHTIG: campaign_id explizit setzen
      world_id: world?.id,
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description || null,
      location_id: validatedLocationId, // Verwende validierte Location-ID
      is_revealed: false, // Standardmäßig verborgen
    })
    .select("id, name, type")
    .single();

  if (error) {
    console.error("❌ [createFactionQuick] Error:", error);
    
    // Prüfe, ob es ein Unique Constraint Fehler ist (Fraktion existiert bereits)
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      // Versuche, die bestehende Fraktion zu finden
      const { data: existingFactionRetry } = await (supabase.from("factions") as any)
        .select("id, name, type, campaign_id")
        .eq("campaign_id", formData.campaign_id)
        .ilike("name", formData.name.trim())
        .maybeSingle();
      
      if (existingFactionRetry) {
        console.log("ℹ️ [createFactionQuick] Verwende bestehende Fraktion (nach Unique Constraint):", {
          id: existingFactionRetry.id,
        });
        revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
        return {
          id: existingFactionRetry.id,
          name: existingFactionRetry.name,
          type: existingFactionRetry.type,
        };
      }
    }
    
    // Prüfe, ob es ein Foreign Key Fehler ist (Location-Problem)
    if (error.code === "23503" || error.message?.includes("foreign key")) {
      throw new Error(
        `Der Ort für die Fraktion "${formData.name}" ist ungültig. Bitte prüfe die Orts-Hierarchie.`
      );
    }
    
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
    appearance?: string;
    structure?: string;
    philosophy?: string;
    important_npcs_info?: string;
    faction_relations?: Array<{
      target_faction_id: string;
      relation_type: string;
      description?: string | null;
    }>;
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
    .select("id, campaign_id, allow_pc_join_on_creation, campaigns!inner(gm_id)")
    .eq("id", factionId)
    .single();

  if (fetchError) {
    console.error("[updateFactionAllowPcJoin] Fetch faction error:", fetchError);
    throw new Error("Fraktion nicht gefunden oder kein Zugriff.");
  }
  const faction = factionRaw as { campaign_id: string; campaigns: { gm_id: string } } | null;
  if (!faction) throw new Error("Fraktion nicht gefunden.");
  const campaigns = faction.campaigns as any;
  if (campaigns.gm_id !== user.id) {
    throw new Error("Nur der GM kann die Onboarding-Einstellung ändern.");
  }

  const { data: updated, error } = await (supabase.from("factions") as any)
    .update({ allow_pc_join_on_creation: allow })
    .eq("id", factionId)
    .select("id, allow_pc_join_on_creation")
    .single();

  if (error) {
    console.error("[updateFactionAllowPcJoin] Update error:", error);
    throw new Error(error.message || "Speichern fehlgeschlagen.");
  }
  if (!updated || (updated as any).allow_pc_join_on_creation !== allow) {
    console.error("[updateFactionAllowPcJoin] Update nicht bestätigt:", { factionId, allow, updated });
    throw new Error("Update konnte nicht bestätigt werden. Bitte Seite neu laden und erneut versuchen.");
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

  // Wir laden die Fraktion + Verknüpfte NPCs + Verknüpften Ort (Location) + Lore-Eintrag + Beziehungen
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

// ============================================================================
// Get Faction Relations
// ============================================================================
export async function getFactionRelations(campaignId: string, factionId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Lade alle Relationen, bei denen die Fraktion als faction_id_1 ODER faction_id_2 vorkommt
  const { data: relations, error } = await (supabase.from("faction_relations") as any)
    .select(`
      id,
      faction_id_1,
      faction_id_2,
      relation_type,
      description,
      faction_1:faction_id_1!inner (
        id,
        name
      ),
      faction_2:faction_id_2!inner (
        id,
        name
      )
    `)
    .eq("campaign_id", campaignId)
    .or(`faction_id_1.eq.${factionId},faction_id_2.eq.${factionId}`);

  if (error) {
    console.error("❌ [getFactionRelations] Error:", error);
    throw new Error(`Fehler beim Laden der Fraktions-Beziehungen: ${error.message}`);
  }

  // 3. Normalisiere die Daten: Bestimme den Partner und die Relation aus Sicht der aktuellen Fraktion
  const normalizedRelations = (relations || []).map((rel: any) => {
    const isFaction1 = rel.faction_id_1 === factionId;
    const partnerFaction = isFaction1 ? rel.faction_2 : rel.faction_1;
    
    return {
      id: rel.id,
      partnerFactionId: partnerFaction?.id || (isFaction1 ? rel.faction_id_2 : rel.faction_id_1),
      partnerFactionName: partnerFaction?.name || "Unbekannt",
      relationType: rel.relation_type,
      description: rel.description,
    };
  });

  return normalizedRelations;
}

// ============================================================================
// Create Faction Relation
// ============================================================================
export async function createFactionRelation(
  campaignId: string,
  factionId1: string,
  factionId2: string,
  relationType: string,
  description?: string | null
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Fraktions-Beziehungen anlegen.");
  }

  // 3. Prüfe, ob Relation bereits existiert
  const { data: existingRelation } = await (supabase.from("faction_relations") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .or(`and(faction_id_1.eq.${factionId1},faction_id_2.eq.${factionId2}),and(faction_id_1.eq.${factionId2},faction_id_2.eq.${factionId1})`)
    .maybeSingle();

  if (existingRelation) {
    // Aktualisiere bestehende Relation
    const { error: updateError } = await (supabase.from("faction_relations") as any)
      .update({
        relation_type: relationType,
        description: description || null,
      })
      .eq("id", existingRelation.id);

    if (updateError) {
      console.error("❌ [createFactionRelation] Update Error:", updateError);
      throw new Error(`Fehler beim Aktualisieren der Beziehung: ${updateError.message}`);
    }

    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    return { success: true, alreadyExisted: true };
  }

  // 4. Erstelle neue Relation
  const { error: insertError } = await (supabase.from("faction_relations") as any)
    .insert({
      campaign_id: campaignId,
      faction_id_1: factionId1,
      faction_id_2: factionId2,
      relation_type: relationType,
      description: description || null,
    });

  if (insertError) {
    console.error("❌ [createFactionRelation] Insert Error:", insertError);
    throw new Error(`Fehler beim Erstellen der Beziehung: ${insertError.message}`);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true, alreadyExisted: false };
}

// ============================================================================
// Delete Faction Relation
// ============================================================================
export async function deleteFactionRelation(relationId: string, campaignId: string) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Fraktions-Beziehungen löschen.");
  }

  // 3. Delete
  const { error } = await (supabase.from("faction_relations") as any)
    .delete()
    .eq("id", relationId);

  if (error) {
    console.error("❌ [deleteFactionRelation] Error:", error);
    throw new Error(`Fehler beim Löschen der Beziehung: ${error.message}`);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}
