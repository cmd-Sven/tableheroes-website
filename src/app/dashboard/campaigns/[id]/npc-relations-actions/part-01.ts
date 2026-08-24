/**
 * npc-relations-actions — part 1: createNPCRelationFromHook, getNPCRelations, findNPCByName.
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

  const [{ data: campaignRaw }, { data: profileRaw }] = await Promise.all([
    (supabase.from("campaigns") as any)
      .select("gm_id")
      .eq("id", campaignId)
      .single(),
    (supabase.from("users") as any)
      .select("primary_role")
      .eq("id", user.id)
      .single(),
  ]);
  const campaign = campaignRaw as { gm_id: string } | null;
  const profile = profileRaw as { primary_role: string } | null;
  const canSeeGmNotes =
    campaign?.gm_id === user.id || profile?.primary_role === "Admin";

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

  if (!canSeeGmNotes) {
    return normalizedRelations.map((rel: any) => ({
      ...rel,
      description: null,
    }));
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
