/**
 * npc-relations-actions — part 2: createNPCRelationManually, createNPCRelation, deleteNPCRelation, checkNPCRelationExists.
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

export async function createNPCRelationManually(
  campaignId: string,
  sourceNpcId: string,
  targetNpcId: string | null, // Optional: ID des Ziel-NPCs (wenn existierend)
  relationType: string,
  description?: string | null,
  targetName?: string | null // Optional: Name des Hooks (wenn noch kein NPC existiert)
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

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann NPC-Relationen anlegen.");
  }

  // 3. Verifiziere, dass der Source-NPC existiert
  const { data: sourceNPC } = await (supabase.from("npcs") as any)
    .select("id, campaign_id")
    .eq("id", sourceNpcId)
    .single();

  if (!sourceNPC) {
    throw new Error("Der Source-NPC existiert nicht.");
  }

  if (sourceNPC.campaign_id !== campaignId) {
    throw new Error("NPC gehört nicht zur gleichen Kampagne.");
  }

  // 3a. SELBST-BEZIEHUNGS-CHECK: Verhindere, dass ein NPC mit sich selbst verknüpft wird
  if (targetNpcId && targetNpcId === sourceNpcId) {
    throw new Error("Ein NPC kann nicht mit sich selbst verknüpft werden.");
  }

  // 4. Bestimme, ob wir target_name oder targetNpcId verwenden
  // Hinweis: Auch wenn ein targetNpcId gesetzt ist, wollen wir nach Möglichkeit IMMER ein target_name speichern,
  // damit Datenmodelle mit NOT NULL auf target_name kompatibel bleiben. Daher nutzen wir den Namen des Ziel-NPCs als Fallback.
  let targetNPC: { id: string; campaign_id: string; name?: string | null } | null = null;
  const hasExplicitTargetName = !!(targetName && targetName.trim() !== "");
  let finalTargetName: string | null = hasExplicitTargetName ? targetName!.trim() : null;
  const useTargetName = !targetNpcId && !!finalTargetName;

  // 4a. Wenn targetNpcId vorhanden ist, verifiziere dass der Target-NPC existiert
  if (targetNpcId && !useTargetName) {
    const { data: targetNPCRaw } = await (supabase.from("npcs") as any)
      .select("id, campaign_id, name")
      .eq("id", targetNpcId)
      .single();

    targetNPC = targetNPCRaw as { id: string; campaign_id: string; name?: string | null } | null;

    if (!targetNPC) {
      throw new Error("Der Target-NPC existiert nicht.");
    }

    if (targetNPC.campaign_id !== campaignId) {
      throw new Error("NPCs gehören nicht zur gleichen Kampagne.");
    }

    // Fallback: Wenn kein expliziter targetName übergeben wurde, nutze den Namen des Ziel-NPCs
    if (!finalTargetName && targetNPC.name && targetNPC.name.trim() !== "") {
      finalTargetName = targetNPC.name.trim();
    }
  }

  // 5. Prüfe, ob Relation bereits existiert
  let existingRelation: any = null;
  
  if (useTargetName) {
    // Suche nach Relation mit target_name
    const { data: existing } = await (supabase.from("npc_relations") as any)
      .select("id, relation_type")
      .eq("campaign_id", campaignId)
      .eq("npc_id_1", sourceNpcId)
      .eq("target_name", finalTargetName)
      .eq("relation_type", relationType)
      .maybeSingle();
    
    existingRelation = existing;
  } else if (targetNpcId) {
    // Legacy: Suche nach Relation mit npc_id_2 (falls das Feld noch existiert)
    // Falls nicht, wird diese Query fehlschlagen, aber wir fangen es ab
    try {
      const { data: existing } = await (supabase.from("npc_relations") as any)
        .select("id, relation_type")
        .eq("campaign_id", campaignId)
        .eq("npc_id_1", sourceNpcId)
        .eq("npc_id_2", targetNpcId)
        .eq("relation_type", relationType)
        .maybeSingle();
      
      existingRelation = existing;
    } catch (error) {
      // Falls npc_id_2 nicht mehr existiert, ignorieren wir diesen Check
      console.warn("⚠️ [createNPCRelationManually] npc_id_2 field may not exist, skipping duplicate check");
    }
  }

  // 5a. Falls bereits eine Relation mit GLEICHEM Typ existiert → nichts neu anlegen
  if (existingRelation && existingRelation.relation_type === relationType) {
    const { data: relation } = await (supabase.from("npc_relations") as any)
      .select()
      .eq("id", existingRelation.id)
      .single();

    console.log("ℹ️ [createNPCRelationManually] Relation existiert bereits, kein neuer Eintrag nötig:", {
      campaignId,
      sourceNpcId,
      targetNpcId,
      targetName: finalTargetName,
      relationType,
    });

    return {
      success: true,
      alreadyExisted: true,
      relation,
    };
  }

  // 5b. Falls Relation existiert, aber mit anderem Typ → aktualisieren
  if (existingRelation && existingRelation.relation_type !== relationType) {
    const { error: updateError, data: updatedRelation } = await (supabase.from("npc_relations") as any)
      .update({
        relation_type: relationType,
        description: description || null,
      })
      .eq("id", existingRelation.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ [createNPCRelationManually] Update Error:", updateError);
      throw new Error(`Fehler beim Aktualisieren der Relation: ${updateError.message}`);
    }

    // Revalidate
    revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
    if (targetNpcId) {
      revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${targetNpcId}`);
    }

    return {
      success: true,
      alreadyExisted: false,
      relation: updatedRelation,
    };
  }

  // 6. Erstelle neue Relation
  const insertPayload: any = {
    campaign_id: campaignId,
    npc_id_1: sourceNpcId,
    relation_type: relationType,
    description: description || null,
  };

  // Wenn wir einen Namen haben (explizit oder über den Ziel-NPC), setzen wir target_name IMMER,
  // damit NOT-NULL-Constraints auf der Spalte nicht verletzt werden.
  if (finalTargetName && finalTargetName.trim() !== "") {
    insertPayload.target_name = finalTargetName.trim();
  }

  if (targetNpcId) {
    // Legacy-Feld: npc_id_2, falls im Schema noch vorhanden
    insertPayload.npc_id_2 = targetNpcId;
  } else if (!finalTargetName) {
    // Weder NPC-ID noch Name vorhanden -> unvollständige Daten
    throw new Error("Entweder ein Ziel-NPC oder ein Zielname (target_name) muss angegeben werden.");
  }

  const { error: relError, data: insertedRelation } = await (supabase.from("npc_relations") as any)
    .insert(insertPayload)
    .select()
    .single();

  // Error 23505 = Unique Constraint Violation (PostgreSQL)
  if (relError) {
    // Prüfe auf Unique Constraint Violation
    if (relError.code === "23505" || relError.message?.includes("unique constraint") || relError.message?.includes("duplicate key")) {
      console.log("ℹ️ [createNPCRelationManually] Unique Constraint - Relation existiert bereits:", {
        campaignId,
        sourceNpcId,
        targetNpcId,
        targetName: finalTargetName,
        relationType,
      });

      // Lade die existierende Relation
      let existing: any = null;
      if (useTargetName) {
        const { data } = await (supabase.from("npc_relations") as any)
          .select()
          .eq("campaign_id", campaignId)
          .eq("npc_id_1", sourceNpcId)
          .eq("target_name", finalTargetName)
          .eq("relation_type", relationType)
          .maybeSingle();
        existing = data;
      } else if (targetNpcId) {
        try {
          const { data } = await (supabase.from("npc_relations") as any)
            .select()
            .eq("campaign_id", campaignId)
            .eq("npc_id_1", sourceNpcId)
            .eq("npc_id_2", targetNpcId)
            .eq("relation_type", relationType)
            .maybeSingle();
          existing = data;
        } catch (error) {
          // Ignoriere Fehler, falls npc_id_2 nicht existiert
        }
      }

      if (existing) {
        return {
          success: true,
          alreadyExisted: true,
          relation: existing,
        };
      }
    }

    console.error("❌ [createNPCRelationManually] Relation Error:", relError);
    throw new Error(`Fehler beim Erstellen der Relation: ${relError.message}`);
  }

  // 7. Revalidate
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
  if (targetNpcId) {
    revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${targetNpcId}`);
  }

  return {
    success: true,
    alreadyExisted: false,
    relation: insertedRelation,
  };
}

// ============================================================================
// Create NPC Relation (direkt, für Editor)
// ============================================================================
export async function createNPCRelation(
  campaignId: string,
  sourceNpcId: string,
  targetNpcId: string,
  relationType: string,
  description?: string | null,
  followUps?: Array<{
    sourceNpcId: string;
    targetNpcId: string;
    relationType: string;
    description?: string | null;
  }>
) {
  // Haupt-Relation anlegen
  const main = await createNPCRelationManually(
    campaignId,
    sourceNpcId,
    targetNpcId,
    relationType,
    description
  );

  // Optionale Folge-Relationen anlegen (z.B. für Geschwister-Transitivität)
  if (followUps && followUps.length > 0) {
    await Promise.all(
      followUps.map((rel: any) =>
        createNPCRelationManually(
          campaignId,
          rel.sourceNpcId,
          rel.targetNpcId,
          rel.relationType,
          rel.description ?? null
        ).catch((error) => {
          console.error(
            "❌ [createNPCRelation] Fehler bei Folge-Relation:",
            error
          );
          return null;
        })
      )
    );
  }

  return main;
}

// ============================================================================
// Delete NPC Relation
// ============================================================================
export async function deleteNPCRelation(
  campaignId: string,
  relationId: string
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Lade Relation, um Kampagne & beteiligte NPCs zu kennen
  const { data: relation, error: loadError } = await (supabase.from("npc_relations") as any)
    .select("id, campaign_id, npc_id_1, target_name, npc_id_2")
    .eq("id", relationId)
    .single();

  if (loadError || !relation) {
    console.error("❌ [deleteNPCRelation] Load Error:", loadError);
    throw new Error("Relation nicht gefunden.");
  }

  if (relation.campaign_id !== campaignId) {
    throw new Error("Relation gehört nicht zu dieser Kampagne.");
  }

  // 3. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann NPC-Relationen löschen.");
  }

  // 4. Lösche Relation
  const { error: deleteError } = await (supabase.from("npc_relations") as any)
    .delete()
    .eq("id", relationId);

  if (deleteError) {
    console.error("❌ [deleteNPCRelation] Delete Error:", deleteError);
    throw new Error(`Fehler beim Löschen der Relation: ${deleteError.message}`);
  }

  // 5. Revalidate beteiligte NPC-Seite (nur npc_id_1, da target_name kein NPC ist)
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${relation.npc_id_1}`);
  // Legacy: Falls npc_id_2 noch existiert, revalidate auch diese Seite
  if (relation.npc_id_2) {
    revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${relation.npc_id_2}`);
  }

  return true;
}

// ============================================================================
// Check if relation exists between two NPCs (für existierende NPCs)
// Prüft beide Richtungen: npc_id_1 -> npc_id_2 und npc_id_2 -> npc_id_1
// ============================================================================
export async function checkNPCRelationExists(
  campaignId: string,
  npcId1: string,
  npcId2: string
): Promise<boolean> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Prüfe, ob Relation existiert (beide Richtungen: npc_id_1 -> npc_id_2 und npc_id_2 -> npc_id_1)
  try {
    // Richtung 1: npc_id_1 = npcId1, npc_id_2 = npcId2
    const { data: relation1, error: error1 } = await (supabase.from("npc_relations") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("npc_id_1", npcId1)
      .eq("npc_id_2", npcId2)
      .maybeSingle();

    if (relation1) {
      return true;
    }

    // Richtung 2: npc_id_1 = npcId2, npc_id_2 = npcId1 (Symmetrie)
    const { data: relation2, error: error2 } = await (supabase.from("npc_relations") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("npc_id_1", npcId2)
      .eq("npc_id_2", npcId1)
      .maybeSingle();

    if (relation2) {
      return true;
    }

    // Prüfe auf Fehler (nur wenn beide Queries fehlschlagen)
    if (error1 && error2) {
      // Falls npc_id_2 nicht mehr existiert, gibt es keinen Fehler, sondern einfach kein Ergebnis
      if (
        (error1.code === "42703" || error1.message?.includes("column") || error1.message?.includes("does not exist")) &&
        (error2.code === "42703" || error2.message?.includes("column") || error2.message?.includes("does not exist"))
      ) {
        console.warn("⚠️ [checkNPCRelationExists] npc_id_2 field may not exist, returning false");
        return false;
      }
      console.error("❌ [checkNPCRelationExists] Error:", error1 || error2);
      return false;
    }

    return false;
  } catch (error) {
    console.error("❌ [checkNPCRelationExists] Error:", error);
    return false;
  }
}

// ============================================================================
// Check if hook relation exists (für Hooks mit target_name)
// ============================================================================
