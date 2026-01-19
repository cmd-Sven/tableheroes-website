import { createClient } from "@/src/lib/supabase/server";

type SiblingSuggestion = {
  siblingId: string;
  siblingName: string;
  suggestedRelationType: string;
};

const PARENT_KEYWORDS = ["vater", "mutter", "eltern", "father", "mother", "parent"];
const SIBLING_KEYWORDS = ["bruder", "schwester", "geschwister", "brother", "sister", "sibling"];

function isParentRelation(type: string | null | undefined) {
  if (!type) return false;
  const lower = String(type).toLowerCase();
  return PARENT_KEYWORDS.some((k) => lower.includes(k));
}

function isSiblingRelation(type: string | null | undefined) {
  if (!type) return false;
  const lower = type.toLowerCase();
  return SIBLING_KEYWORDS.some((k) => lower.includes(k));
}

export async function getSiblingParentSuggestions(
  campaignId: string,
  parentNpcId: string,
  childNpcId: string,
  relationType: string
): Promise<SiblingSuggestion[]> {
  const supabase = await createClient();

  if (!isParentRelation(relationType)) {
    return [];
  }

  // 1. Finde alle Beziehungen, an denen das Kind beteiligt ist (mögliche Geschwister)
  const { data: childRelsRaw, error } = await (supabase.from("npc_relations") as any)
    .select("npc_id_1, npc_id_2, relation_type")
    .eq("campaign_id", campaignId)
    .or(`npc_id_1.eq.${childNpcId},npc_id_2.eq.${childNpcId}`);

  // Expliziter Cast gegen 'never'
  const childRels = childRelsRaw as { npc_id_1: string; npc_id_2: string; relation_type: string }[] | null;

  if (error || !childRels) {
    console.error("❌ [getSiblingParentSuggestions] Fehler beim Laden der Child-Relationen:", error);
    return [];
  }

  const siblingIds = new Set<string>();
  for (const rel of childRels) {
    if (isSiblingRelation(rel.relation_type)) {
      const otherId =
        rel.npc_id_1 === childNpcId ? (rel.npc_id_2 as string) : (rel.npc_id_1 as string);
      if (otherId && otherId !== parentNpcId) {
        siblingIds.add(otherId);
      }
    }
  }

  if (siblingIds.size === 0) {
    return [];
  }

  // 2. Prüfe, ob bereits Eltern-Beziehungen zwischen Parent und den Geschwistern existieren
  const siblingIdArray = Array.from(siblingIds);
  const { data: existingRelsRaw, error: relErr } = await (supabase.from("npc_relations") as any)
    .select("npc_id_1, npc_id_2, relation_type")
    .eq("campaign_id", campaignId)
    .in("npc_id_1", [parentNpcId, ...siblingIdArray])
    .in("npc_id_2", [parentNpcId, ...siblingIdArray]);

  // Expliziter Cast gegen 'never'
  const existingRels = existingRelsRaw as { npc_id_1: string; npc_id_2: string; relation_type: string }[] | null;

  if (relErr) {
    console.error("❌ [getSiblingParentSuggestions] Fehler beim Laden bestehender Relationen:", relErr);
  }

  const alreadyLinked = new Set<string>();
  if (existingRels) {
    for (const r of existingRels) {
      const otherId = r.npc_id_1 === parentNpcId ? r.npc_id_2 : r.npc_id_1;
      if (isParentRelation(r.relation_type)) {
        alreadyLinked.add(otherId);
      }
    }
  }

  const missingSiblingIds = siblingIdArray.filter((id) => !alreadyLinked.has(id));

  if (missingSiblingIds.length === 0) {
    return [];
  }

  // 3. Lade die Namen der Geschwister
  const { data: siblingNpcsRaw, error: npcErr } = await (supabase.from("npcs") as any)
    .select("id, name")
    .in("id", missingSiblingIds);

  // Expliziter Cast gegen 'never'
  const siblingNpcs = siblingNpcsRaw as { id: string; name: string }[] | null;

  if (npcErr || !siblingNpcs) {
    console.error("❌ [getSiblingParentSuggestions] Fehler beim Laden der Geschwister-NPCs:", npcErr);
    return [];
  }

  return siblingNpcs.map((n: any) => ({
    siblingId: n.id as string,
    siblingName: n.name as string,
    suggestedRelationType: relationType,
  }));
}


