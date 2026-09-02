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
}

const SYSTEM_PROMPT =
  "Du bist der Container-Wizard von Table-Heroes. Erstelle einen D&D 5e Behälter (Kiste, Fass, etc.) basierend auf locationLoreContext. Optional mit Falle. Antworte ausschließlich mit einem JSON-Objekt.";

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
