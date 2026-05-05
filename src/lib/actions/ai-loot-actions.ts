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

/**
 * KI-Beutevorschlag für die Loot-Gun (GM prüft vor Freigabe). Alle Fließtexte auf Deutsch.
 */
export async function requestLootSuggestion(
  context: string,
  isCritical: boolean,
): Promise<LootSuggestion> {
  const ctx =
    String(context ?? "").trim() ||
    "Allgemeine Beute nach einem Encounter (Fantasy-Rollenspiel, deutschsprachige Tischrunde).";
  const critHint = isCritical
    ? `KRITISCH: Mindestens EIN Item mit rarity "rare" oder "very rare" (wertvoller/seltener Fund).`
    : "Seltenheit überwiegend common/uncommon; höchstens ein rare.";

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
- gp, sp: nicht negativ; gp typisch 0–120, sp 0–50.
- 1–6 Items.
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

Kontext der Szene (kann deutsch oder anders sein, du antwortest trotzdem nur mit deutschen Item-Texten):\n${ctx}`;

  const raw = (await callOpenAIJson(
    systemPrompt,
    "Generiere jetzt die Beute als JSON. Alle Felder name, desc, mundaneName, mundaneDesc und der Stapel-Name auf Deutsch.",
  )) as Record<string, unknown>;

  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: LootSuggestionItem[] = itemsRaw.slice(0, 8).map((row) => {
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

  return {
    name: String(raw.name ?? "Beutestapel").trim().slice(0, 120),
    gp: clampInt(raw.gp, 0, 5000),
    sp: clampInt(raw.sp, 0, 2000),
    items,
  };
}
