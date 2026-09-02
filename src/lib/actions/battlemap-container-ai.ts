"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ContainerWizardAiInput {
  description: string;
  targetLevel: number;
  difficulty: "easy" | "medium" | "hard";
  locationLoreContext: string;
  containerType: string;
  /** empty | preset | catalog — bei preset Inhalt passend zum lootPreset */
  lootMode?: "empty" | "preset" | "catalog";
  lootPreset?: "junk" | "modest" | "magical" | "gold_valuable" | null;
}

export interface ContainerWizardAiLootItem {
  name: string;
  desc?: string;
  rarity?: string;
  price?: number;
  isMagical?: boolean;
  kind?: string;
}

export interface ContainerWizardAiOutput {
  name: string;
  description: string;
  containerType?: string;
  isLocked?: boolean;
  forceOpenDc?: number;
  hasTrap?: boolean;
  trap?: {
    name: string;
    description: string;
    trapType?: "mechanical" | "magical";
    dc: number;
    damage: string;
    effectRadius?: number;
    isAreaEffect: boolean;
    saveType: string;
    statusEffect?: string | null;
    components?: Array<{
      name: string;
      description?: string;
      category: string;
      quantity: number;
      isMagical?: boolean;
    }>;
  } | null;
  /** Vorgeschlagener Inhalt, wenn lootMode=preset */
  loot?: {
    goldGp?: number;
    items?: ContainerWizardAiLootItem[];
  } | null;
}

const SYSTEM_PROMPT =
  "Du bist der Container-Wizard von Table-Heroes. Erstelle einen D&D 5e / 2024 Behälter (Kiste, Fass, etc.) basierend auf locationLoreContext. Optional mit Falle. Wenn lootMode=preset und lootPreset gesetzt ist, schlage passenden Inhalt vor (loot.goldGp + loot.items). Presets: junk=nur Plunder; modest=etwas Wertvolles/einfache Waffen; magical=mind. 1 magischer Gegenstand; gold_valuable=Gold plus wertvoller Gegenstand. Antworte ausschließlich mit einem JSON-Objekt.";

function clampDc(n: unknown, fallback: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(5, Math.min(30, v));
}

function defaultDc(
  difficulty: ContainerWizardAiInput["difficulty"],
  level: number,
): number {
  const base = difficulty === "easy" ? 12 : difficulty === "hard" ? 17 : 15;
  return clampDc(base + Math.floor(Math.max(1, level) / 4), base);
}

export async function generateContainerWithAI(
  input: ContainerWizardAiInput,
): Promise<ContainerWizardAiOutput> {
  const level = Math.max(1, Math.min(20, Math.round(Number(input.targetLevel) || 1)));
  const difficulty =
    input.difficulty === "easy" || input.difficulty === "hard"
      ? input.difficulty
      : "medium";
  const fallbackDc = defaultDc(difficulty, level);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            description: input.description,
            targetLevel: level,
            difficulty,
            locationLoreContext: input.locationLoreContext,
            containerType: input.containerType,
            lootMode: input.lootMode ?? "empty",
            lootPreset: input.lootPreset ?? null,
          }),
        },
      ],
      temperature: 0.7,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as ContainerWizardAiOutput;
    if (!parsed.name?.trim()) {
      parsed.name = "Behälter";
    }
    if (parsed.trap) {
      parsed.trap.dc = clampDc(parsed.trap.dc, fallbackDc);
    }
    if (input.lootMode !== "preset") {
      parsed.loot = null;
    } else if (parsed.loot?.items) {
      parsed.loot.items = parsed.loot.items.slice(0, 8).map((it) => ({
        name: String(it.name ?? "Gegenstand").slice(0, 160),
        desc: String(it.desc ?? "").slice(0, 800),
        rarity: String(it.rarity ?? "common").toLowerCase(),
        price: Math.max(0, Math.round(Number(it.price ?? 0))),
        isMagical: Boolean(it.isMagical),
        kind: it.kind != null ? String(it.kind) : undefined,
      }));
      parsed.loot.goldGp = Math.max(0, Math.round(Number(parsed.loot.goldGp ?? 0)));
    }
    return parsed;
  } catch {
    return {
      name: "Behälter",
      description: input.description || "Ein Behälter.",
      isLocked: true,
      hasTrap: false,
    };
  }
}
