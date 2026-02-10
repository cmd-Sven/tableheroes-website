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
export async function createNPCRelationFromHook(
  campaignId: string,
  sourceNpcId: string,
  targetName: string, // Name des Hooks (z.B. "Sandra"), nicht mehr targetNpcId
  hook: NarrativeHook
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

  // 4. Prüfe, ob Relation bereits existiert (Duplicate Check)
  const { data: existingRelation } = await (supabase.from("npc_relations") as any)
    .select("id, relation_type")
    .eq("campaign_id", campaignId)
    .eq("npc_id_1", sourceNpcId)
    .eq("target_name", targetName.trim())
    .eq("relation_type", hook.role)
    .maybeSingle();

  if (existingRelation) {
    console.log("ℹ️ [createNPCRelationFromHook] Relation existiert bereits:", {
      campaignId,
      sourceNpcId,
      targetName,
      relationType: hook.role,
    });

    const { data: relation } = await (supabase.from("npc_relations") as any)
      .select()
      .eq("id", existingRelation.id)
      .single();

    return {
      success: true,
      alreadyExisted: true,
      relation,
    };
  }

  // 5. Erstelle Relation in npc_relations
  // npc_id_1 = Ursprungs-NPC (z.B. Garrik), target_name = Name des Hooks (z.B. "Sandra")
  // WICHTIG: Hook-Löschung darf NUR nach erfolgreicher Relation-Erstellung erfolgen!
  try {
    const { error: relError, data: insertedRelation } = await (supabase.from("npc_relations") as any)
      .insert({
        campaign_id: campaignId, // WICHTIG: campaign_id muss explizit gesetzt werden
        npc_id_1: sourceNpcId,
        target_name: targetName.trim(),
        relation_type: hook.role,
        description: hook.description || null,
      })
      .select()
      .single();

    // Error 23505 = Unique Constraint Violation (PostgreSQL)
    if (relError) {
      // Prüfe auf Unique Constraint Violation
      if (relError.code === "23505" || relError.message?.includes("unique constraint") || relError.message?.includes("duplicate key")) {
        console.log("ℹ️ [createNPCRelationFromHook] Unique Constraint - Relation existiert bereits:", {
          campaignId,
          sourceNpcId,
          targetName,
          relationType: hook.role,
        });

        // Lade die existierende Relation
        const { data: existing } = await (supabase.from("npc_relations") as any)
          .select()
          .eq("campaign_id", campaignId)
          .eq("npc_id_1", sourceNpcId)
          .eq("target_name", targetName.trim())
          .eq("relation_type", hook.role)
          .maybeSingle();

        if (existing) {
          return {
            success: true,
            alreadyExisted: true,
            relation: existing,
          };
        }
      }

      console.error("❌ [createNPCRelationFromHook] Relation Error:", relError);
      // FEHLER: Relation konnte nicht erstellt werden - Hook bleibt erhalten
      throw new Error(`Fehler beim Erstellen der Relation: ${relError.message}. Der Hook bleibt erhalten, damit Sie es erneut versuchen können.`);
    }

    if (!insertedRelation) {
      throw new Error("Relation wurde erstellt, aber keine Daten zurückgegeben.");
    }

    console.log("✅ [createNPCRelationFromHook] Relation erfolgreich erstellt:", {
      id: insertedRelation.id,
      campaign_id: insertedRelation.campaign_id,
      npc_id_1: insertedRelation.npc_id_1,
      target_name: insertedRelation.target_name,
      relation_type: insertedRelation.relation_type,
    });

    // 6. NUR WENN RELATION ERFOLGREICH: Entferne Hook aus narrative_hooks des Ursprungs-NPCs
    const { data: npc } = await (supabase.from("npcs") as any)
      .select("narrative_hooks")
      .eq("id", sourceNpcId)
      .single();

    if (npc?.narrative_hooks) {
      const hooks = npc.narrative_hooks as NarrativeHook[];
      const updatedHooks = hooks.filter(
        (h: NarrativeHook) =>
          !(
            (h.name === hook.name || (!h.name && !hook.name)) &&
            h.role === hook.role &&
            h.description === hook.description
          )
      );

      const { error: updateError } = await (supabase.from("npcs") as any)
        .update({ narrative_hooks: updatedHooks.length > 0 ? updatedHooks : null })
        .eq("id", sourceNpcId);

      if (updateError) {
        console.error("❌ [createNPCRelationFromHook] Update Hook Error:", updateError);
        // Warnung, aber kein Fehler - Relation wurde bereits erstellt
        console.warn("⚠️ Relation wurde erstellt, aber Hook konnte nicht entfernt werden:", updateError.message);
      }
    }

    return {
      success: true,
      alreadyExisted: false,
      relation: insertedRelation,
    };
  } catch (error) {
    // Bei jedem Fehler: Hook bleibt erhalten, damit User es erneut versuchen kann
    console.error("❌ [createNPCRelationFromHook] Fehler:", error);
    throw error instanceof Error ? error : new Error("Unbekannter Fehler beim Erstellen der Relation.");
  }

  // 7. Revalidate
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
}

