/**
 * location-actions — part 2: createLocationQuick.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Actions für Locations
 * 
 * Unterstützt:
 * - Get Location by ID
 * - Get NPCs by Location (home_location_id und current_location_id)
 */

// ============================================================================
// Get Location by ID
// ============================================================================

export async function createLocationQuick(formData: {
  campaign_id: string;
  name: string;
  type: string;
  parent_location_id?: string | null;
  description?: string | null;
}): Promise<{ id: string; name: string; type: string }> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", formData.campaign_id)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann Orte erstellen.");
  }
  if (!campaign.world_id) {
    throw new Error("Diese Kampagne hat keine Basis-Welt. Bitte weise eine Welt zu.");
  }
  const worldId = campaign.world_id;

  let validatedParentLocationId: string | null = null;
  if (formData.parent_location_id) {
    const { data: parentLocation } = await (supabase.from("locations") as any)
      .select("id, world_id")
      .eq("id", formData.parent_location_id)
      .maybeSingle();

    if (parentLocation && parentLocation.world_id === worldId) {
      validatedParentLocationId = parentLocation.id;
    } else {
      const { data: parentLore } = await (supabase.from("world_lore") as any)
        .select("id, world_id, name, type, description, parent_id")
        .eq("id", formData.parent_location_id)
        .maybeSingle();

      if (parentLore && parentLore.world_id === worldId) {
        try {
          const { data: existingParent } = await (supabase.from("locations") as any)
            .select("id")
            .eq("id", formData.parent_location_id)
            .maybeSingle();

          if (existingParent) {
            validatedParentLocationId = existingParent.id;
          } else {
            let parentParentLocationId: string | null = null;
            if (parentLore.parent_id) {
              const { data: parentParentLore } = await (supabase.from("world_lore") as any)
                .select("id, world_id, name, type, description")
                .eq("id", parentLore.parent_id)
                .maybeSingle();

              if (parentParentLore && parentParentLore.world_id === worldId) {
                const { data: existingParentParent } = await (supabase.from("locations") as any)
                  .select("id")
                  .eq("id", parentLore.parent_id)
                  .maybeSingle();

                if (existingParentParent) {
                  parentParentLocationId = existingParentParent.id;
                } else {
                  const { data: createdParentParent, error: createParentParentError } = await (supabase.from("locations") as any)
                    .insert({
                      id: parentParentLore.id,
                      world_id: worldId,
                      name: (parentParentLore as any).name || "Unbekannt",
                      type: (parentParentLore as any).type || "Ort",
                      description: (parentParentLore as any).description || null,
                      parent_location_id: null,
                    })
                    .select("id")
                    .single();

                  if (!createParentParentError && createdParentParent) {
                    parentParentLocationId = createdParentParent.id;
                  }
                }
              }
            }

            const { data: createdParent, error: createParentError } = await (supabase.from("locations") as any)
              .insert({
                id: parentLore.id,
                world_id: worldId,
                name: parentLore.name,
                type: parentLore.type,
                description: parentLore.description || null,
                parent_location_id: parentParentLocationId,
              })
              .select("id")
              .single();

            if (createParentError || !createdParent) {
              console.warn("⚠️ [createLocationQuick] Parent-Ort konnte nicht erstellt werden:", {
                parentId: formData.parent_location_id,
                error: createParentError,
              });
              // Setze auf null, um die Transaktion nicht abzubrechen
              validatedParentLocationId = null;
            } else {
              validatedParentLocationId = createdParent.id;
              console.log("✅ [createLocationQuick] Parent-Ort erstellt:", {
                parentId: validatedParentLocationId,
                name: parentLore.name,
              });
            }
          }
        } catch (parentError) {
          console.warn("⚠️ [createLocationQuick] Fehler beim Erstellen des Parent-Orts:", {
            parentId: formData.parent_location_id,
            error: parentError instanceof Error ? parentError.message : String(parentError),
          });
          // Setze auf null, um die Transaktion nicht abzubrechen
          validatedParentLocationId = null;
        }
      } else {
        console.warn("⚠️ [createLocationQuick] Parent-Ort nicht gefunden:", {
          parentId: formData.parent_location_id,
        });
        // Setze auf null, um die Transaktion nicht abzubrechen
        validatedParentLocationId = null;
      }
    }
  }

  const { data: existingLocation } = await (supabase.from("locations") as any)
    .select("id, name, type")
    .eq("world_id", worldId)
    .ilike("name", formData.name.trim())
    .maybeSingle();

  if (existingLocation) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/campaigns");
    return {
      id: existingLocation.id,
      name: existingLocation.name,
      type: existingLocation.type,
    };
  }

  const { data: existingLore } = await (supabase.from("world_lore") as any)
    .select("id, world_id, name, type, description, parent_id")
    .eq("world_id", worldId)
    .ilike("name", formData.name.trim())
    .maybeSingle();

  let loreEntryId: string;
  if (existingLore) {
    // Verwende bestehenden Lore-Eintrag
    loreEntryId = existingLore.id;
    console.log("ℹ️ [createLocationQuick] Verwende bestehenden Lore-Eintrag:", {
      id: loreEntryId,
      name: existingLore.name,
    });
  } else {
    // 6. Find parent_lore_id if parent_location_id is provided
    let parent_lore_id: string | null = null;
    if (validatedParentLocationId) {
      // Find the lore entry that corresponds to this location
      const { data: parentLore } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("id", validatedParentLocationId) // locations.id === world_lore.id
        .maybeSingle();
      
      if (parentLore) {
        parent_lore_id = parentLore.id;
      } else {
        // Fallback: Check if location has lore_id field
        const { data: parentLocation } = await (supabase.from("locations") as any)
          .select("lore_id")
          .eq("id", validatedParentLocationId)
          .maybeSingle();
        
        if (parentLocation?.lore_id) {
          parent_lore_id = parentLocation.lore_id;
        }
      }
    }

    if (!parent_lore_id) {
      const { data: worldEntry } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("world_id", worldId)
        .eq("type", "Welt")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (worldEntry) {
        parent_lore_id = worldEntry.id;
      }
    }

    const { data: loreEntry, error: loreError } = await (supabase.from("world_lore") as any)
      .insert({
        world_id: worldId,
        name: formData.name.trim(),
        type: formData.type,
        parent_id: parent_lore_id,
        description: formData.description || null,
      })
      .select("id")
      .single();

    if (loreError) {
      if (loreError.code === "23505" || loreError.message?.includes("unique constraint")) {
        const { data: existingLoreRetry } = await (supabase.from("world_lore") as any)
          .select("id, name, type")
          .eq("world_id", worldId)
          .ilike("name", formData.name.trim())
          .maybeSingle();
        
        if (existingLoreRetry) {
          loreEntryId = existingLoreRetry.id;
          console.log("ℹ️ [createLocationQuick] Verwende bestehenden Lore-Eintrag (nach Unique Constraint):", {
            id: loreEntryId,
          });
        } else {
          throw new Error(`Fehler beim Erstellen des Lore-Eintrags: ${loreError.message}`);
        }
      } else {
        throw new Error(`Fehler beim Erstellen des Lore-Eintrags: ${loreError.message}`);
      }
    } else {
      loreEntryId = loreEntry.id;
    }
  }

  const { data: location, error: locationError } = await (supabase.from("locations") as any)
    .insert({
      id: loreEntryId,
      world_id: worldId,
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description || null,
      parent_location_id: validatedParentLocationId,
    })
    .select("id, name, type")
    .single();

  if (locationError) {
    console.error("❌ [createLocationQuick] Location Error:", locationError);
    
    // Prüfe, ob es ein Foreign-Key-Fehler ist (Parent-Problem)
    if (locationError.code === "23503" || locationError.message?.includes("foreign key")) {
      // Try to clean up lore entry
      await (supabase.from("world_lore") as any).delete().eq("id", loreEntryId);
      throw new Error(
        `Der Ort "${formData.name}" oder sein übergeordneter Ort ist ungültig. Bitte prüfe die Orts-Hierarchie.`
      );
    }
    
    // Try to clean up lore entry
    await (supabase.from("world_lore") as any).delete().eq("id", loreEntryId);
    throw new Error(`Fehler beim Erstellen des Ortes: ${locationError.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");
  return location;
}
