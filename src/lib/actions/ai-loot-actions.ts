"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type LootSuggestionItem = {
  name: string;
  desc: string;
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
 * KI-Beutevorschlag für die Loot-Gun (GM prüft vor Freigabe).
 */
export async function requestLootSuggestion(
  context: string,
  isCritical: boolean,
): Promise<LootSuggestion> {
  const ctx = String(context ?? "").trim() || "Allgemeine Beute nach einem Encounter.";
  const critHint = isCritical
    ? `KRITISCH: Plane mindestens EIN Item mit Seltenheit "rare" oder "very rare" (wertvoller/seltener Fund).`
    : "Seltenheit überwiegend common/uncommon; höchstens ein rare.";

  const systemPrompt = `Du bist ein D&D-5e-Loot-Generator. Antworte NUR mit JSON in exakt diesem Schema (keine Erklärungen):
{
  "name": string,
  "gp": number,
  "sp": number,
  "items": Array<{
    "name": string,
    "desc": string,
    "rarity": string,
    "price": number,
    "isMagical": boolean
  }>
}
Regeln:
- gp und sp nicht negativ, gp typischerweise 0–120, sp 0–50.
- 1–6 Items.
- rarity in Kleinbuchstaben: common, uncommon, rare, very rare, legendary.
- price = grober Goldwert in gp (ganze Zahl), orientierung an Seltenheit.
- ${critHint}
Kontext der Szene:\n${ctx}`;

  const raw = (await callOpenAIJson(
    systemPrompt,
    "Generiere jetzt die Beute als JSON.",
  )) as Record<string, unknown>;

  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: LootSuggestionItem[] = itemsRaw.slice(0, 8).map((row) => {
    const o = row as Record<string, unknown>;
    const rarity = String(o.rarity ?? "common").trim().toLowerCase();
    return {
      name: String(o.name ?? "Fundstück").trim().slice(0, 160),
      desc: String(o.desc ?? "").trim().slice(0, 800),
      rarity: rarity || "common",
      price: clampInt(o.price, 0, 50000),
      isMagical: Boolean(o.isMagical ?? o.is_magical),
    };
  });

  return {
    name: String(raw.name ?? "Beutestapel").trim().slice(0, 120),
    gp: clampInt(raw.gp, 0, 5000),
    sp: clampInt(raw.sp, 0, 2000),
    items,
  };
}