// ============================================================================
// Get NPC Relations
// ============================================================================
export async function getNPCRelations(
  campaignId: string,
  npcId: string
) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Lade alle Relationen, bei denen die NPC-ID als npc_id_1 ODER npc_id_2 vorkommt
  // Nutze .or() für optimierte bidirektionale Abfrage
  const { data: relations, error } = await (supabase.from("npc_relations") as any)
    .select("id, npc_id_1, target_name, relation_type, description, npc_id_2")
    .eq("campaign_id", campaignId)
    .or(`npc_id_1.eq.${npcId},npc_id_2.eq.${npcId}`);

  if (error) {
    console.error("❌ [getNPCRelations] Error:", error);
    throw new Error(`Fehler beim Laden der Relationen: ${error.message}`);
  }

  // Entferne Duplikate basierend auf Relation-ID (falls vorhanden)
  const uniqueRelations = Array.from(
    new Map((relations || []).map((rel: any) => [rel.id, rel])).values()
  );

  // 3. Normalisiere die Daten: Unterscheide zwischen target_name (Hook) und npc_id_2 (existierender NPC)
  // PRIORITÄT: npc_id_2 (echter NPC) > target_name (Hook)
  // Wenn beides vorhanden ist, zeige nur die echte NPC-Relation, nicht den Hook
  const normalizedRelations = uniqueRelations.map((rel: any) => {
    const isCurrentNpcNpc1 = rel.npc_id_1 === npcId;
    
    // PRIORITÄT: Falls npc_id_2 vorhanden ist, behandle als echte NPC-Relation (NICHT als Hook)
    if (rel.npc_id_2) {
      const partnerId = isCurrentNpcNpc1 ? rel.npc_id_2 : rel.npc_id_1;
      return {
        id: rel.id,
        partnerId: partnerId,
        partnerName: "Unbekannt", // Wird später geladen, falls nötig
        relationType: rel.relation_type,
        description: rel.description,
        isHook: false, // Echter NPC, kein Hook
      };
    }
    
    // Nur wenn KEIN npc_id_2 vorhanden ist, nutze target_name als Hook
    if (rel.target_name) {
      return {
        id: rel.id,
        partnerId: null, // Hook hat noch keine NPC-ID
        partnerName: rel.target_name,
        relationType: rel.relation_type,
        description: rel.description,
        isHook: true, // Flag, um zu markieren, dass dies ein Hook ist
      };
    }

    // Fallback: Wenn weder target_name noch npc_id_2 vorhanden
    return {
      id: rel.id,
      partnerId: null,
      partnerName: "Unbekannt",
      relationType: rel.relation_type,
      description: rel.description,
      isHook: false,
    };
  });

  // 4. Lade NPC-Daten (Name + Avatar) für Relationen mit npc_id_2 (falls vorhanden)
  const relationsWithNpcId = normalizedRelations.filter((rel: any) => rel.partnerId && !rel.isHook);
  if (relationsWithNpcId.length > 0) {
    const partnerIds = relationsWithNpcId.map((rel: any) => rel.partnerId).filter(Boolean);
    if (partnerIds.length > 0) {
      const { data: partnerNPCs } = await (supabase.from("npcs") as any)
        .select("id, name, image_url")
        .in("id", partnerIds);

      const partnerMap = new Map<string, { name: string; image_url: string | null }>(
        (partnerNPCs || []).map((npc: any) => [npc.id, { name: npc.name, image_url: npc.image_url }])
      );

      // Aktualisiere die Namen und Avatare für Relationen mit npc_id_2
      normalizedRelations.forEach((rel: any) => {
        if (rel.partnerId && !rel.isHook) {
          const partnerData = partnerMap.get(rel.partnerId);
          if (partnerData) {
            rel.partnerName = partnerData.name;
            rel.partnerImageUrl = partnerData.image_url;
          } else {
            rel.partnerName = "Unbekannt";
          }
        }
      });
    }
  }

  return normalizedRelations;
}

