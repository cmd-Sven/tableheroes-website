/**
 * npc-relations-actions — part 4: promoteHookToNPC, updateHookRelationsToNPC.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NarrativeHook } from "@/src/types/npc";

/**
 * Server Actions für NPC-Relationen
 * 
 * Unterstützt:
 * - Create NPC Relation from Hook
 * - Remove Hook from Source NPC
 */

// ============================================================================
// Create NPC Relation from Hook
// ============================================================================

export async function promoteHookToNPC(
  campaignId: string,
  sourceNpcId: string,
  hookName: string,
  npcData: {
    name: string;
    title?: string;
    description?: string;
    race?: string;
    role?: string;
    status?: string;
    alignment?: string;
    appearance?: string;
    personality_traits?: string;
    gm_notes?: string;
    faction_id?: string | null;
    current_location_id?: string | null;
    home_location_id?: string | null;
    is_revealed?: boolean;
    image_url?: string;
  }
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
    throw new Error("Nur der GM kann Hooks zu NPCs umwandeln.");
  }

  // 3. Verifiziere, dass der Source-NPC existiert
  const { data: sourceNPC } = await (supabase.from("npcs") as any)
    .select("id, campaign_id, name")
    .eq("id", sourceNpcId)
    .single();

  if (!sourceNPC) {
    throw new Error("Der Source-NPC existiert nicht.");
  }

  if (sourceNPC.campaign_id !== campaignId) {
    throw new Error("NPC gehört nicht zur gleichen Kampagne.");
  }

  // 4. Prüfe, ob bereits ein NPC mit diesem Namen existiert
  const { data: existingNPC } = await (supabase.from("npcs") as any)
    .select("id, name")
    .eq("campaign_id", campaignId)
    .ilike("name", npcData.name.trim())
    .maybeSingle();

  if (existingNPC) {
    throw new Error(`Ein NPC mit dem Namen "${npcData.name}" existiert bereits in dieser Kampagne.`);
  }

  // 5. Get world_id for this campaign
  const { data: world } = await (supabase.from("worlds") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .single();

  if (!world) {
    throw new Error("Für diese Kampagne existiert noch keine Welt. Bitte erstelle zuerst eine Welt.");
  }

  // 6. Erstelle den neuen NPC
  const { error: createError, data: createdNPC } = await (supabase.from("npcs") as any)
    .insert({
      campaign_id: campaignId,
      world_id: world.id,
      name: npcData.name.trim(),
      title: npcData.title || null,
      description: npcData.description || null,
      race: npcData.race || null,
      role: npcData.role || null,
      status: npcData.status || "Alive",
      alignment: npcData.alignment || null,
      appearance: npcData.appearance || null,
      personality_traits: npcData.personality_traits || null,
      gm_notes: npcData.gm_notes || null,
      faction_id: npcData.faction_id || null,
      current_location_id: npcData.current_location_id || null,
      home_location_id: npcData.home_location_id || null,
      image_url: npcData.image_url || null,
    })
    .select()
    .single();

  if (createError || !createdNPC) {
    console.error("❌ [promoteHookToNPC] NPC Creation Error:", createError);
    throw new Error(`Fehler beim Erstellen des NPCs: ${createError?.message || "Unbekannter Fehler"}`);
  }

  console.log("✅ [promoteHookToNPC] NPC erfolgreich erstellt:", {
    npcId: createdNPC.id,
    name: createdNPC.name,
  });

  // 7. Finde alle Relationen mit target_name = hookName und npc_id_1 = sourceNpcId
  const { data: hookRelations, error: relationsError } = await (supabase.from("npc_relations") as any)
    .select("id, relation_type, description, target_name")
    .eq("campaign_id", campaignId)
    .eq("npc_id_1", sourceNpcId)
    .eq("target_name", hookName.trim())
    .maybeSingle(); // Verwende maybeSingle, da es mehrere geben könnte

  // 8. Aktualisiere alle gefundenen Relationen
  if (hookRelations) {
    // Falls es nur eine Relation gibt (maybeSingle gibt ein Objekt zurück)
    const relationsToUpdate = Array.isArray(hookRelations) ? hookRelations : [hookRelations];

    for (const relation of relationsToUpdate) {
      const { error: updateError } = await (supabase.from("npc_relations") as any)
        .update({
          npc_id_2: createdNPC.id, // Setze npc_id_2 auf die neue NPC-ID
          target_name: null, // Entferne target_name, da jetzt npc_id_2 vorhanden ist
        })
        .eq("id", relation.id);

      if (updateError) {
        console.error("❌ [promoteHookToNPC] Relation Update Error:", updateError);
        // Warnung, aber kein Fehler - NPC wurde bereits erstellt
        console.warn(`⚠️ NPC wurde erstellt, aber Relation ${relation.id} konnte nicht aktualisiert werden:`, updateError.message);
      } else {
        console.log("✅ [promoteHookToNPC] Relation aktualisiert:", {
          relationId: relation.id,
          npc_id_2: createdNPC.id,
        });
      }
    }
  } else {
    // Falls keine Relation gefunden wurde, aber maybeSingle null zurückgibt, prüfe mit select
    const { data: allRelations, error: allRelationsError } = await (supabase.from("npc_relations") as any)
      .select("id, relation_type, description, target_name")
      .eq("campaign_id", campaignId)
      .eq("npc_id_1", sourceNpcId)
      .eq("target_name", hookName.trim());

    if (!allRelationsError && allRelations && allRelations.length > 0) {
      for (const relation of allRelations) {
        const { error: updateError } = await (supabase.from("npc_relations") as any)
          .update({
            npc_id_2: createdNPC.id,
            target_name: null,
          })
          .eq("id", relation.id);

        if (updateError) {
          console.error("❌ [promoteHookToNPC] Relation Update Error:", updateError);
          console.warn(`⚠️ NPC wurde erstellt, aber Relation ${relation.id} konnte nicht aktualisiert werden:`, updateError.message);
        } else {
          console.log("✅ [promoteHookToNPC] Relation aktualisiert:", {
            relationId: relation.id,
            npc_id_2: createdNPC.id,
          });
        }
      }
    } else {
      console.warn("⚠️ [promoteHookToNPC] Keine Relationen mit target_name gefunden:", {
        sourceNpcId,
        hookName,
      });
    }
  }

  // 9. Revalidate
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${createdNPC.id}`);

  return {
    success: true,
    npc: createdNPC,
    message: `${npcData.name} wurde erfolgreich in der Welt manifestiert und mit ${sourceNPC.name} verknüpft!`,
  };
}

// ============================================================================
// Update Hook Relations to NPC (nur Relationen aktualisieren, NPC existiert bereits)
// ============================================================================
/**
 * Aktualisiert alle Hook-Relationen (target_name) zu einer vollwertigen NPC-Relation (npc_id_2).
 * Wird verwendet, wenn der NPC bereits erstellt wurde (z.B. durch den Wizard).
 */
export async function updateHookRelationsToNPC(
  campaignId: string,
  sourceNpcId: string,
  hookName: string,
  newNpcId: string
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
    throw new Error("Nur der GM kann Hook-Relationen aktualisieren.");
  }

  // 3. Finde alle Relationen mit target_name = hookName und npc_id_1 = sourceNpcId
  const { data: hookRelations, error: relationsError } = await (supabase.from("npc_relations") as any)
    .select("id, relation_type, description, target_name")
    .eq("campaign_id", campaignId)
    .eq("npc_id_1", sourceNpcId)
    .eq("target_name", hookName.trim());

  if (relationsError) {
    console.error("❌ [updateHookRelationsToNPC] Relations Query Error:", relationsError);
    throw new Error(`Fehler beim Laden der Hook-Relationen: ${relationsError.message}`);
  }

  if (!hookRelations || hookRelations.length === 0) {
    console.warn("⚠️ [updateHookRelationsToNPC] Keine Hook-Relationen gefunden:", {
      sourceNpcId,
      hookName,
    });
    return {
      success: true,
      updatedCount: 0,
      message: "Keine Hook-Relationen gefunden, die aktualisiert werden müssen.",
    };
  }

  // 4. Aktualisiere alle gefundenen Relationen
  let updatedCount = 0;
  for (const relation of hookRelations) {
    const { error: updateError } = await (supabase.from("npc_relations") as any)
      .update({
        npc_id_2: newNpcId, // Setze npc_id_2 auf die neue NPC-ID
        target_name: null, // Entferne target_name, da jetzt npc_id_2 vorhanden ist
      })
      .eq("id", relation.id);

    if (updateError) {
      console.error("❌ [updateHookRelationsToNPC] Relation Update Error:", updateError);
      console.warn(`⚠️ Relation ${relation.id} konnte nicht aktualisiert werden:`, updateError.message);
    } else {
      updatedCount++;
      console.log("✅ [updateHookRelationsToNPC] Relation aktualisiert:", {
        relationId: relation.id,
        npc_id_2: newNpcId,
      });
    }
  }

  // 5. Revalidate
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${newNpcId}`);

  return {
    success: true,
    updatedCount,
    message: `${updatedCount} Hook-Relation${updatedCount === 1 ? "" : "en"} wurde${updatedCount === 1 ? "" : "n"} erfolgreich aktualisiert.`,
  };
}
