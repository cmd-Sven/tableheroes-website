/**
 * AI NPC generation and NPC detail expansion server actions.
 */
"use server";

import { NPCSchema } from "@/src/lib/validations/schemas";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
  verifyGM,
  getWorldBlueprintContext,
} from "./_shared";

export async function generateNPC(
  campaignId: string,
  userPrompt: string,
  contextRelations?: Array<{ npcId: string; relationType: string }>,
  locationDetails?: any,
  factionDetails?: any,
  secretContext?: {
    is_secret_antagonist?: boolean;
    hidden_agenda?: string;
  }
) {
  const supabase = await verifyGM(campaignId);
  const rootWorldContext = await getRootWorldContext(supabase, campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);
  const blueprintContext = await getWorldBlueprintContext(supabase, campaignId);

  // Lade verfügbare Locations für Location-Matching
  const { data: locationsRaw } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("campaign_id", campaignId)
    .in("type", ["Stadt", "Region", "Insel", "Gebäude", "Tempel", "Akademie", "Dorf", "Festung", "Ruine"])
    .limit(30);
  
  const locations = locationsRaw as { id: string; name: string | null; type: string | null }[] | null;

  let locationsContext = "";
  if (locations && locations.length > 0) {
    locationsContext = "\nVERFÜGBARE ORTE (für 'current_location_name_suggestion'):\n";
    locations.forEach((loc: any) => {
      locationsContext += `- ${loc.name} (${loc.type})\n`;
    });
  }

  // Lade Kontext-NPCs für den Prompt
  let contextNPCsInfo = "";
  if (contextRelations && contextRelations.length > 0) {
    const npcIds = contextRelations.map((r) => r.npcId);
    const { data: contextNPCs } = await supabase
      .from("npcs")
      .select("id, name, role, current_location_id, home_location_id, faction_id")
      .in("id", npcIds);

    if (contextNPCs && contextNPCs.length > 0) {
      contextNPCsInfo = "\nKONTEXT-NPCs (Beziehungen zum neuen NPC):\n";
      contextNPCs.forEach((npc: any) => {
        const relation = contextRelations.find((r) => r.npcId === npc.id);
        const relationType = relation?.relationType || "Unbekannt";
        contextNPCsInfo += `- ${npc.name}${npc.role ? ` (${npc.role})` : ""} - Beziehung: ${relationType}\n`;
      });
      contextNPCsInfo += "\nWICHTIG: Der neue NPC sollte eine passende Beziehung zu diesen NPCs haben. Berücksichtige dies bei der Generierung der Hintergrundgeschichte, Persönlichkeit und Rolle.\n";
    }
  }

  // Baue Location-Kontext mit GM-Notizen auf
  let locationContext = "";
  if (locationDetails) {
    locationContext = "\nORT-KONTEXT (inkl. GM-Notizen für Secret-Generierung):\n";
    locationContext += `- Ort: ${locationDetails.name || "Unbekannt"}`;
    if (locationDetails.type) locationContext += ` (${locationDetails.type})`;
    if (locationDetails.description) {
      locationContext += `\n  Beschreibung: ${locationDetails.description}`;
    }
    if (locationDetails.lore) {
      const lore = locationDetails.lore;
      locationContext += `\n  Lore-Eintrag: ${lore.name || "Unbekannt"}`;
      if (lore.description) {
        locationContext += `\n  Lore-Beschreibung: ${lore.description}`;
      }
      if (lore.gm_notes) {
        locationContext += `\n  [GM-NOTIZEN - WICHTIG FÜR SECRETS]: ${lore.gm_notes}`;
      }
    }
    locationContext += "\n";
  }

  // Baue Faction-Kontext mit GM-Notizen und Deep-Integration-Infos auf
  let factionContext = "";
  if (factionDetails) {
    factionContext = "\nFRAKTIONS-KONTEXT (inkl. GM-Notizen für Secret-Generierung):\n";
    factionContext += `- Fraktion: ${factionDetails.name || "Unbekannt"}`;
    if (factionDetails.type) factionContext += ` (${factionDetails.type})`;
    if (factionDetails.description) {
      factionContext += `\n  Beschreibung: ${factionDetails.description}`;
    }
    if (factionDetails.gm_notes) {
      factionContext += `\n  [GM-NOTIZEN - WICHTIG FÜR SECRETS]: ${factionDetails.gm_notes}`;
    }
    if (factionDetails.lore_entry) {
      const lore = factionDetails.lore_entry;
      factionContext += `\n  Lore-Eintrag: ${lore.name || "Unbekannt"}`;
      if (lore.description) {
        factionContext += `\n  Lore-Beschreibung: ${lore.description}`;
      }
      if (lore.gm_notes) {
        factionContext += `\n  [LORE GM-NOTIZEN - WICHTIG FÜR SECRETS]: ${lore.gm_notes}`;
      }
    }
    factionContext += "\n";
  }

  // Baue Secret-Kontext auf (wenn vorhanden)
  let secretContextString = "";
  if (secretContext) {
    secretContextString = "\nGEHEIMNIS-KONTEXT (WICHTIG FÜR GENERIERUNG):\n";
    if (secretContext.is_secret_antagonist) {
      secretContextString += "- Dieser NPC ist ein GEHEIMER ANTAGONIST. Seine wahre Natur ist verborgen.\n";
    }
    if (secretContext.hidden_agenda) {
      secretContextString += `- Versteckte Agenda: ${secretContext.hidden_agenda}\n`;
    }
    secretContextString += "\nWICHTIG: Die generierten Inhalte müssen diese Geheimnisse berücksichtigen, aber subtil bleiben.\n";
  }

  const systemPrompt = `
    Du bist Game Master. Erstelle einen NPC, der in die existierende Welt passt.
    
    ${rootWorldContext}
    ${blueprintContext}
    ${secretContextString}
    
    WICHTIG: Nutze bevorzugt existierende Rassen, Fraktionen und Orte aus dem Kontext!
    - Wenn eine Rasse aus "EXISTIERENDE RASSEN" passt, nutze diese exakt (z.B. "Kalkmari", "Maschinenzwerge").
    - Wenn eine Fraktion aus "EXISTIERENDE FRAKTIONEN" passt, nutze diese exakt (z.B. "Die Enklave").
    - Wenn ein Ort aus "VERFÜGBARE ORTE" passt, nutze dessen Namen EXAKT für 'current_location_name_suggestion'.
    - Erfinde KEINE neuen Standard-Fantasy-Rassen (Mensch, Zwerg, Elf), wenn passende Rassen im Kontext existieren.
    - Berücksichtige die "GEHEIMNISSE & WISSEN" im Kontext, um konsistente Hintergrundgeschichten zu erstellen.

    WELT KONTEXT (Existierende Inhalte):
    ${worldContext}
    ${locationsContext}
    ${contextNPCsInfo}
    ${locationContext}
    ${factionContext}

    FALLS EIN FRAKTIONS-KONTEXT ANGEGEBEN IST (obiger Block):
    - **Erscheinungsbild (appearance):** NUR Stichpunkte. Integriere Uniformen, Wappen, Farben oder Slogans der Fraktion als Bullet Points (z. B. • Dunkelgrüne Uniform • Silbernes Abzeichen).
    - **Persönlichkeit:** Die Persönlichkeit des NPCs (personality_traits, gm_notes) soll die Philosophie/Ziele der Fraktion widerspiegeln – entweder als loyale Verkörperung oder als bewusst begründete Abweichung.
    - **Rolle:** Weise dem NPC eine Rolle/Position zu, die zur beschriebenen Organisationsstruktur der Fraktion passt (z.B. Offizier, Rekrut, Spion, Quartiermeister o.Ä.).

    ${contextNPCsInfo ? `
    KONTEXT-BEZIEHUNGEN (KRITISCH):
    - Die oben genannten NPCs existieren bereits in der Welt.
    - Der neue NPC sollte eine passende Beziehung zu diesen NPCs haben, basierend auf der angegebenen Beziehungsart.
    - Berücksichtige diese Beziehungen bei der Generierung der Hintergrundgeschichte (gm_notes), Persönlichkeit (personality_traits) und Rolle (role).
    - Beispiel: Wenn ein NPC als "Rivale" markiert ist, sollte der neue NPC eine konkurrierende oder feindselige Beziehung haben.
    - Beispiel: Wenn ein NPC als "Vorgesetzter" markiert ist, sollte der neue NPC eine untergeordnete Rolle haben.
    - Beispiel: Wenn ein NPC als "Nachbar" markiert ist, sollte der neue NPC am selben Ort oder in der Nähe wohnen.
    ` : ""}

    NARRATIVE HOOKS (WICHTIG):
    - Analysiere die von dir erstellte Hintergrundgeschichte (gm_notes, description, personality_traits).
    - Identifiziere ALLE namentlich genannten Personen oder wichtigen Rollen (Familie, Rivalen, Vorgesetzte, Verbündete, Mentoren), die in der Story vorkommen, aber noch keine eigenen NPCs sind.
    - Ignoriere verstorbene Personen, es sei denn, ihr Tod ist ein Mysterium oder relevant für die Story. Setze 'is_alive' entsprechend.
    - Erstelle für jede identifizierte Person einen Hook mit: name (falls erwähnt), role (Beziehung zum Haupt-NPC), description (kurzer Kontext aus der Story), is_alive (true/false).
    - Beispiel: Wenn in der Story steht "Grommashs Schwester Nilidah wurde aus der Gilde verstoßen", erstelle: { "name": "Nilidah", "role": "Schwester", "description": "Wurde aus der Gilde verstoßen", "is_alive": true }
    - Wenn keine Personen erwähnt werden, lasse 'narrative_hooks' als leeres Array.

    ERGEBNISSE FÜR SPIELERPROBEN (check_results) – NUR FÜR DEN GM:
    - Diese Einträge sind **mögliche Ergebnisse, wenn SPIELER mit ihren Charakteren** (nicht der NPC!) **Wahrnehmung, Motiv erkennen oder Wissen** gegen diesen NPC würfeln. Der GM nutzt sie, um zu sagen: „Bei DC 12 bemerkst du …“, „Bei kritischem Erfolg siehst du …“.
    - **NICHT** formulieren als würde der NPC würfeln. **IMMER** formulieren als: Was erfährt/bemerkt der **Spielercharakter** bei diesem Wurf über den NPC?
    - Erstelle für "Wahrnehmung", "Motiv erkennen", "Wissen" je mindestens 2 DC-Stufen (z. B. DC 12 und DC 18, oder DC 15 + is_critical: true).
    - **Wahrnehmung**: Was sieht der Spielercharakter am NPC? (Kleidung, Narben, Waffen, Besonderheiten.) Formuliere z. B.: „Der Spieler bemerkt …“ / „Bei DC 12: … die dunkelgrüne Uniform und das silberne Abzeichen.“
    - **Motiv erkennen**: Was erkennt der Spielercharakter über Absichten/Emotionen? z. B. „Wirkt wachsam.“ / „Bei kritischem Erfolg: spürt verborgene Anspannung.“
    - **Wissen**: Was kann der Spielercharakter über Herkunft/Verbindungen/Geschichte wissen? z. B. „Kennt die Stadtwache von …“.
    - Nutze GM-Notizen und Ort/Fraktion-Kontext, um die Texte zu verankern. Beispiel: Ort "Nethergard" → (Wahrnehmung DC 12) "Bemerkt das silberne Amulett am Hals." | (Wahrnehmung DC 20, is_critical) "Erkennt: Das Amulett wirkt wie ein typisches Schutzwerk gegen Schattenmagie aus Nethergard."

    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - **KRITISCH - GEHEIMNISSE DÜRFEN NIEMALS IN ÖFFENTLICHEN FELDERN ERSCHEINEN:**
      * Informationen aus 'hidden_agenda', 'true_nature' oder Antagonist-Details dürfen NIEMALS in 'description' oder 'personality_traits' erscheinen!
      * Diese Felder sind für Spieler sichtbar und müssen subtil und harmlos wirken.
      * Alle geheimen Informationen gehören ausschließlich in 'true_nature', 'hidden_agenda' oder 'gm_notes'.
    - 'faction_name_suggestion': Wenn der NPC zu einer der existierenden Fraktionen passt, schreibe den Namen EXAKT so wie im Kontext. Sonst leer lassen.
    - 'current_location_name_suggestion': Wenn der NPC an einem existierenden Ort ist, schreibe den Namen EXAKT so wie in "VERFÜGBARE ORTE". Sonst leer lassen.
    - 'alignment': Muss einer dieser Werte sein: "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil". Wähle basierend auf der Persönlichkeit und dem Hintergrund des NPCs.
    - 'race': BEVORZUGT eine Rasse aus "EXISTIERENDE RASSEN". Falls keine passt, nutze eine passende Standard-Rasse.
    - 'status': Muss einer dieser Werte sein: "Alive", "Deceased", "Missing", "Unknown". Standard: "Alive".
    - 'description': Atmosphärischer Einleitungstext für die Spieler. Schreibe einen flüssigen Text, den der GM vorlesen kann. Fokus auf Vibe und Ausstrahlung. KEINE Stichpunkte, kein reines Auflisten von Merkmalen. Muss harmlos und subtil sein. KEINE Geheimnisse!
    - 'appearance': NUR Stichpunkte (Bullet Points) mit harten optischen Fakten: Größe, Haarfarbe, markante Narben/Merkmale, Kleidung. Kein Fließtext, keine Wiederholung der Beschreibung.
    - 'personality_traits': Charaktereigenschaften, Verhalten, Eigenheiten (2-3 Sätze). ${secretContext?.is_secret_antagonist ? "**WICHTIG:** Wenn der NPC ein geheimer Antagonist ist, beschreibe hier die ÖFFENTLICHE, MASKIERTE Persönlichkeit (wie er sich nach außen gibt). KEINE Geheimnisse oder versteckten Absichten!" : ""}
    - **STRIKTE TRENNUNG:** Verwende das Feld 'description' ausschließlich für öffentliche Infos. Alle Geheimnisse aus 'hidden_agenda' MÜSSEN in 'true_nature' fließen. Mische diese Felder NIEMALS.
    ${secretContext?.is_secret_antagonist ? `
    
    **KRITISCH - AUFSPLITTUNG DER INFORMATIONEN FÜR GEHEIME ANTAGONISTEN:**
    Wenn 'is_secret_antagonist' true ist, MUSS du die Informationen wie folgt aufteilen:
    
    1. **'description'** (Öffentlich & Subtil – Vorlesetext):
       - Flüssiger Text zum Vorlesen, Fokus auf Vibe und Ausstrahlung. Wie der NPC auf Spieler wirkt (oberflächlich, freundlich, harmlos).
       - Nutze subtile Hinweise, die bei genauerer Betrachtung verdächtig wirken könnten. Keine Stichpunkte.
       - Beispiel: "Ein freundlicher Händler, der immer ein Lächeln auf den Lippen trägt" statt "Ein böser Verräter".
       - **KRITISCH: Informationen aus 'hidden_agenda' oder Antagonist-Details dürfen NIEMALS hier erscheinen! Diese Felder sind für Spieler sichtbar.**
    
    2. **'personality_traits'** (Öffentlich & Maskiert):
       - Beschreibe die öffentliche Persönlichkeit (wie er sich gibt).
       - Beispiel: "Wirkt freundlich und zuvorkommend, zeigt großes Interesse an den Angelegenheiten der Stadt" statt "Ist eigentlich ein Verräter".
       - **KRITISCH: Informationen aus 'hidden_agenda' oder Antagonist-Details dürfen NIEMALS hier erscheinen! Diese Felder sind für Spieler sichtbar.**
    
    3. **'true_nature'** (Intern & Enthüllend - NEUES FELD):
       - Beschreibe die WAHRE, interne Persönlichkeit (nur für GM sichtbar).
       - Beispiel: "In Wirklichkeit ein kaltblütiger Verräter, der die Stadt an ihre Feinde verkaufen will. Er versteckt seine wahren Absichten hinter einem freundlichen Lächeln."
    
    4. **'hidden_agenda'** (Falls im Secret-Kontext angegeben):
       - Übernehme die versteckte Agenda aus dem Kontext oder erweitere sie.
       - Beispiel: "Will die Stadt an ihre Feinde verkaufen, um persönlichen Reichtum zu erlangen."
    
    5. **'secret_entry'** (NEUES FELD - Für Secrets-Datenbank):
       - Erstelle ein konkretes Geheimnis, das in die Secrets-Datenbank eingefügt werden kann.
       - Dies sollte ein aufdeckbares Geheimnis sein, das Spieler durch Proben oder Interaktion finden können.
       - Beispiel: "Ist ein Spion der feindlichen Fraktion und sammelt Informationen über die Stadtverteidigung."
    ` : ""}
    
    JSON: { 
      "name": "string", 
      "title": "string (Beruf/Rolle, z.B. 'Magister der Energie', 'Schmied')", 
      "description": "string (flüssiger Vorlesetext für Spieler, Vibe und Ausstrahlung – keine Stichpunkte)", 
      "gm_notes": "string (Geheimnisse, Hintergrund)", 
      "faction_name_suggestion": "string (Exakter Name aus EXISTIERENDE FRAKTIONEN oder leer)",
      "current_location_name_suggestion": "string (Exakter Name aus VERFÜGBARE ORTE oder leer)",
      "race": "string (Bevorzugt aus EXISTIERENDE RASSEN)",
      "role": "string (Beruf/Rolle, z.B. 'Magister der Energie', 'Schmied', 'Händler')",
      "status": "Alive" | "Deceased" | "Missing" | "Unknown",
      "alignment": "Lawful Good" | "Neutral Good" | "Chaotic Good" | "Lawful Neutral" | "True Neutral" | "Chaotic Neutral" | "Lawful Evil" | "Neutral Evil" | "Chaotic Evil",
      "appearance": "string (NUR Stichpunkte: Größe, Haarfarbe, Narben, Kleidung – kein Fließtext)",
      "personality_traits": "string (Charaktereigenschaften, Verhalten, Eigenheiten)${secretContext?.is_secret_antagonist ? " - ÖFFENTLICHE, maskierte Persönlichkeit" : ""}",
      ${secretContext?.is_secret_antagonist ? `"true_nature": "string (Wahre, interne Persönlichkeit - nur für GM sichtbar)",
      "hidden_agenda": "string (Versteckte Agenda des NPCs)",
      "secret_entry": "string (Konkretes Geheimnis für Secrets-Datenbank)",` : ""}
      "narrative_hooks": [
        {
          "name": "string (optional, falls im Text erwähnt)",
          "role": "string (Beziehung, z.B. 'Schwester', 'Erzfeind', 'Mentor')",
          "description": "string (kurzer Kontext aus der Story)",
          "is_alive": boolean
        }
      ],
      "check_results": [
        {
          "type": "Wahrnehmung" | "Motiv erkennen" | "Wissen",
          "dc": number (Schwierigkeit der Spielerprobe, z.B. 12, 18),
          "result": "string (was der SPIELERCHARAKTER bei diesem Wurf über den NPC erfährt/bemerkt – NICHT was der NPC würfelt)",
          "is_critical": boolean (true = Ergebnis bei kritischem Erfolg des Spielers)
        }
      ]
    }
  `;

  const rawResult = await callOpenAI(systemPrompt, userPrompt);

  // KI liefert appearance manchmal als Array (Stichpunkte) – in String normalisieren
  if (rawResult && typeof rawResult === "object" && Array.isArray((rawResult as any).appearance)) {
    const arr = (rawResult as any).appearance as unknown[];
    (rawResult as any).appearance = arr
      .filter((x: unknown) => typeof x === "string")
      .join("\n")
      .trim() || null;
  } else if (
    rawResult &&
    typeof rawResult === "object" &&
    (rawResult as any).appearance != null &&
    typeof (rawResult as any).appearance !== "string"
  ) {
    (rawResult as any).appearance = null;
  }

  // Zentrale Zod-Validierung der KI-Antwort für NPCs
  const parsedNPC = NPCSchema.safeParse(rawResult);
  if (!parsedNPC.success) {
    console.error("AI Validation Error (NPCSchema):", parsedNPC.error.format());
    throw new Error("Die KI hat ein ungültiges Format für den NPC geliefert.");
  }

  let result: any = parsedNPC.data;

  // Zusätzlicher Sicherheits-Check: Geheimnisse dürfen nicht in description/personality landen
  if (result.hidden_agenda) {
    const hidden = String(result.hidden_agenda).toLowerCase();
    const snippet = hidden.slice(0, 80); // kurzer Ausschnitt zum Matching

    const desc = (result.description || "").toLowerCase();
    const pers = (result.personality_traits || "").toLowerCase();

    if ((snippet && desc.includes(snippet)) || (snippet && pers.includes(snippet))) {
      console.error("AI Secret Leakage Detected: hidden_agenda scheint in description/personality aufzutauchen.");
      throw new Error(
        "Die KI hat geheime Informationen fälschlicherweise in die öffentliche Beschreibung übernommen. Bitte versuche die Generierung erneut."
      );
    }
  }

  // Sicherstellen, dass mindestens zwei Check-Results existieren
  if (!result.check_results || result.check_results.length < 2) {
    console.error("AI Validation Error: Weniger als zwei check_results erzeugt:", result.check_results);
    throw new Error("Die KI muss mindestens zwei Proben-Einträge (check_results) liefern.");
  }

  // Validierung gegen Root-World-Kontext
  const { data: world } = await supabase
    .from("worlds")
    .select("genre_style, magic_level")
    .eq("campaign_id", campaignId)
    .single();

  const validation = await validateAIResponseAgainstWorld(result, world);
  if (validation.warnings.length > 0) {
    console.warn("⚠️ KI-Validierungswarnungen:", validation.warnings);
    // Optional: Warnung an Frontend weitergeben (kann später als Toast angezeigt werden)
    result._validationWarnings = validation.warnings;
  }

  // Optional: Versuche faction_id zu finden, wenn faction_name_suggestion vorhanden
  if (result.faction_name_suggestion) {
    const { data: factionRaw } = await (supabase.from("factions") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .ilike("name", result.faction_name_suggestion)
      .single();
    
    const faction = factionRaw as { id: string } | null;
    if (faction) {
      result.faction_id = faction.id;
    } else {
      // Fallback: Fuzzy Match
      const { data: fuzzyFactionsRaw } = await (supabase.from("factions") as any)
        .select("id, name")
        .eq("campaign_id", campaignId)
        .ilike("name", `%${result.faction_name_suggestion}%`)
        .limit(1);
      
      const fuzzyFactions = fuzzyFactionsRaw as { id: string; name: string | null }[] | null;
      if (fuzzyFactions && fuzzyFactions.length > 0) {
        result.faction_id = fuzzyFactions[0].id;
      }
    }
  }

  // Optional: Versuche current_location_id zu finden, wenn current_location_name_suggestion vorhanden
  if (result.current_location_name_suggestion && locations && locations.length > 0) {
    type LocationType = { id: string; name: string | null; type: string | null };
    const matchedLocation = (locations as LocationType[]).find(
      (loc) => loc.name?.toLowerCase() === result.current_location_name_suggestion?.toLowerCase()
    );
    
    if (matchedLocation) {
      result.current_location_id = matchedLocation.id;
    } else {
      // Fallback: Fuzzy Match
      const fuzzyLocation = (locations as LocationType[]).find(
        (loc) => loc.name?.toLowerCase().includes(result.current_location_name_suggestion?.toLowerCase() || "") ||
                      result.current_location_name_suggestion?.toLowerCase().includes(loc.name?.toLowerCase() || "")
      );
      
      if (fuzzyLocation) {
        result.current_location_id = fuzzyLocation.id;
      }
    }
  }

  return result;
}

// ------------------------------------------------------------------
// 3. FRAKTION GENERATOR
// ------------------------------------------------------------------

export async function generateNpcDetailsFromHook(
  campaignId: string,
  sourceNPCName: string,
  hook: { name?: string; role: string; description: string; is_alive: boolean },
  currentName?: string
) {
  const supabase = await verifyGM(campaignId);
  const worldContext = await getWorldContext(supabase, campaignId);

  // Bestimme den zu verwendenden Namen: currentName hat Vorrang, falls vorhanden
  const npcName = currentName && currentName.trim() !== "" && currentName.trim().toLowerCase() !== "unbekannt"
    ? currentName.trim()
    : (hook.name && hook.name.trim() !== "" && hook.name.trim().toLowerCase() !== "unbekannt" ? hook.name.trim() : "[Name noch nicht festgelegt]");

  const systemPrompt = `
    Du bist Game Master. Erstelle detaillierte Informationen für einen NPC basierend auf einem Story-Hook.
    
    **KRITISCH WICHTIG - GROUND TRUTH (UNVERÄNDERLICHE FAKTEN - DIESE DÜRFEN NICHT GEÄNDERT WERDEN):**
    - Der NPC heißt: ${npcName}
    - WICHTIG: Falls im ursprünglichen Story-Hook der Name als "Unbekannt" markiert war, IGNORIERE das Wort "Unbekannt" komplett und verwende stattdessen konsequent den Namen "${npcName}" für ALLE Beschreibungen (Aussehen, Persönlichkeit, Description).
    - Die Beziehung zum Ursprungs-NPC "${sourceNPCName}" ist EXAKT: "${hook.role}"
    - Der Kontext aus dem Hook: "${hook.description}"
    
    **ABSOLUTE VERBOTE (DIESE FEHLER FÜHREN ZU INKONSISTENZEN):**
    1. ❌ VERBOTEN: Die Rolle/Beruf aus dem Hook-Kontext zu ändern oder zu ignorieren!
       - Wenn der Hook sagt "Heilerin", dann ist der NPC eine HEILERIN, nicht "Beraterin" oder "Dienerin"!
       - Wenn der Hook sagt "Schmied", dann ist der NPC ein SCHMIED!
    2. ❌ VERBOTEN: Die Beziehung zu ${sourceNPCName} zu ändern!
       - Wenn der Hook sagt "Schwester", dann ist der NPC die SCHWESTER von ${sourceNPCName}, nicht "Dienerin" oder "Beraterin"!
    3. ❌ VERBOTEN: Neue Namen für Personen, Fraktionen oder Orte zu erfinden, die nicht im Hook-Kontext stehen!
       - Wenn "Elion" nicht im Hook erwähnt wird, existiert "Elion" NICHT für diesen NPC!
    4. ❌ VERBOTEN: Die Persönlichkeit zu erfinden, ohne die beschriebene Beziehung zu berücksichtigen!
       - "besorgte Schwester" bedeutet: Sie sorgt sich um ${sourceNPCName}, ist fürsorglich, beschützend!
    
    **WAS DU TUN SOLLST:**
    1. ✅ Übernehme die Rolle aus dem Hook EXAKT (z.B. "Heilerin" bleibt "Heilerin").
    2. ✅ Beschreibe das Aussehen passend zur Rolle (z.B. Heilerin = Heiler-Kleidung, Kräuter, medizinische Utensilien).
    3. ✅ Beschreibe die Persönlichkeit basierend auf der Beziehung (z.B. "besorgte Schwester" = fürsorglich, beschützend, emotional verbunden mit ${sourceNPCName}).
    4. ✅ Nutze NUR Namen und Fakten, die im Hook-Kontext oder im Welt-Kontext erwähnt werden.
    
    WELT KONTEXT (für Konsistenz, aber Hook-Fakten haben VORRANG):
    ${worldContext}
    
    ANFORDERUNGEN:
    - Valid JSON. Sprache: Deutsch.
    - 'description': Flüssiger Vorlesetext für Spieler, Vibe und Ausstrahlung. Erwähnt Rolle und Beziehung aus dem Hook. Keine Stichpunkte.
    - 'appearance': NUR Stichpunkte (Größe, Haarfarbe, Kleidung, Merkmale) – passend zur Rolle (z.B. Heilerin = Heiler-Kleidung, Kräuter). Kein Fließtext.
    - 'personality_traits': Charaktereigenschaften, die die BESCHRIEBENE BEZIEHUNG widerspiegeln (z.B. "besorgte Schwester" = fürsorglich, beschützend).
    
    JSON: {
      "description": "string (flüssiger Vorlesetext für Spieler, Rolle und Beziehung aus Hook)",
      "appearance": "string (NUR Stichpunkte, passend zur Rolle aus dem Hook)",
      "personality_traits": "string (Charaktereigenschaften, die die Beziehung widerspiegeln)"
    }
  `;

  const userPrompt = `Erstelle Details für ${hook.name || "diesen NPC"}, der ${hook.role} von ${sourceNPCName} ist. Kontext: ${hook.description}`;

  try {
    const result = await callOpenAI(systemPrompt, userPrompt);
    return {
      appearance: result.appearance || "",
      personality_traits: result.personality_traits || "",
      description: result.description || "",
    };
  } catch (error) {
    console.error("generateNpcDetailsFromHook Error:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der NPC-Details-Generierung aus Hook.");
  }
}

// ------------------------------------------------------------------
// ANALYZE WORLD CONTEXT (für On-the-Fly Worldbuilding)
// ------------------------------------------------------------------