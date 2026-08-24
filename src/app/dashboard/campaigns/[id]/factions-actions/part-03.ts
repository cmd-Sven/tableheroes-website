/**
 * factions-actions — part 3: getFactionById, getFactionDetailsForAI, updateFactionNotes, createFactionLore, getFactionRelations, createFactionRelation, deleteFactionRelation.
 */
"use server";

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

export async function getFactionById(factionId: string) {
  const supabase = await createClient();

  console.log("🔍 [getFactionById] Fetching faction with ID:", factionId);

  // Fraktion + verknüpfte Location, Lore und NPCs
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
        image_url
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

  // 3. Fetch Faction with all details (inkl. Lore-Visibility & GM-Notizen)
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
  const isGM = worlds.gm_id === user.id;

  // 3. Prepare updates
  const updates: any = {};
  if (isGM && notes.gm_notes !== undefined) {
    updates.gm_notes = notes.gm_notes;
  }
  // Spieler-Notizen: siehe campaign_notes (pro Kampagne isoliert)

  if (Object.keys(updates).length === 0) return;

  const { error } = await (supabase.from("factions") as any)
    .update(updates)
    .eq("id", factionId);

  if (error) {
    console.error("❌ [updateFactionNotes] Error:", error);
    throw new Error("Fehler beim Speichern der Notizen.");
  }

  revalidatePath(`/dashboard/worlds/${faction.world_id}`);
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

  const { data: factionRaw } = await (supabase.from("factions") as any)
    .select("world_id, worlds!inner(gm_id)")
    .eq("id", factionId)
    .single();

  const faction = factionRaw as { world_id: string; worlds: { gm_id: string } } | null;
  if (!faction) {
    return { success: false, error: "Fraktion nicht gefunden." };
  }
  const worlds = faction.worlds as any;
  if (worlds.gm_id !== user.id) {
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

  // 2. Lade alle Relationen (ohne Join – Schema-Cache-Probleme mit faction_id_1/2)
  const { data: relations, error } = await (supabase.from("faction_relations") as any)
    .select("id, faction_id_1, faction_id_2, relation_type, description")
    .eq("campaign_id", campaignId)
    .or(`faction_id_1.eq.${factionId},faction_id_2.eq.${factionId}`);

  if (error) {
    console.error("❌ [getFactionRelations] Error:", error);
    return [];
  }

  const items = (relations || []) as Array<{ id: string; faction_id_1: string; faction_id_2: string; relation_type: string; description: string | null }>;
  if (items.length === 0) return [];

  // 3. Fraktionsnamen manuell laden
  const factionIds = [...new Set(items.flatMap((r) => [r.faction_id_1, r.faction_id_2]))];
  const { data: factionRows } = await (supabase.from("factions") as any)
    .select("id, name")
    .in("id", factionIds);
  const factionMap = new Map(
    ((factionRows as { id: string; name: string }[]) ?? []).map((f) => [f.id, f.name])
  );

  // 4. Normalisiere die Daten: Bestimme den Partner und die Relation aus Sicht der aktuellen Fraktion
  return items.map((rel) => {
    const isFaction1 = rel.faction_id_1 === factionId;
    const partnerId = isFaction1 ? rel.faction_id_2 : rel.faction_id_1;
    return {
      id: rel.id,
      partnerFactionId: partnerId,
      partnerFactionName: factionMap.get(partnerId) ?? "Unbekannt",
      relationType: rel.relation_type,
      description: rel.description,
    };
  });
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
