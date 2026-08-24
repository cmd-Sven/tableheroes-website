/**
 * npc-actions — part 1: createNPC.
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

export async function createNPC(formData: {
  campaign_id?: string;
  world_id?: string;
  name: string;
  title?: string;
  description?: string;
  gm_notes?: string;
  faction_id?: string | null;
  current_location_id?: string | null;
  home_location_id?: string | null;
  race?: string;
  role?: string;
  status?: string;
  appearance?: string;
  personality_traits?: string;
  alignment?: string;
  image_url?: string;
  narrative_hooks?: NarrativeHook[] | null;
  is_secret_antagonist?: boolean;
  is_merchant?: boolean;
  shop_id?: string | null;
  hidden_agenda?: string;
  true_nature?: string;
  secret_entry?: string;
  check_results?: Array<{
    type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
    dc: number;
    result: string;
    is_critical: boolean;
  }> | null;
  religions?: string[] | null;
  deities?: string[] | null;
  languages?: string[] | null;
  image_display?: unknown;
  image_is_ai_generated?: boolean;
  image_upload_rights_confirmed?: boolean | null;
  token_url?: string | null;
  token_storage_path?: string | null;
  token_border?: { thicknessPx: number; color: string } | null;
  token_size_category?: string | null;
  sheet_data?: unknown | null;
  sheet_source?: string | null;
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
      throw new Error("Nur der GM dieser Welt kann NPCs erstellen.");
    }
    worldId = formData.world_id;
  } else if (formData.campaign_id) {
    const { data: campaignRaw } = await (supabase.from("campaigns") as any)
      .select("id, gm_id, owner_id, world_id")
      .eq("id", formData.campaign_id)
      .single();
    const campaign = campaignRaw as {
      id: string;
      gm_id: string;
      owner_id?: string | null;
      world_id: string | null;
    } | null;
    if (!campaign || !isCampaignGm(campaign, user.id)) {
      throw new Error("Nur der GM kann NPCs erstellen.");
    }
    if (!campaign.world_id) {
      throw new Error("Diese Kampagne hat keine Basis-Welt. Bitte weise unter Welt & Lore eine Welt zu.");
    }
    worldId = campaign.world_id;
  } else {
    throw new Error("Entweder campaign_id oder world_id angeben.");
  }

  // 4. Normalize foreign keys: empty strings -> null
  const normalizedFactionId = formData.faction_id && formData.faction_id.trim() !== "" 
    ? formData.faction_id.trim() 
    : null;
  const normalizedCurrentLocationId = formData.current_location_id && formData.current_location_id.trim() !== "" 
    ? formData.current_location_id.trim() 
    : null;
  const normalizedHomeLocationId = formData.home_location_id && formData.home_location_id.trim() !== "" 
    ? formData.home_location_id.trim() 
    : null;

  console.log("🔍 [createNPC] Normalized IDs:", {
    faction_id: normalizedFactionId,
    current_location_id: normalizedCurrentLocationId,
    home_location_id: normalizedHomeLocationId,
  });

  // 5. Validate location_ids (welt-zentrisch: world_id)
  const validateOrCreateLocation = async (
    locationId: string,
    worldIdParam: string,
    depth: number = 0
  ): Promise<{ id: string; world_id: string }> => {
    if (depth > 10) {
      throw new Error("Zu viele verschachtelte Parent-Orte. Bitte prüfe die Hierarchie.");
    }

    const { data: location, error: locationError } = await (supabase.from("locations") as any)
      .select("id, world_id, name")
      .eq("id", locationId)
      .maybeSingle();

    if (location && location.world_id === worldIdParam) {
      return location as { id: string; world_id: string };
    }

    const { data: lore, error: loreError } = await (supabase.from("world_lore") as any)
      .select("id, world_id, name, type, description, parent_id")
      .eq("id", locationId)
      .maybeSingle();

    if (!lore || lore.world_id !== worldIdParam) {
      console.error(`❌ [validateOrCreateLocation] Location not found:`, {
        locationId,
        depth,
        locationError,
        loreError,
        loreFound: !!lore,
      });
      throw new Error(`Der Ort mit der ID "${locationId}" existiert nicht in dieser Welt.`);
    }

    let validatedParentLocationId: string | null = null;
    if (lore.parent_id) {
      try {
        const parentLocation = await validateOrCreateLocation(lore.parent_id, worldIdParam, depth + 1);
        validatedParentLocationId = parentLocation.id;
      } catch {
        validatedParentLocationId = null;
      }
    }

    const { data: createdLocation, error: createError } = await (supabase.from("locations") as any)
      .insert({
        id: lore.id,
        world_id: lore.world_id,
        name: lore.name,
        type: lore.type,
        description: lore.description || null,
        parent_location_id: validatedParentLocationId,
      })
      .select("id, world_id")
      .single();

    if (createError || !createdLocation) {
      if (createError?.code === "23505") {
        const { data: existingLocation } = await (supabase.from("locations") as any)
          .select("id, world_id")
          .eq("id", lore.id)
          .maybeSingle();
        if (existingLocation && existingLocation.world_id === worldIdParam) {
          return existingLocation as { id: string; world_id: string };
        }
      }
      if (createError?.code === "23503" || createError?.message?.includes("foreign key")) {
        throw new Error(
          `Der Ort "${lore.name}" oder sein übergeordneter Ort ist ungültig. Bitte prüfe die Orts-Hierarchie.`
        );
      }
      throw new Error(
        `Fehler beim Erstellen des Ortes "${lore.name}": ${createError?.message || "Unbekannter Fehler"}`
      );
    }

    return createdLocation as { id: string; world_id: string };
  };

  const validateLocation = async (locationId: string | null, fieldName: string): Promise<string | null> => {
    if (!locationId) return null;

    try {
      const effectiveLocation = await validateOrCreateLocation(locationId, worldId, 0);

      if (effectiveLocation.world_id !== worldId) {
        throw new Error(`Der ausgewählte Ort gehört zu einer anderen Welt.`);
      }

      return effectiveLocation.id;
    } catch (error) {
      console.error(`❌ [createNPC] Location validation failed for ${fieldName}:`, {
        locationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Verbesserte Fehlermeldung
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      throw new Error(
        `Ungültiger ${fieldName === "current_location_id" ? "Aufenthaltsort" : "Heimatort"}: ${errorMessage}`
      );
    }
  };

  const validatedCurrentLocationId = await validateLocation(normalizedCurrentLocationId, "current_location_id");
  const validatedHomeLocationId = await validateLocation(normalizedHomeLocationId, "home_location_id");

  const imageUrl = (formData.image_url || "").trim();
  const portraitMeta = resolveNpcPortraitMetaForServer(user.id, {
    imageUrl,
    portraitIsAiGenerated: formData.image_is_ai_generated,
    uploadRightsConfirmed: formData.image_upload_rights_confirmed,
  });

  if (
    imageUrl &&
    !portraitMeta.image_is_ai_generated &&
    portraitMeta.image_upload_rights_confirmed !== true
  ) {
    throw new Error(
      "Bitte bestätige die Nutzungsrechte am hochgeladenen Bild oder kennzeichne es als KI-generiert.",
    );
  }

  // 6. Insert NPC (welt-zentrisch: nur world_id)
  const insertPayload = {
    world_id: worldId,
    name: formData.name,
    title: formData.title || null,
    description: formData.description || null,
    gm_notes: formData.gm_notes || null,
    faction_id: normalizedFactionId,
    current_location_id: validatedCurrentLocationId, // WICHTIG: Verwende die validierte ID
    home_location_id: validatedHomeLocationId, // WICHTIG: Verwende die validierte ID
    race: formData.race || null,
    role: formData.role || null,
    status: formData.status || "Alive",
    appearance: formData.appearance || null,
    personality_traits: formData.personality_traits || null,
    alignment: formData.alignment || null,
    image_url: imageUrl || null,
    image_display:
      formData.image_display != null && imageUrl !== ""
        ? imageDisplayToJson(normalizeImageDisplay(formData.image_display))
        : null,
    image_is_ai_generated: portraitMeta.image_is_ai_generated,
    image_upload_rights_confirmed: portraitMeta.image_upload_rights_confirmed,
    narrative_hooks: formData.narrative_hooks && formData.narrative_hooks.length > 0 ? formData.narrative_hooks : null,
    is_secret_antagonist: formData.is_secret_antagonist ?? false,
    is_merchant: formData.is_merchant ?? false,
    shop_id: formData.is_merchant && formData.shop_id ? formData.shop_id : null,
    hidden_agenda: formData.hidden_agenda || null,
    true_nature: formData.true_nature || null,
    check_results: formData.check_results && formData.check_results.length > 0 ? formData.check_results : null,
    religions: formData.religions && formData.religions.length > 0 ? formData.religions : null,
    deities: formData.deities && formData.deities.length > 0 ? formData.deities : null,
    languages: formData.languages && formData.languages.length > 0 ? formData.languages : null,
    token_url: formData.token_url?.trim() ? formData.token_url.trim() : null,
    token_storage_path: formData.token_storage_path?.trim()
      ? formData.token_storage_path.trim()
      : null,
    token_border: formData.token_border ?? null,
    token_size_category: formData.token_size_category?.trim()
      ? formData.token_size_category.trim()
      : "medium",
    sheet_data: formData.sheet_data ?? null,
    sheet_source: formData.sheet_data
      ? formData.sheet_source?.trim() || "manual"
      : null,
    sheet_synced_at: formData.sheet_data ? new Date().toISOString() : null,
  };

  console.log("🔍 [createNPC] Insert payload:", {
    ...insertPayload,
    current_location_id: insertPayload.current_location_id,
    home_location_id: insertPayload.home_location_id,
  });

  const { data: npc, error } = await (supabase.from("npcs") as any)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Create NPC Error:", error);
    throw new Error(error.message);
  }

  // 7. Automatisches Secret erstellen, wenn is_secret_antagonist true ist oder secret_entry vorhanden ist
  if ((formData.is_secret_antagonist || formData.secret_entry) && npc.id) {
    try {
      // Erstelle ein Secret für den Antagonisten
      const secretTitle = formData.secret_entry 
        ? `Geheimnis: ${formData.name}`
        : `Die wahre Natur von ${formData.name}`;
      
      const secretContent = formData.secret_entry 
        ? formData.secret_entry
        : formData.hidden_agenda 
          ? `${formData.hidden_agenda}\n\n${formData.true_nature ? `Wahre Persönlichkeit: ${formData.true_nature}` : ""}`
          : formData.true_nature || `Dieser NPC ist ein geheimer Antagonist. Seine wahre Natur ist verborgen.`;

      const { error: secretError } = await (supabase.from("secrets") as any)
        .insert({
          campaign_id: formData.campaign_id,
          entity_type: "npc",
          entity_id: npc.id,
          title: secretTitle,
          content: secretContent,
          is_revealed: false, // Standardmäßig nicht enthüllt
        });

      if (secretError) {
        console.error("⚠️ [createNPC] Failed to create automatic secret:", secretError);
        // Nicht werfen - Secret-Erstellung ist optional
      } else {
        console.log("✅ [createNPC] Automatic secret created for antagonist");
      }
    } catch (secretErr) {
      console.error("⚠️ [createNPC] Error creating automatic secret:", secretErr);
      // Nicht werfen - Secret-Erstellung ist optional
    }
  }

  if (formData.campaign_id) {
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}`);
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}?tab=npcs`);
    revalidatePath(`/dashboard/campaigns/${formData.campaign_id}/npcs`);
  }
  if (formData.world_id) {
    revalidatePath(`/dashboard/worlds/${formData.world_id}`);
    revalidatePath(`/dashboard/worlds/${formData.world_id}/npcs`);
  }
  return npc;
}
