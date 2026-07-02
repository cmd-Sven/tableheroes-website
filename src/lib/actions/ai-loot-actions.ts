"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type LootSuggestionItem = {
  name: string;
  desc: string;
  /** Vor Identifikation: tarnt den Fund — darf NICHT den echten Typ verraten (kein „Heiltrank“, kein „+1“). */
  mundaneName?: string;
  mundaneDesc?: string;
  rarity: string;
  price: number;
  isMagical: boolean;
};

export type LootSuggestion = {
  name: string;
  gp: number;
  sp: number;
  items: LootSuggestionItem[];
};

/** Vorgaben für die KI-Beute (exakte Stückzahlen + Währung). */
export type LootAiQuantityParams = {
  magicalCount: number;
  mundaneCount: number;
  goldGp: number;
  silverSp: number;
};

async function callOpenAIJson(systemPrompt: string, userPrompt: string): Promise<unknown> {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Keine Antwort von OpenAI erhalten.");
  return JSON.parse(content);
}

function clampInt(n: unknown, min: number, max: number) {
  const v = Math.round(Number(n) || 0);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function clampCount(n: unknown, max: number) {
  return clampInt(n, 0, max);
}

function padLootItems(
  magical: LootSuggestionItem[],
  mundane: LootSuggestionItem[],
  needMagical: number,
  needMundane: number,
): LootSuggestionItem[] {
  const mag = [...magical];
  const mun = [...mundane];
  let mi = 0;
  let mu = 0;
  const out: LootSuggestionItem[] = [];
  for (let k = 0; k < needMundane; k++) {
    if (mu < mun.length) {
      out.push({ ...mun[mu], isMagical: false });
      mu++;
    } else {
      out.push({
        name: `Profaner Fund ${k + 1}`,
        desc: "Alltäglicher Gegenstand — Text vom Spielleiter anpassen.",
        mundaneName: "",
        mundaneDesc: "",
        rarity: "common",
        price: 0,
        isMagical: false,
      });
    }
  }
  for (let k = 0; k < needMagical; k++) {
    if (mi < mag.length) {
      out.push({ ...mag[mi], isMagical: true });
      mi++;
    } else {
      out.push({
        name: `Magischer Gegenstand ${k + 1}`,
        desc: "Nach Identifikation wirksam — Beschreibung vom Spielleiter ergänzen.",
        mundaneName: "Unscheinbarer kleiner Fund",
        mundaneDesc: "Form und Material geben wenig preis — nichts Offensichtliches.",
        rarity: "uncommon",
        price: 15,
        isMagical: true,
      });
    }
  }
  return out;
}

function normalizeLootItemsToCounts(
  items: LootSuggestionItem[],
  magicalCount: number,
  mundaneCount: number,
): LootSuggestionItem[] {
  const mag = items.filter((i) => i.isMagical);
  const mun = items.filter((i) => !i.isMagical);
  const excessMag = mag.slice(0, magicalCount);
  const excessMun = mun.slice(0, mundaneCount);
  if (mag.length > magicalCount || mun.length > mundaneCount) {
    return padLootItems(excessMag, excessMun, magicalCount, mundaneCount);
  }
  return padLootItems(mag, mun, magicalCount, mundaneCount);
}

/**
 * KI-Beutevorschlag für die Loot-Gun (GM prüft vor Freigabe). Alle Fließtexte auf Deutsch.
 */
export async function requestLootSuggestion(
  context: string,
  isCritical: boolean,
  quantities?: LootAiQuantityParams,
): Promise<LootSuggestion> {
  const ctx =
    String(context ?? "").trim() ||
    "Allgemeine Beute nach einem Encounter (Fantasy-Rollenspiel, deutschsprachige Tischrunde).";
  const critHint = isCritical
    ? `KRITISCH: Wenn mindestens ein magischer Gegenstand gefordert ist: mindestens EINER mit rarity "rare" oder "very rare".`
    : "Seltenheit überwiegend common/uncommon; höchstens ein rare.";

  const magicalCount = clampCount(quantities?.magicalCount ?? 1, 12);
  const mundaneCount = clampCount(quantities?.mundaneCount ?? 2, 12);
  const targetGp = clampCount(quantities?.goldGp ?? 40, 5000);
  const targetSp = clampCount(quantities?.silverSp ?? 10, 2000);
  const totalSlots = magicalCount + mundaneCount;

  const countRules =
    totalSlots === 0
      ? `- items: leeres Array [] (keine Gegenstände).
- gp und sp im JSON ignorieren — die App setzt Währung ohnehin auf die Vorgaben des SL.`
      : `- items: EXAKT ${totalSlots} Einträge.
- GENAU ${mundaneCount} Einträge mit "isMagical": false.
- GENAU ${magicalCount} Einträge mit "isMagical": true.
- Reihenfolge im Array: zuerst alle profanen (isMagical false), danach alle magischen (isMagical true), damit die App die Vorgaben leicht prüfen kann.
- gp und sp im JSON: nur Platzhalter (0), die App überschreibt mit SL-Vorgaben.`;

  const systemPrompt = `Du bist ein Fantasy-Rollenspiel-Beute-Generator (an D&D 5e angelehnt). Alle sichtbaren Texte für Spieler:innen und SL MÜSSEN auf DEUTSCH sein (kein Englisch in name, desc, mundaneName, mundaneDesc, name des Stapels).

Antworte NUR mit JSON in exakt diesem Schema (keine Erklärungen außerhalb des JSON):
{
  "name": string,
  "gp": number,
  "sp": number,
  "items": Array<{
    "name": string,
    "desc": string,
    "mundaneName": string,
    "mundaneDesc": string,
    "rarity": string,
    "price": number,
    "isMagical": boolean
  }>
}

Regeln für Sprache und Inhalt:
- name (Stapel): kurzer deutscher Titel, z. B. "Beute aus dem Verlies".
${countRules}
- rarity NUR als englischer Kleinbuch-String (für die App): common, uncommon, rare, very rare, legendary.
- price: grober Goldwert in gp, ganze Zahl.
- ${critHint}

Für jedes Item, ALLE Texte deutsch:

1) isMagical = false
   - name, desc: normale deutsche Bezeichnung und Beschreibung.
   - mundaneName und mundaneDesc: leerer String "" (die App nutzt dann name/desc).

2) isMagical = true
   - name: der WAHRE deutsche Name nach Identifikation (z. B. "Heiltrank", "Langschwert +1", "Ring des Schutzes"). Darf Boni, Ladungen, Attunement etc. klar nennen.
   - desc: vollständige deutsche Spieltext-Beschreibung (Mechanik, Nutzen, Flavor) — nur sichtbar, wenn identifiziert.
   - mundaneName: Tarnung VOR Identifikation. VERBOTEN: den Itemtyp oder Wirkung zu verraten (keine Wörter wie Heiltrank, Mana, +1, Attunement, Zauberstab, wenn es ein Stab ist, …). Nutze sinnliche, neutrale Beschriftung, z. B. "Eine dreckige Flasche mit undefinierbarem Inhalt", "Verstaubtes Röhrchen mit etwas Flüssigem", "Stumpfes Stück Metall mit seltsamer Patina".
   - mundaneDesc: 1–3 deutsche Sätze — nur Aussehen/Gefühl/Geräusch, KEINE Spielmechanik und KEIN Hinweis, was es wirklich ist.

Kontext der Szene (kann deutsch oder anders sein, du antwortest trotzdem nur mit deutschen Item-Texten):\n${ctx}

Vorgaben des Spielleiters (strikt einhalten):
- Profane Items (Anzahl): ${mundaneCount}
- Magische Items (Anzahl): ${magicalCount}
- Gold (gp-Ziel, nur zur Orientierung im Fließtext): ${targetGp}
- Silber (sp-Ziel): ${targetSp}`;

  const raw = (await callOpenAIJson(
    systemPrompt,
    "Generiere jetzt die Beute als JSON. Alle Felder name, desc, mundaneName, mundaneDesc und der Stapel-Name auf Deutsch. Halte die geforderten Stückzahlen und die Reihenfolge (profan zuerst, dann magisch) exakt ein.",
  )) as Record<string, unknown>;

  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const itemsParsed: LootSuggestionItem[] = itemsRaw.slice(0, 24).map((row) => {
    const o = row as Record<string, unknown>;
    const rarity = String(o.rarity ?? "common").trim().toLowerCase();
    const isMagical = Boolean(o.isMagical ?? o.is_magical);
    const name = String(o.name ?? "Fundstück").trim().slice(0, 160);
    let mundaneName = String(o.mundaneName ?? "").trim().slice(0, 160) || undefined;
    let mundaneDesc = String(o.mundaneDesc ?? "").trim().slice(0, 800) || undefined;
    if (isMagical && mundaneName && mundaneName.toLowerCase() === name.toLowerCase()) {
      mundaneName = undefined;
      mundaneDesc = undefined;
    }
    return {
      name,
      desc: String(o.desc ?? "").trim().slice(0, 800),
      mundaneName,
      mundaneDesc,
      rarity: rarity || "common",
      price: clampInt(o.price, 0, 50000),
      isMagical,
    };
  });

  const items =
    totalSlots === 0 ? [] : normalizeLootItemsToCounts(itemsParsed, magicalCount, mundaneCount);

  return {
    name: String(raw.name ?? "Beutestapel").trim().slice(0, 120),
    gp: targetGp,
    sp: targetSp,
    items,
  };
}

export type BeastLootRollQuality = "poor" | "fair" | "good" | "excellent" | "critical";

/** Qualität aus Würfelergebnis (Gesamtwurf vs. SG) für Kreaturen-Loot. */
function beastLootQualityFromRoll(
  rollTotal: number,
  dc: number,
): BeastLootRollQuality {
  const margin = rollTotal - dc;
  if (margin >= 10) return "critical";
  if (margin >= 5) return "excellent";
  if (margin >= 0) return "good";
  if (margin >= -5) return "fair";
  return "poor";
}

const BEAST_LOOT_QUALITY_HINT: Record<BeastLootRollQuality, string> = {
  poor: "Kaum brauchbare Fundstücke — eher Abfall und Kleinkram.",
  fair: "Einige nützliche profane Teile, wenig Wertvolles.",
  good: "Solide Beute mit handwerklich oder alchemistisch interessanten Teilen.",
  excellent: "Beachtliche Beute, eventuell ein seltener Fund.",
  critical: "Außergewöhnliche Beute — mindestens ein bemerkenswerter oder magischer Gegenstand.",
};

/**
 * KI-Loot nach besiegter Kreatur — Qualität hängt von der besten Analyse-Probe ab.
 */
export async function requestBeastDefeatLootSuggestion(input: {
  creatureName: string;
  creatureType: string | null;
  challengeRating: number | null;
  knownLoot: string | null;
  physicalDescription: string | null;
  rollSkill: string;
  rollTotal: number;
  dc: number;
}): Promise<LootSuggestion> {
  const quality = beastLootQualityFromRoll(input.rollTotal, input.dc);
  const isCritical = quality === "critical" || quality === "excellent";

  const quantities: LootAiQuantityParams = {
    magicalCount: quality === "critical" ? 2 : quality === "excellent" ? 1 : quality === "good" ? 1 : 0,
    mundaneCount: quality === "poor" ? 1 : quality === "fair" ? 2 : 3,
    goldGp: quality === "critical" ? 80 : quality === "excellent" ? 45 : quality === "good" ? 25 : 8,
    silverSp: quality === "poor" ? 5 : 15,
  };

  const context = [
    `Besiegte Kreatur: ${input.creatureName}`,
    input.creatureType ? `Typ: ${input.creatureType}` : null,
    input.challengeRating != null ? `CR: ${input.challengeRating}` : null,
    input.knownLoot ? `Bekannter Loot (GM): ${input.knownLoot}` : null,
    input.physicalDescription
      ? `Erscheinung: ${input.physicalDescription.slice(0, 400)}`
      : null,
    `Spieler-Probe (${input.rollSkill}): Wurf ${input.rollTotal} vs. SG ${input.dc}`,
    `Loot-Qualität: ${BEAST_LOOT_QUALITY_HINT[quality]}`,
  ]
    .filter(Boolean)
    .join("\n");

  return requestLootSuggestion(context, isCritical, quantities);
}
