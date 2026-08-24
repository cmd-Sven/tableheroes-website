/**
 * npc-relations-actions — part 3: checkNPCHookRelationExists, suggestInferenceRelations, suggestInferenceRelationsForTarget.
 */
"use server";

import { checkNPCRelationExists } from "./part-02";

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
