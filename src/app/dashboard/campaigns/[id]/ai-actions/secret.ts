/**
 * AI secret generation server actions for campaign entities.
 */
"use server";

import { getNPCRelations } from "../npc-relations-actions";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  verifyGM,
} from "./_shared";

export async function generateSecret(
  campaignId: string,
  entityId: string,
  entityType: "npc" | "faction" | "lore",
  contextSecrets?: Array<{ id: string; isPrioritized: boolean }>
): Promise<{
  title: string;
  content: string;
  meaning: string;
  secret_type: string;
  discovery_dc: number;
}> {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  let entitySheet = "";
  let specificContext = "";
  let entityName = "";

  if (entityType === "npc") {
    // NPC: Lade Stammdaten, Fraktion, Standort, Beziehungen
    const { data: npcRaw, error: npcError } = await (supabase.from("npcs") as any)
      .select(
        `
        id,
        name,
        race,
        alignment,
        description,
        gm_notes,
        faction_id,
        current_location_id
      `
      )
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (npcError || !npcRaw) {
      throw new Error("NPC für Secret-Generierung nicht gefunden.");
    }

    const npc = npcRaw as {
      id: string;
      name: string;
      race: string | null;
      alignment: string | null;
      description: string | null;
      gm_notes: string | null;
      faction_id: string | null;
      current_location_id: string | null;
    };

    entityName = npc.name;
    entitySheet = `\n=== NPC STAMMBLATT ===
Name: ${npc.name}
Rasse: ${npc.race || "Unbekannt"}
Gesinnung: ${npc.alignment || "Unbekannt"}
Öffentliche Beschreibung: ${npc.description || "Keine öffentliche Beschreibung hinterlegt."}
GM-Notizen (intern): ${npc.gm_notes || "Keine GM-Notizen hinterlegt."}
`;

    // Fraktion laden
    if (npc.faction_id) {
      const { data: factionRaw } = await (supabase.from("factions") as any)
        .select("name, type, description, philosophy, appearance")
        .eq("id", npc.faction_id)
        .maybeSingle();

      if (factionRaw) {
        specificContext += `\n=== FRAKTION DES NPC ===
Name: ${factionRaw.name || "Unbekannt"}${factionRaw.type ? ` (${factionRaw.type})` : ""}
Philosophie: ${factionRaw.philosophy || "Keine explizite Philosophie hinterlegt."}
Erscheinungsbild: ${factionRaw.appearance || "Kein spezielles Erscheinungsbild hinterlegt."}
Beschreibung: ${factionRaw.description || "Keine Fraktionsbeschreibung hinterlegt."}
`;
      }
    }

    // Standort laden
    if (npc.current_location_id) {
      const { data: locationRaw } = await (supabase.from("locations") as any)
        .select("name, type, description")
        .eq("id", npc.current_location_id)
        .maybeSingle();

      if (locationRaw) {
        specificContext += `\n=== STANDORT DES NPC ===
Ort: ${locationRaw.name || "Unbekannt"}${locationRaw.type ? ` (${locationRaw.type})` : ""}
Beschreibung: ${locationRaw.description || "Keine Ortsbeschreibung hinterlegt."}
`;
      }
    }

    // NPC-Beziehungen laden
    let partnerNpcIds: string[] = [];
    try {
      const relations = await getNPCRelations(campaignId, entityId);
      const realRelations = (relations || []).filter((rel: any) => !rel.isHook && rel.partnerName);

      if (realRelations.length > 0) {
        specificContext += "\n=== BEZIEHUNGEN DES NPC ===\n";
        for (const rel of realRelations) {
          specificContext += `- ${rel.partnerName}: ${rel.relationType}${rel.description ? ` (${rel.description})` : ""}\n`;
          if (rel.partnerId) partnerNpcIds.push(rel.partnerId);
        }
      }
    } catch (error) {
      console.warn("[generateSecret] Konnte NPC-Beziehungen nicht laden:", error);
    }

    // Verwandte Geheimnisse: Partner-NPCs (entity_type=npc) + Fraktion (entity_type=faction)
    const partnerSecretsList: { entity_id: string; entity_type: string; title: string | null; content: string }[] = [];

    if (partnerNpcIds.length > 0) {
      const { data: npcSecrets } = await (supabase.from("secrets") as any)
        .select("entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "npc")
        .in("entity_id", partnerNpcIds);
      if (npcSecrets?.length) partnerSecretsList.push(...npcSecrets);
    }

    if (npc.faction_id) {
      const { data: factionSecrets } = await (supabase.from("secrets") as any)
        .select("entity_id, entity_type, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "faction")
        .eq("entity_id", npc.faction_id);
      if (factionSecrets?.length) partnerSecretsList.push(...factionSecrets);
    }

    if (partnerSecretsList.length > 0) {
      const npcIds = partnerNpcIds;
      const factionIds = npc.faction_id ? [npc.faction_id] : [];
      const { data: npcNames } = npcIds.length > 0
        ? await (supabase.from("npcs") as any).select("id, name").in("id", npcIds)
        : { data: [] };
      const { data: factionNames } = factionIds.length > 0
        ? await (supabase.from("factions") as any).select("id, name").in("id", factionIds)
        : { data: [] };

      const nameById: Record<string, string> = {};
      (npcNames || []).forEach((n: any) => { nameById[n.id] = n.name; });
      (factionNames || []).forEach((f: any) => { nameById[f.id] = f.name; });

      specificContext += "\n=== BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE) ===\n";
      specificContext += "Geheimnisse von Personen oder Organisationen, die mit diesem NPC verknüpft sind:\n\n";
      for (const s of partnerSecretsList) {
        const ownerName = nameById[s.entity_id] || (s.entity_type === "npc" ? "Ein Bekannter" : "Seine Fraktion");
        specificContext += `- [${ownerName}] "${s.title || "Geheimnis"}: ${(s.content || "").substring(0, 200)}${(s.content || "").length > 200 ? "..." : ""}"\n`;
      }
    }

  } else if (entityType === "faction") {
    // FACTION: Lade Ziele, Philosophie, Feindbilder, Mitglieder
    const { data: factionRaw, error: factionError } = await (supabase.from("factions") as any)
      .select(
        `
        id,
        name,
        type,
        description,
        philosophy,
        structure,
        gm_notes,
        appearance
      `
      )
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (factionError || !factionRaw) {
      throw new Error("Fraktion für Secret-Generierung nicht gefunden.");
    }

    const faction = factionRaw as {
      id: string;
      name: string;
      type: string | null;
      description: string | null;
      philosophy: string | null;
      structure: string | null;
      gm_notes: string | null;
      appearance: string | null;
    };

    entityName = faction.name;
    entitySheet = `\n=== FRAKTION STAMMBLATT ===
Name: ${faction.name}
Typ: ${faction.type || "Unbekannt"}
Beschreibung: ${faction.description || "Keine Beschreibung hinterlegt."}
Philosophie: ${faction.philosophy || "Keine explizite Philosophie hinterlegt."}
Struktur: ${faction.structure || "Keine Struktur-Beschreibung hinterlegt."}
Erscheinungsbild: ${faction.appearance || "Kein spezielles Erscheinungsbild hinterlegt."}
GM-Notizen (intern): ${faction.gm_notes || "Keine GM-Notizen hinterlegt."}
`;

    // Lade Fraktions-Beziehungen (ohne Join – Schema-Cache)
    const { data: factionRelationsRaw } = await (supabase.from("faction_relations") as any)
      .select("id, faction_id_1, faction_id_2, relation_type, description")
      .eq("campaign_id", campaignId)
      .or(`faction_id_1.eq.${entityId},faction_id_2.eq.${entityId}`)
      .limit(10);

    const factionRelations = (factionRelationsRaw || []) as Array<{ faction_id_1: string; faction_id_2: string; relation_type: string; description: string | null }>;
    if (factionRelations.length > 0) {
      const factionIds = [...new Set(factionRelations.flatMap((r) => [r.faction_id_1, r.faction_id_2]))];
      const { data: factionRows } = await (supabase.from("factions") as any)
        .select("id, name")
        .in("id", factionIds);
      const factionMap = new Map(
        ((factionRows as { id: string; name: string }[]) ?? []).map((f) => [f.id, f.name])
      );
      specificContext += "\n=== FRAKTIONS-BEZIEHUNGEN ===\n";
      for (const rel of factionRelations) {
        const partnerId = rel.faction_id_1 === entityId ? rel.faction_id_2 : rel.faction_id_1;
        const partnerName = factionMap.get(partnerId) ?? "Unbekannt";
        specificContext += `- ${partnerName}: ${rel.relation_type}${rel.description ? ` (${rel.description})` : ""}\n`;
      }
    }

    // Verwandte Geheimnisse: Alle Geheimnisse der NPCs, die dieser Fraktion angehören
    const { data: memberNpcs } = await (supabase.from("npcs") as any)
      .select("id, name")
      .eq("campaign_id", campaignId)
      .eq("faction_id", entityId)
      .limit(20);

    if (memberNpcs && memberNpcs.length > 0) {
      const memberIds = memberNpcs.map((n: any) => n.id);
      const { data: memberSecrets } = await (supabase.from("secrets") as any)
        .select("entity_id, title, content")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "npc")
        .in("entity_id", memberIds);

      if (memberSecrets && memberSecrets.length > 0) {
        const nameById: Record<string, string> = {};
        memberNpcs.forEach((n: any) => { nameById[n.id] = n.name; });
        specificContext += "\n=== BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE) ===\n";
        specificContext += "Geheimnisse von Mitgliedern dieser Fraktion:\n\n";
        for (const s of memberSecrets) {
          const ownerName = nameById[s.entity_id] || "Mitglied";
          specificContext += `- [${ownerName}] "${s.title || "Geheimnis"}: ${(s.content || "").substring(0, 200)}${(s.content || "").length > 200 ? "..." : ""}"\n`;
        }
      }
    }

  } else {
    // LORE: Lade historische Ereignisse, verwandte Orte, GM-Notizen
    const { data: loreRaw, error: loreError } = await (supabase.from("world_lore") as any)
      .select(
        `
        id,
        name,
        type,
        description,
        gm_notes,
        parent_id
      `
      )
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (loreError || !loreRaw) {
      throw new Error("Lore-Eintrag für Secret-Generierung nicht gefunden.");
    }

    const lore = loreRaw as {
      id: string;
      name: string;
      type: string | null;
      description: string | null;
      gm_notes: string | null;
      parent_id: string | null;
    };

    entityName = lore.name;
    entitySheet = `\n=== LORE STAMMBLATT ===
Name: ${lore.name}
Typ: ${lore.type || "Unbekannt"}
Beschreibung: ${lore.description || "Keine Beschreibung hinterlegt."}
GM-Notizen (intern): ${lore.gm_notes || "Keine GM-Notizen hinterlegt."}
`;

    // Lade verwandte historische Ereignisse (gleicher Typ oder Parent)
    if (lore.type) {
      const { data: relatedLore } = await (supabase.from("world_lore") as any)
        .select("id, name, type, description")
        .eq("campaign_id", campaignId)
        .eq("type", lore.type)
        .neq("id", entityId)
        .limit(5);

      if (relatedLore && relatedLore.length > 0) {
        specificContext += `\n=== VERWANDTE ${lore.type.toUpperCase()} ===\n`;
        for (const related of relatedLore) {
          specificContext += `- ${related.name}: ${related.description?.substring(0, 100) || "Keine Beschreibung"}\n`;
        }
      }
    }
  }

  // Lade ausgewählte Kontext-Geheimnisse (falls vorhanden)
  let selectedContextSection = "";
  if (contextSecrets && contextSecrets.length > 0) {
    const secretIds = contextSecrets.map((cs) => cs.id);
    const { data: selectedSecrets } = await (supabase.from("secrets") as any)
      .select("id, entity_id, entity_type, title, content")
      .eq("campaign_id", campaignId)
      .in("id", secretIds);

    if (selectedSecrets && selectedSecrets.length > 0) {
      // Lade Entitäts-Namen für bessere Kontextualisierung
      const entityIds = [...new Set(selectedSecrets.map((s: any) => s.entity_id))];
      const npcIds = entityIds.filter((id) => selectedSecrets.some((s: any) => s.entity_id === id && s.entity_type === "npc"));
      const factionIds = entityIds.filter((id) => selectedSecrets.some((s: any) => s.entity_id === id && s.entity_type === "faction"));

      const nameById: Record<string, string> = {};
      if (npcIds.length > 0) {
        const { data: npcs } = await (supabase.from("npcs") as any)
          .select("id, name")
          .in("id", npcIds);
        if (npcs) npcs.forEach((n: any) => { nameById[n.id] = n.name; });
      }
      if (factionIds.length > 0) {
        const { data: factions } = await (supabase.from("factions") as any)
          .select("id, name")
          .in("id", factionIds);
        if (factions) factions.forEach((f: any) => { nameById[f.id] = f.name; });
      }

      selectedContextSection = "\n=== AUSGEWÄHLTE KONTEXT-GEHEIMNISSE ===\n";
      selectedContextSection += "Der Game Master hat explizit diese Geheimnisse aus dem Umfeld ausgewählt, die beim Weben des neuen Geheimnisses berücksichtigt werden sollen:\n\n";

      // Priorisierte Geheimnisse zuerst
      const prioritized = contextSecrets.filter((cs) => cs.isPrioritized);
      const normal = contextSecrets.filter((cs) => !cs.isPrioritized);

      for (const cs of prioritized) {
        const secret = selectedSecrets.find((s: any) => s.id === cs.id);
        if (secret) {
          const ownerName = nameById[secret.entity_id] || (secret.entity_type === "npc" ? "Ein Bekannter" : "Eine Fraktion");
          selectedContextSection += `!!! DIESES GEHEIMNIS IST DER ANKERPUNKT: [${ownerName}] "${secret.title || "Geheimnis"}: ${secret.content}" !!!\n`;
          selectedContextSection += "→ Das neue Geheimnis MUSS eine direkte Verbindung zu diesem Ankerpunkt herstellen (Ergänzung, Folge, Gegensatz oder Beweisstück).\n\n";
        }
      }

      // Normale ausgewählte Geheimnisse
      for (const cs of normal) {
        const secret = selectedSecrets.find((s: any) => s.id === cs.id);
        if (secret) {
          const ownerName = nameById[secret.entity_id] || (secret.entity_type === "npc" ? "Ein Bekannter" : "Eine Fraktion");
          selectedContextSection += `- [${ownerName}] "${secret.title || "Geheimnis"}: ${secret.content.substring(0, 300)}${secret.content.length > 300 ? "..." : ""}"\n`;
        }
      }

      selectedContextSection += "\nWICHTIG: Nutze diese ausgewählten Geheimnisse als Basis für das neue Geheimnis. Verknüpfe es kausal oder thematisch mit ihnen.\n";
    }
  }

  const systemPrompt = `
Du bist der "AI Secret Architect" eines TTRPG-Game Masters.
Deine Aufgabe ist es, ein starkes, plotrelevantes Geheimnis für eine bestehende Entität (${entityType === "npc" ? "NPC" : entityType === "faction" ? "Fraktion" : "Lore-Eintrag"}) zu weben.

WICHTIG:
- Das Geheimnis muss mindestens ZWEI der verfügbaren Kontexte aktiv verknüpfen.
- Das Geheimnis soll HOOKS für zukünftige Szenen liefern (Konflikt, Dilemma, Verrat, verborgenes Wissen, historische Wahrheit).
- Es darf KEINE offenen Widersprüche zum Weltkontext enthalten.

BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE):
Falls im folgenden Kontext eine Sektion "BEKANNTE SCHATTEN (EXISTIERENDE GEHEIMNISSE)" mit Geheimnissen von verknüpften Personen oder Organisationen steht: Nutze diese bestehenden Informationen, um eine Verbindung oder einen Konflikt zu weben. Das neue Geheimnis soll entweder eine Ergänzung, ein gegensätzliches Puzzleteil oder eine direkte Folge der vorhandenen Geheimnisse sein.
Beispiel: Wenn der Mentor ein Geheimnis über einen Verrat hat, könnte die Schülerin ein Geheimnis über ein Beweisstück haben, das sie gefunden hat. So entsteht ein organisches Netzwerk an Intrigen, bei dem Geheimnisse aufeinander aufbauen.

${worldContext}
${entitySheet}
${specificContext}
${selectedContextSection}

DEFINITIONEN:
- "title": kurzer, prägnanter Titel (max. 80 Zeichen), z.B. "Schuldpakt mit den Hafenschatten" oder "Die wahre Geschichte von X".
- "content": vollständige Beschreibung des Geheimnisses in 3–8 Sätzen.
- "meaning": 2–3 Sätze, was dieses Geheimnis KONKRET für die Kampagne bedeutet (Gefahr, Chance, Twist, historische Bedeutung).
- "secret_type": eine Kategorie wie "Dilemma", "Verrat", "Wissen", "Prophezeiung", "Trauma", "Schuld", "Schutz", "Historische Wahrheit".
- "discovery_dc": Schwierigkeit (10–25) für die Entdeckung dieses Geheimnisses (z.B. über Nachforschungen, Proben, soziale Szenen).

ANFORDERUNGEN:
- Sprache: Deutsch.
- Das Geheimnis soll konkret spielbar sein, keine vagen Allgemeinplätze.
- discovery_dc MUSS eine GANZE ZAHL zwischen 10 und 25 sein.
- Nutze IMMER mindestens zwei der verfügbaren Kontexte und verknüpfe sie kausal.

Antworte NUR mit gültigem JSON im Format:
{
  "title": "string",
  "content": "string",
  "meaning": "string",
  "secret_type": "string",
  "discovery_dc": 17
}
`;

  const userPrompt = `Erzeuge ein tief vernetztes Geheimnis für ${entityType === "npc" ? "den NPC" : entityType === "faction" ? "die Fraktion" : "den Lore-Eintrag"} "${entityName}", das sich organisch aus den gegebenen Informationen ergibt.`;

  const raw = await callOpenAI(systemPrompt, userPrompt);

  let title = String(raw.title || "").trim();
  let content = String(raw.content || "").trim();
  let meaning = String(raw.meaning || "").trim();
  let secret_type = String(raw.secret_type || "").trim() || "Wissen";
  let discovery_dc = Number(raw.discovery_dc ?? 15);

  if (!title) {
    title = `Verborgenes Geheimnis von ${entityName}`;
  }
  if (!content) {
    content = "Dieses Geheimnis konnte nicht eindeutig generiert werden. Bitte generiere es erneut oder formuliere es manuell.";
  }
  if (!meaning) {
    meaning = "Die genaue Bedeutung dieses Geheimnisses für den Plot sollte vom Game Master manuell ergänzt werden.";
  }

  if (Number.isNaN(discovery_dc)) {
    discovery_dc = 15;
  }
  // Clamp auf 10–25
  discovery_dc = Math.max(10, Math.min(25, Math.round(discovery_dc)));

  return {
    title,
    content,
    meaning,
    secret_type,
    discovery_dc,
  };
}

// ------------------------------------------------------------------
// 1c. CONSPIRACY ENGINE ("Zufällige Verschwörung")
// ------------------------------------------------------------------