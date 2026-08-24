/**
 * factions-actions — part 1: createFaction, createFactionQuick.
 */
"use server";

import { createFactionRelation } from "./part-03";

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

export async function createFaction(formData: {
  campaign_id?: string;
  world_id?: string;
  name: string;
  type: string;
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
  planned_members?: Array<{ name: string; role: string }>;
  faction_relations?: Array<{
    target_faction_id: string;
    relation_type: string;
    description?: string | null;
  }>;
  image_display?: unknown;
  banner_display?: unknown;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  let worldId: string;

  if (formData.world_id) {
    const { data: world } = await (supabase.from("worlds") as any)
      .select("id, gm_id")
      .eq("id", formData.world_id)
      .single();
    if (!world || (world as { gm_id: string }).gm_id !== user.id) {
      throw new Error("Nur der GM dieser Welt kann Fraktionen erstellen.");
    }
    worldId = formData.world_id;
  } else if (formData.campaign_id) {
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("id, gm_id, owner_id, world_id")
      .eq("id", formData.campaign_id)
      .single();
    const campaign = campaignRaw as { id: string; gm_id: string; owner_id?: string | null; world_id: string | null } | null;
    if (!campaign || !isCampaignGm(campaign, user.id)) {
      throw new Error("Nur der GM kann Fraktionen erstellen.");
    }
    if (!campaign.world_id) {
      throw new Error("Für diese Kampagne ist keine Welt zugewiesen. Bitte weise unter Welt & Lore eine Welt zu.");
    }
    worldId = campaign.world_id;
  } else {
    throw new Error("Entweder world_id oder campaign_id angeben.");
  }

  const emblemMeta = resolveFactionImageMeta(user.id, "emblem", {
    imageUrl: formData.image_url,
    isAiGenerated: formData.image_is_ai_generated,
    uploadRightsConfirmed: formData.image_upload_rights_confirmed,
  });
  const bannerMeta = resolveFactionImageMeta(user.id, "banner", {
    imageUrl: formData.banner_url,
    isAiGenerated: formData.banner_is_ai_generated,
    uploadRightsConfirmed: formData.banner_upload_rights_confirmed,
  });

  const { data: faction, error } = await (supabase.from("factions") as any)
    .insert({
      world_id: worldId,
      name: formData.name,
      type: formData.type,
      current_status: formData.current_status || null,
      description: formData.description || null,
      image_url: formData.image_url || null,
      image_is_ai_generated: emblemMeta.image_is_ai_generated,
      image_upload_rights_confirmed: emblemMeta.image_upload_rights_confirmed,
      image_display:
        formData.image_display != null && (formData.image_url || "").trim() !== ""
          ? imageDisplayToJson(normalizeImageDisplay(formData.image_display))
          : null,
      banner_url: formData.banner_url || null,
      banner_is_ai_generated: bannerMeta.image_is_ai_generated,
      banner_upload_rights_confirmed: bannerMeta.image_upload_rights_confirmed,
      banner_display:
        formData.banner_display != null && (formData.banner_url || "").trim() !== ""
          ? imageDisplayToJson(normalizeImageDisplay(formData.banner_display))
          : null,
      location_id: formData.location_id || null,
      hq_location_id: formData.hq_location_id || null,
      gm_notes: formData.gm_notes || null,
      is_revealed: formData.is_revealed ?? false,
      // neue in der DB gespeicherte Felder
      appearance: formData.appearance ?? null,
      structure: formData.structure ?? null,
      philosophy: formData.philosophy ?? null,
      important_npcs_info: formData.important_npcs_info ?? null,
      planned_members: Array.isArray(formData.planned_members)
        ? formData.planned_members.map((m) => ({ name: m.name || "", role: m.role || "Mitglied" }))
        : [],
    })
    .select()
    .single();

  if (error) {
    console.error("Create Faction Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/worlds/${worldId}`);
  if (formData.campaign_id) revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);

  const factionId = (faction as { id: string }).id;
  if (formData.campaign_id && Array.isArray(formData.faction_relations) && factionId) {
    for (const rel of formData.faction_relations) {
      if (!rel.target_faction_id || rel.target_faction_id === factionId) continue;
      await createFactionRelation(
        formData.campaign_id,
        factionId,
        rel.target_faction_id,
        rel.relation_type,
        rel.description ?? null,
      );
    }
  }

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

  // 3. world_id aus Kampagne (campaigns.world_id)
  const { data: campaignWithWorld } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", formData.campaign_id)
    .single();

  const worldId = (campaignWithWorld as { world_id: string | null } | null)?.world_id;

  if (!worldId) {
    throw new Error("Für diese Kampagne ist keine Welt zugewiesen. Bitte weise unter Welt & Lore eine Welt zu.");
  }

  // 4. Prüfe, ob Fraktion bereits existiert (welt-weit)
  const { data: existingFaction } = await (supabase.from("factions") as any)
    .select("id, name, type")
    .eq("world_id", worldId)
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

  // 6. Insert Faction (nur world_id, keine campaign_id)
  const { data: faction, error } = await (supabase.from("factions") as any)
    .insert({
      world_id: worldId,
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description || null,
      location_id: validatedLocationId,
    })
    .select("id, name, type")
    .single();

  if (error) {
    console.error("❌ [createFactionQuick] Error:", error);
    
    // Prüfe, ob es ein Unique Constraint Fehler ist (Fraktion existiert bereits)
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      // Versuche, die bestehende Fraktion zu finden
      const { data: existingFactionRetry } = await (supabase.from("factions") as any)
        .select("id, name, type")
        .eq("world_id", worldId)
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
