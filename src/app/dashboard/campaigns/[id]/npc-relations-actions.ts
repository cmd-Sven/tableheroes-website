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
  targetNpcId: string,
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

  // 3. Verifiziere, dass beide NPCs existieren
  const { data: sourceNPC } = await (supabase.from("npcs") as any)
    .select("id, campaign_id")
    .eq("id", sourceNpcId)
    .single();

  const { data: targetNPC } = await (supabase.from("npcs") as any)
    .select("id, campaign_id")
    .eq("id", targetNpcId)
    .single();

  if (!sourceNPC || !targetNPC) {
    throw new Error("Einer der NPCs existiert nicht.");
  }

  if (sourceNPC.campaign_id !== campaignId || targetNPC.campaign_id !== campaignId) {
    throw new Error("NPCs gehören nicht zur gleichen Kampagne.");
  }

  // 4. Erstelle Relation in npc_relations (ZWINGEND ERFORDERLICH)
  // npc_id_1 = Ursprungs-NPC (z.B. Garrik), npc_id_2 = Neuer NPC (z.B. Kara)
  // WICHTIG: Hook-Löschung darf NUR nach erfolgreicher Relation-Erstellung erfolgen!
  try {
    const { error: relError, data: insertedRelation } = await (supabase.from("npc_relations") as any)
      .insert({
        campaign_id: campaignId, // WICHTIG: campaign_id muss explizit gesetzt werden
        npc_id_1: sourceNpcId,
        npc_id_2: targetNpcId,
        relation_type: hook.role,
        description: hook.description || null,
      })
      .select()
      .single();

    if (relError) {
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
      npc_id_2: insertedRelation.npc_id_2,
      relation_type: insertedRelation.relation_type,
    });

    // 5. NUR WENN RELATION ERFOLGREICH: Entferne Hook aus narrative_hooks des Ursprungs-NPCs
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
  } catch (error) {
    // Bei jedem Fehler: Hook bleibt erhalten, damit User es erneut versuchen kann
    console.error("❌ [createNPCRelationFromHook] Fehler:", error);
    throw error instanceof Error ? error : new Error("Unbekannter Fehler beim Erstellen der Relation.");
  }

  // 6. Revalidate
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${targetNpcId}`);
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

  // 2. Lade alle Relationen, bei denen die NPC-ID vorkommt (als npc_id_1 oder npc_id_2)
  // Verwende separate Queries für bessere Kompatibilität
  const { data: relations, error } = await (supabase.from("npc_relations") as any)
    .select("id, npc_id_1, npc_id_2, relation_type, description")
    .or(`npc_id_1.eq.${npcId},npc_id_2.eq.${npcId}`)
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("❌ [getNPCRelations] Error:", error);
    throw new Error(`Fehler beim Laden der Relationen: ${error.message}`);
  }

  // 3. Lade die Partner-NPCs separat
  const partnerIds = new Set<string>();
  (relations || []).forEach((rel: any) => {
    if (rel.npc_id_1 === npcId) {
      partnerIds.add(rel.npc_id_2);
    } else {
      partnerIds.add(rel.npc_id_1);
    }
  });

  // Lade alle Partner-NPCs in einem Query
  const { data: partnerNPCs } = await (supabase.from("npcs") as any)
    .select("id, name")
    .in("id", Array.from(partnerIds));

  const partnerMap = new Map(
    (partnerNPCs || []).map((npc: any) => [npc.id, npc.name])
  );

  // 4. Normalisiere die Daten: Bestimme den Partner-NPC und die Relation aus Sicht des aktuellen NPCs
  const normalizedRelations = (relations || []).map((rel: any) => {
    const isNpc1 = rel.npc_id_1 === npcId;
    const partnerId = isNpc1 ? rel.npc_id_2 : rel.npc_id_1;
    const partnerName = partnerMap.get(partnerId) || "Unbekannt";

    return {
      id: rel.id,
      partnerId,
      partnerName,
      relationType: rel.relation_type,
      description: rel.description,
    };
  });

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
// ============================================================================
export async function createNPCRelationManually(
  campaignId: string,
  sourceNpcId: string,
  targetNpcId: string,
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

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Nur der GM kann NPC-Relationen anlegen.");
  }

  // 3. Verifiziere, dass beide NPCs existieren
  const { data: sourceNPC } = await (supabase.from("npcs") as any)
    .select("id, campaign_id")
    .eq("id", sourceNpcId)
    .single();

  const { data: targetNPC } = await (supabase.from("npcs") as any)
    .select("id, campaign_id")
    .eq("id", targetNpcId)
    .single();

  if (!sourceNPC || !targetNPC) {
    throw new Error("Einer der NPCs existiert nicht.");
  }

  if (sourceNPC.campaign_id !== campaignId || targetNPC.campaign_id !== campaignId) {
    throw new Error("NPCs gehören nicht zur gleichen Kampagne.");
  }

  // 4. Prüfe, ob Relation bereits existiert
  const { data: existingRelation } = await (supabase.from("npc_relations") as any)
    .select("id, relation_type")
    .or(`and(npc_id_1.eq.${sourceNpcId},npc_id_2.eq.${targetNpcId}),and(npc_id_1.eq.${targetNpcId},npc_id_2.eq.${sourceNpcId})`)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  // Wenn Relation bereits existiert: Aktualisiere sie mit dem neuen Typ oder gib sie zurück
  if (existingRelation) {
    // Prüfe, ob der Typ sich geändert hat
    if (existingRelation.relation_type !== relationType) {
      // Aktualisiere die bestehende Relation
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
      revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${targetNpcId}`);

      return updatedRelation;
    } else {
      // Relation existiert bereits mit demselben Typ - gib sie still zurück
      const { data: relation } = await (supabase.from("npc_relations") as any)
        .select()
        .eq("id", existingRelation.id)
        .single();

      return relation;
    }
  }

  // 5. Erstelle neue Relation
  const { error: relError, data: insertedRelation } = await (supabase.from("npc_relations") as any)
    .insert({
      campaign_id: campaignId,
      npc_id_1: sourceNpcId,
      npc_id_2: targetNpcId,
      relation_type: relationType,
      description: description || null,
    })
    .select()
    .single();

  if (relError) {
    console.error("❌ [createNPCRelationManually] Relation Error:", relError);
    throw new Error(`Fehler beim Erstellen der Relation: ${relError.message}`);
  }

  // 6. Revalidate
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${sourceNpcId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${targetNpcId}`);

  return insertedRelation;
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
    .select("id, campaign_id, npc_id_1, npc_id_2")
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

  // 5. Revalidate beide beteiligten NPC-Seiten
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${relation.npc_id_1}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/npcs/${relation.npc_id_2}`);

  return true;
}

// ============================================================================
// Check if relation exists between two NPCs
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

  // 2. Prüfe beide Richtungen (npc_id_1/npc_id_2 und umgekehrt)
  const { data: relation, error } = await (supabase.from("npc_relations") as any)
    .select("id")
    .or(`and(npc_id_1.eq.${npcId1},npc_id_2.eq.${npcId2}),and(npc_id_1.eq.${npcId2},npc_id_2.eq.${npcId1})`)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) {
    console.error("❌ [checkNPCRelationExists] Error:", error);
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

