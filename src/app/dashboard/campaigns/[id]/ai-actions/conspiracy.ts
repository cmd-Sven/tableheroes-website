/**
 * AI conspiracy generation server actions linking campaign secrets.
 */
"use server";

import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  verifyGM
} from "./_shared";

export async function generateConspiracy(
  campaignId: string,
  entityId: string,
  entityType: "npc" | "faction" | "lore",
  radius: "LOKAL" | "FRAKTION" | "STADT" | "REGION" | "WELT"
): Promise<{
  title: string;
  content: string;
  meaning: string;
  secret_type: string;
  discovery_dc: number;
  selectedSecrets: Array<{ id: string; entity_name: string; title: string | null; content: string }>;
}> {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  let entitySheet = "";
  let entityName = "";
  let candidateSecrets: Array<{
    id: string;
    entity_id: string;
    entity_type: string;
    title: string | null;
    content: string;
    entity_name?: string;
  }> = [];

  // Lade Basis-Entität
  if (entityType === "npc") {
    const { data: npcRaw } = await (supabase.from("npcs") as any)
      .select("id, name, faction_id, current_location_id")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!npcRaw) throw new Error("NPC nicht gefunden.");
    entityName = npcRaw.name;

    // Radius-basierte Geheimnis-Sammlung
    if (radius === "LOKAL") {
      // Direkte Beziehungen
      const { data: relations } = await (supabase.from("npc_relations") as any)
        .select("npc_id_1, npc_id_2")
        .eq("campaign_id", campaignId)
        .or(`npc_id_1.eq.${entityId},npc_id_2.eq.${entityId}`)
        .limit(10);
      const partnerIds = relations
        ?.map((rel: any) => (rel.npc_id_1 === entityId ? rel.npc_id_2 : rel.npc_id_1))
        .filter((id: string) => id !== entityId) || [];
      if (partnerIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", [...partnerIds, entityId]);
        if (secrets) candidateSecrets.push(...secrets);
      }
    } else if (radius === "FRAKTION" && npcRaw.faction_id) {
      // Alle NPCs der Fraktion
      const { data: factionNPCs } = await (supabase.from("npcs") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("faction_id", npcRaw.faction_id)
        .limit(30);
      const factionNpcIds = factionNPCs?.map((n: any) => n.id) || [];
      if (factionNpcIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", factionNpcIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
      // Fraktions-Geheimnisse
      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", npcRaw.faction_id);
      if (factionSecrets) candidateSecrets.push(...factionSecrets);
    } else if (radius === "STADT" && npcRaw.current_location_id) {
      // NPCs am gleichen Standort
      const { data: locationNPCs } = await (supabase.from("npcs") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("current_location_id", npcRaw.current_location_id)
        .limit(30);
      const locationNpcIds = locationNPCs?.map((n: any) => n.id) || [];
      if (locationNpcIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", locationNpcIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
      // Lore am gleichen Standort
      const { data: locationLore } = await (supabase.from("world_lore") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("location_id", npcRaw.current_location_id)
        .limit(10);
      const locationLoreIds = locationLore?.map((l: any) => l.id) || [];
      if (locationLoreIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "lore")
          .in("entity_id", locationLoreIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
    } else if (radius === "REGION") {
      // Alle Geheimnisse der Kampagne (vereinfacht: Region = Kampagne)
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(100);
      if (secrets) candidateSecrets.push(...secrets);
    } else if (radius === "WELT") {
      // Alle Geheimnisse der Kampagne
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(200);
      if (secrets) candidateSecrets.push(...secrets);
    }
  } else if (entityType === "faction") {
    const { data: factionRaw } = await (supabase.from("factions") as any)
      .select("id, name")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!factionRaw) throw new Error("Fraktion nicht gefunden.");
    entityName = factionRaw.name;

    if (radius === "FRAKTION" || radius === "LOKAL") {
      // Mitglieder-NPCs
      const { data: memberNPCs } = await (supabase.from("npcs") as any)
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("faction_id", entityId)
        .limit(30);
      const memberIds = memberNPCs?.map((n: any) => n.id) || [];
      if (memberIds.length > 0) {
        const { data: secrets } = await (supabase.from("secrets") as any)
          .select("id, entity_id, entity_type, title, content")
          .eq("campaign_id", campaignId)
          .eq("entity_type", "npc")
          .in("entity_id", memberIds);
        if (secrets) candidateSecrets.push(...secrets);
      }
      // Fraktions-Geheimnisse
      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", entityId);
      if (factionSecrets) candidateSecrets.push(...factionSecrets);
    } else if (radius === "STADT" || radius === "REGION" || radius === "WELT") {
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(radius === "WELT" ? 200 : 100);
      if (secrets) candidateSecrets.push(...secrets);
    }
  } else {
    // LORE
    const { data: loreRaw } = await (supabase.from("world_lore") as any)
      .select("id, name, location_id")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!loreRaw) throw new Error("Lore-Eintrag nicht gefunden.");
    entityName = loreRaw.name;

    if (radius === "STADT" && loreRaw.location_id) {
      const { data: locationSecrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .or(`entity_type.eq.npc,entity_type.eq.lore`)
        .limit(50);
      // Filtere nach location_id (vereinfacht: alle)
      if (locationSecrets) candidateSecrets.push(...locationSecrets);
    } else {
      const { data: secrets } = await (supabase.from("secrets") as any)
        .select("id, entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .limit(radius === "WELT" ? 200 : 100);
      if (secrets) candidateSecrets.push(...secrets);
    }
  }

  // Entferne Duplikate und wähle 2-3 zufällig aus
  const uniqueSecrets = Array.from(
    new Map(candidateSecrets.map((s) => [s.id, s])).values()
  );
  if (uniqueSecrets.length === 0) {
    throw new Error(`Keine Geheimnisse im Radius "${radius}" gefunden.`);
  }

  const count = Math.min(3, Math.max(2, uniqueSecrets.length));
  const shuffled = [...uniqueSecrets].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Lade Entitäts-Namen
  const entityIds = [...new Set(selected.map((s) => s.entity_id))];
  const npcIds = entityIds.filter((id) => selected.some((s) => s.entity_id === id && s.entity_type === "npc"));
  const factionIds = entityIds.filter((id) => selected.some((s) => s.entity_id === id && s.entity_type === "faction"));
  const loreIds = entityIds.filter((id) => selected.some((s) => s.entity_id === id && s.entity_type === "lore"));

  const nameById: Record<string, string> = {};
  if (npcIds.length > 0) {
    const { data: npcs } = await (supabase.from("npcs") as any).select("id, name").in("id", npcIds);
    if (npcs) npcs.forEach((n: any) => { nameById[n.id] = n.name; });
  }
  if (factionIds.length > 0) {
    const { data: factions } = await (supabase.from("factions") as any).select("id, name").in("id", factionIds);
    if (factions) factions.forEach((f: any) => { nameById[f.id] = f.name; });
  }
  if (loreIds.length > 0) {
    const { data: lore } = await (supabase.from("world_lore") as any).select("id, name").in("id", loreIds);
    if (lore) lore.forEach((l: any) => { nameById[l.id] = l.name; });
  }

  const selectedWithNames = selected.map((s) => ({
    id: s.id,
    entity_name: nameById[s.entity_id] || (s.entity_type === "npc" ? "Unbekannter NPC" : s.entity_type === "faction" ? "Unbekannte Fraktion" : "Unbekanntes Lore"),
    title: s.title,
    content: s.content,
  }));

  // Baue Conspiracy-Prompt
  const conspiracySecretsText = selectedWithNames
    .map((s, idx) => {
      return `[Fragment ${idx + 1}] ${s.entity_name}: "${s.title || "Geheimnis"}"\n   ${s.content.substring(0, 400)}${s.content.length > 400 ? "..." : ""}`;
    })
    .join("\n\n");

  const systemPrompt = `
Du bist der Architekt einer Verschwörung in einem TTRPG-Setting.
Deine Aufgabe ist es, aus scheinbar unzusammenhängenden Geheimnissen eine verborgene, größere Wahrheit zu weben.

${worldContext}

=== AUSGEWÄHLTE FRAGMENTE (SCHEINBAR UNZUSAMMENHÄNGEND) ===
Hier sind ${selectedWithNames.length} zufällig ausgewählte Geheimnisse aus dem Radius "${radius}":

${conspiracySecretsText}

=== AUFGABE ===
Erstelle ein NEUES Geheimnis für ${entityType === "npc" ? "den NPC" : entityType === "faction" ? "die Fraktion" : "den Lore-Eintrag"} "${entityName}", das diese Fragmente logisch (oder auf schockierende Weise) miteinander verbindet.

Das neue Geheimnis soll:
- Eine verborgene Wahrheit offenbaren, die zeigt, dass diese Einzelelemente Teil eines größeren Musters sind.
- Einen kausalen oder thematischen Zusammenhang zwischen den Fragmenten herstellen.
- Den gewählten Radius respektieren: Ein lokales Geheimnis sollte keine weltbewegenden Folgen haben, eine weltweite Verschwörung hingegen schon.
- Konkret spielbar sein (keine vagen Allgemeinplätze).

DEFINITIONEN:
- "title": kurzer, prägnanter Titel (max. 80 Zeichen), z.B. "Das Netzwerk der Schatten" oder "Die verborgene Verbindung".
- "content": vollständige Beschreibung der Verschwörung in 4–10 Sätzen, die zeigt, wie die Fragmente zusammenhängen.
- "meaning": 2–3 Sätze, was diese Verschwörung KONKRET für die Kampagne bedeutet.
- "secret_type": eine Kategorie wie "Verschwörung", "Netzwerk", "Verbindung", "Wahrheit", "Muster".
- "discovery_dc": Schwierigkeit (10–25) für die Entdeckung dieser Verschwörung.

ANFORDERUNGEN:
- Sprache: Deutsch.
- discovery_dc MUSS eine GANZE ZAHL zwischen 10 und 25 sein.
- Das Geheimnis muss ALLE ${selectedWithNames.length} Fragmente in die Erklärung einbeziehen.

Antworte NUR mit gültigem JSON im Format:
{
  "title": "string",
  "content": "string",
  "meaning": "string",
  "secret_type": "string",
  "discovery_dc": 17
}
`;

  const userPrompt = `Erzeuge eine Verschwörung, die die ${selectedWithNames.length} Fragmente zu einem größeren Muster verbindet.`;

  const raw = await callOpenAI(systemPrompt, userPrompt);

  let title = String(raw.title || "").trim();
  let content = String(raw.content || "").trim();
  let meaning = String(raw.meaning || "").trim();
  let secret_type = String(raw.secret_type || "").trim() || "Verschwörung";
  let discovery_dc = Number(raw.discovery_dc ?? 15);

  if (!title) {
    title = `Verschwörung um ${entityName}`;
  }
  if (!content) {
    content = "Diese Verschwörung konnte nicht eindeutig generiert werden. Bitte generiere sie erneut.";
  }
  if (!meaning) {
    meaning = "Die genaue Bedeutung dieser Verschwörung sollte vom Game Master manuell ergänzt werden.";
  }

  if (Number.isNaN(discovery_dc)) {
    discovery_dc = 15;
  }
  discovery_dc = Math.max(10, Math.min(25, Math.round(discovery_dc)));

  return {
    title,
    content,
    meaning,
    secret_type,
    discovery_dc,
    selectedSecrets: selectedWithNames,
  };
}

// ------------------------------------------------------------------
// 2. NPC GENERATOR
// ------------------------------------------------------------------