// ============================================================================
// Check if NPC exists by name
// ============================================================================
export async function findNPCByName(
  campaignId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Suche nach NPC mit exaktem Namen (case-insensitive)
  const { data: npc, error } = await (supabase.from("npcs") as any)
    .select("id, name")
    .eq("campaign_id", campaignId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (error) {
    console.error("❌ [findNPCByName] Error:", error);
    return null;
  }

  if (!npc || !npc.id || !npc.name) {
    return null;
  }

  return { id: npc.id, name: npc.name };
}

// ============================================================================
// Create NPC Relation manually (für "Heilung" fehlender Relationen)
// Unterstützt jetzt sowohl targetNpcId (für existierende NPCs) als auch targetName (für Hooks)
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
export async function checkNPCHookRelationExists(
  campaignId: string,
  npcId: string,
  targetName: string,
  relationType: string
): Promise<boolean> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Prüfe, ob Hook-Relation existiert
  const { data: relation, error } = await (supabase.from("npc_relations") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("npc_id_1", npcId)
    .eq("target_name", targetName.trim())
    .eq("relation_type", relationType)
    .maybeSingle();

  if (error) {
    console.error("❌ [checkNPCHookRelationExists] Error:", error);
    return false;
  }

  return !!relation;
}

// ============================================================================
// Suggest Inference Relations (Transitive Family Logic)
// ============================================================================
type InferenceSuggestion = {
  sourceNpcId: string;
  targetNpcId: string;
  relationType: string;
  reason: string; // z.B. "Partner von X + Vater von X = Schwiegerkind"
};

const PARENT_KEYWORDS = ["vater", "mutter", "eltern", "father", "mother", "parent"];
const SIBLING_KEYWORDS = ["bruder", "schwester", "geschwister", "brother", "sister", "sibling"];
const PARTNER_KEYWORDS = ["ehepartner", "partner", "gatte", "gattin", "spouse", "partner"];
const CHILD_KEYWORDS = ["sohn", "tochter", "kind", "son", "daughter", "child"];

function isParentRelation(type: string | null | undefined): boolean {
  if (!type) return false;
  const lower = String(type).toLowerCase();
  return PARENT_KEYWORDS.some((k) => lower.includes(k));
}

function isSiblingRelation(type: string | null | undefined): boolean {
  if (!type) return false;
  const lower = String(type).toLowerCase();
  return SIBLING_KEYWORDS.some((k) => lower.includes(k));
}

function isPartnerRelation(type: string | null | undefined): boolean {
  if (!type) return false;
  const lower = String(type).toLowerCase();
  return PARTNER_KEYWORDS.some((k) => lower.includes(k));
}

function isChildRelation(type: string | null | undefined): boolean {
  if (!type) return false;
  const lower = String(type).toLowerCase();
  return CHILD_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Generiert transitive Beziehungs-Vorschläge basierend auf einer neuen Primär-Beziehung.
 * 
 * Beispiele:
 * - A ist Ehepartner von B, B hat Vater C → A ist Schwiegerkind von C
 * - A ist Vater von B, B hat Bruder C → A ist Vater von C (via getSiblingParentSuggestions)
 * - A ist Ehepartner von B, B hat Bruder C → A ist Schwager/Schwägerin von C
 */
export async function suggestInferenceRelations(
  campaignId: string,
  sourceNpcId: string, // Der neue NPC (A)
  targetNpcId: string, // Der Ziel-NPC (B), mit dem A verknüpft wird
  relationType: string // Die neue Primär-Beziehung (z.B. "Ehepartner", "Vater")
): Promise<InferenceSuggestion[]> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const suggestions: InferenceSuggestion[] = [];

  // 2. Lade alle bestehenden Relationen des Ziel-NPCs (B)
  const { data: targetRels, error: relError } = await (supabase.from("npc_relations") as any)
    .select("npc_id_1, npc_id_2, relation_type")
    .eq("campaign_id", campaignId)
    .or(`npc_id_1.eq.${targetNpcId},npc_id_2.eq.${targetNpcId}`);

  if (relError || !targetRels) {
    console.error("❌ [suggestInferenceRelations] Fehler beim Laden der Ziel-Relationen:", relError);
    return [];
  }

  // 3. Normalisiere die Relationen: Finde den Partner-NPC für jede Relation
  for (const rel of targetRels) {
    const otherNpcId = rel.npc_id_1 === targetNpcId ? rel.npc_id_2 : rel.npc_id_1;
    if (!otherNpcId || otherNpcId === sourceNpcId) continue; // Überspringe uns selbst

    const otherRelationType = rel.relation_type;

    // Fall 1: A ist Ehepartner von B, B hat Eltern C → A ist Schwiegerkind von C
    if (isPartnerRelation(relationType) && isParentRelation(otherRelationType)) {
      suggestions.push({
        sourceNpcId,
        targetNpcId: otherNpcId as string,
        relationType: "Schwiegerkind",
        reason: `Partner von ${targetNpcId} + ${otherRelationType} von ${targetNpcId} = Schwiegerkind`,
      });
    }

    // Fall 2: A ist Ehepartner von B, B hat Bruder/Schwester C → A ist Schwager/Schwägerin von C
    if (isPartnerRelation(relationType) && isSiblingRelation(otherRelationType)) {
      suggestions.push({
        sourceNpcId,
        targetNpcId: otherNpcId as string,
        relationType: "Schwager/Schwägerin",
        reason: `Partner von ${targetNpcId} + ${otherRelationType} von ${targetNpcId} = Schwager/Schwägerin`,
      });
    }

    // Fall 3: A ist Ehepartner von B, B hat Kind C → A ist Schwiegereltern von C (wenn A der Partner ist)
    // (Dieser Fall ist etwas komplexer, da wir prüfen müssen, ob A tatsächlich der Partner ist)
    // Für jetzt überspringen wir diesen Fall, da er weniger häufig ist.

    // Fall 4: A ist Vater/Mutter von B, B hat Bruder/Schwester C → A ist auch Vater/Mutter von C
    // (Dies wird bereits von getSiblingParentSuggestions abgedeckt, aber wir können es hier auch prüfen)
    if (isParentRelation(relationType) && isSiblingRelation(otherRelationType)) {
      // Prüfe, ob bereits eine Eltern-Beziehung zwischen A und C existiert
      const { data: existingParentRel } = await (supabase.from("npc_relations") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .or(`and(npc_id_1.eq.${sourceNpcId},npc_id_2.eq.${otherNpcId}),and(npc_id_1.eq.${otherNpcId},npc_id_2.eq.${sourceNpcId})`)
        .maybeSingle();

      if (!existingParentRel) {
        suggestions.push({
          sourceNpcId,
          targetNpcId: otherNpcId as string,
          relationType: relationType, // Gleicher Typ wie die Primär-Beziehung
          reason: `${relationType} von ${targetNpcId} + ${otherRelationType} von ${targetNpcId} = ${relationType} von Geschwister`,
        });
      }
    }

    // Fall 5: A ist Kind von B, B hat Partner C → A ist Schwiegerkind von C
    if (isChildRelation(relationType) && isPartnerRelation(otherRelationType)) {
      suggestions.push({
        sourceNpcId,
        targetNpcId: otherNpcId as string,
        relationType: "Schwiegerkind",
        reason: `Kind von ${targetNpcId} + Partner von ${targetNpcId} = Schwiegerkind`,
      });
    }
  }

  // 4. Entferne Duplikate (gleiche sourceNpcId + targetNpcId Kombination)
  const uniqueSuggestions = suggestions.filter(
    (s: InferenceSuggestion, index: number, self: InferenceSuggestion[]) =>
      index ===
      self.findIndex(
        (t: InferenceSuggestion) => t.sourceNpcId === s.sourceNpcId && t.targetNpcId === s.targetNpcId
      )
  );

  // 5. Prüfe, ob die Vorschläge bereits existieren
  const validatedSuggestions: InferenceSuggestion[] = [];
  for (const suggestion of uniqueSuggestions) {
    const exists = await checkNPCRelationExists(
      campaignId,
      suggestion.sourceNpcId,
      suggestion.targetNpcId
    );
    if (!exists) {
      validatedSuggestions.push(suggestion);
    }
  }

  // 6. Lade NPC-Namen für bessere Lesbarkeit der "reason"
  if (validatedSuggestions.length > 0) {
    const npcIds = new Set<string>();
    validatedSuggestions.forEach((s: InferenceSuggestion) => {
      npcIds.add(s.sourceNpcId);
      npcIds.add(s.targetNpcId);
      npcIds.add(targetNpcId);
    });

    const { data: npcs } = await (supabase.from("npcs") as any)
      .select("id, name")
      .in("id", Array.from(npcIds));

    if (npcs) {
      const nameMap = new Map((npcs || []).map((n: any) => [n.id, n.name]));
      validatedSuggestions.forEach((s: InferenceSuggestion) => {
        const sourceName = nameMap.get(s.sourceNpcId) || s.sourceNpcId;
        const targetName = nameMap.get(s.targetNpcId) || s.targetNpcId;
        const targetRelName = nameMap.get(targetNpcId) || targetNpcId;
        s.reason = `${sourceName} ist ${relationType} von ${targetRelName}, ${targetRelName} hat ${s.relationType} ${targetName}`;
      });
    }
  }

  return validatedSuggestions;
}

/**
 * Generiert Vorschläge basierend auf den bestehenden Relationen eines Ziel-NPCs.
 * Diese Funktion wird verwendet, wenn der source NPC noch nicht existiert (z.B. im Wizard).
 * 
 * @param campaignId - Die Kampagnen-ID
 * @param targetNpcId - Der Ziel-NPC, dessen Relationen geprüft werden
 * @param relationType - Der gewählte Relationstyp (z.B. "Ehepartner", "Vater")
 * @returns Array von Vorschlägen mit targetNpcId und relationType
 */
export async function suggestInferenceRelationsForTarget(
  campaignId: string,
  targetNpcId: string,
  relationType: string
): Promise<Array<{ targetNpcId: string; relationType: string; reason: string; targetName: string }>> {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const suggestions: Array<{ targetNpcId: string; relationType: string; reason: string; targetName: string }> = [];

  // 2. Lade alle bestehenden Relationen des Ziel-NPCs
  const { data: targetRels, error: relError } = await (supabase.from("npc_relations") as any)
    .select("npc_id_1, npc_id_2, relation_type")
    .eq("campaign_id", campaignId)
    .or(`npc_id_1.eq.${targetNpcId},npc_id_2.eq.${targetNpcId}`);

  if (relError || !targetRels) {
    console.error("❌ [suggestInferenceRelationsForTarget] Fehler beim Laden der Ziel-Relationen:", relError);
    return [];
  }

  // 3. Lade NPC-Namen für bessere Lesbarkeit
  const npcIds = new Set<string>([targetNpcId]);
  targetRels.forEach((rel: any) => {
    npcIds.add(rel.npc_id_1 as string);
    npcIds.add(rel.npc_id_2 as string);
  });

  const { data: npcs } = await (supabase.from("npcs") as any)
    .select("id, name")
    .in("id", Array.from(npcIds));

  const nameMap = new Map((npcs || []).map((n: any) => [n.id, n.name]));
  const targetName = nameMap.get(targetNpcId) || targetNpcId;

  // 4. Normalisiere die Relationen: Finde den Partner-NPC für jede Relation
  for (const rel of targetRels) {
    const otherNpcId = rel.npc_id_1 === targetNpcId ? rel.npc_id_2 : rel.npc_id_1;
    if (!otherNpcId) continue;

    const otherRelationType = rel.relation_type;
    const otherName = nameMap.get(otherNpcId as string) || otherNpcId;

    // Fall 1: A ist Ehepartner von B, B hat Eltern C → A ist Schwiegerkind von C
    if (isPartnerRelation(relationType) && isParentRelation(otherRelationType)) {
      suggestions.push({
        targetNpcId: otherNpcId as string,
        relationType: "Schwiegerkind",
        reason: `Partner von ${targetName} + ${otherRelationType} von ${targetName} = Schwiegerkind`,
        targetName: otherName,
      });
    }

    // Fall 2: A ist Ehepartner von B, B hat Bruder/Schwester C → A ist Schwager/Schwägerin von C
    if (isPartnerRelation(relationType) && isSiblingRelation(otherRelationType)) {
      suggestions.push({
        targetNpcId: otherNpcId as string,
        relationType: "Schwager/Schwägerin",
        reason: `Partner von ${targetName} + ${otherRelationType} von ${targetName} = Schwager/Schwägerin`,
        targetName: otherName,
      });
    }

    // Fall 3: A ist Vater/Mutter von B, B hat Bruder/Schwester C → A ist auch Vater/Mutter von C
    if (isParentRelation(relationType) && isSiblingRelation(otherRelationType)) {
      suggestions.push({
        targetNpcId: otherNpcId as string,
        relationType: relationType, // Gleicher Typ wie die Primär-Beziehung
        reason: `${relationType} von ${targetName} + ${otherRelationType} von ${targetName} = ${relationType} von Geschwister`,
        targetName: otherName,
      });
    }

    // Fall 4: A ist Kind von B, B hat Partner C → A ist Schwiegerkind von C
    if (isChildRelation(relationType) && isPartnerRelation(otherRelationType)) {
      suggestions.push({
        targetNpcId: otherNpcId as string,
        relationType: "Schwiegerkind",
        reason: `Kind von ${targetName} + Partner von ${targetName} = Schwiegerkind`,
        targetName: otherName,
      });
    }
  }

  // 5. Entferne Duplikate
  const uniqueSuggestions = suggestions.filter(
    (s: { targetNpcId: string; relationType: string; reason: string; targetName: string }, index: number, self: typeof suggestions) =>
      index === self.findIndex((t: typeof s) => t.targetNpcId === s.targetNpcId)
  );

  // 6. Prüfe, ob die Vorschläge bereits existieren (optional, da source NPC noch nicht existiert)
  // Wir überspringen diese Prüfung hier, da der source NPC noch nicht existiert

  return uniqueSuggestions;
}

// ============================================================================
// Promote Hook to Full NPC
// ============================================================================
/**
 * Wandelt einen Text-Hook (target_name) in einen vollwertigen NPC um.
 * 
 * Ablauf:
 * 1. Erstellt den neuen NPC in der Tabelle `npcs`
 * 2. Findet alle Relationen mit `target_name` = hookName und `npc_id_1` = sourceNpcId
 * 3. Aktualisiert diese Relationen: Setzt `npc_id_2` auf die neue NPC-ID
 * 4. Entfernt `target_name` aus den Relationen (optional, kann als Fallback behalten werden)
 */
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
      is_revealed: npcData.is_revealed ?? false,
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
