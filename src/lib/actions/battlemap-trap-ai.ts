"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Input für den Trap-Wizard (AI). */
export interface TrapWizardAiInput {
  description: string;
  targetLevel: number;
  difficulty: "easy" | "medium" | "hard";
  locationLoreContext: string;
}

/** JSON-Output des Trap-Wizards. */
export interface TrapWizardAiOutput {
  name: string;
  description: string;
  /** Perception Check DC */
  dc: number;
  /** z. B. "2d6 fire" */
  damage: string;
  /** optional, Gridfelder für Area-Effects */
  effectRadius?: number;
  isAreaEffect: boolean;
  /** z. B. "Dexterity" */
  saveType: string;
  /**
   * Optionaler CharacterConditionKey (poisoned, restrained, …)
   * oder null wenn kein Zustand.
   */
  statusEffect?: string | null;
}

const SYSTEM_PROMPT =
  "Du bist der Trap-Wizard von Table-Heroes. Erstelle eine D&D 5e Falle basierend auf der bereitgestellten `locationLoreContext`. Berücksichtige Biome und Stimmung. Sei kreativ, aber fair. Antworte ausschließlich mit einem JSON-Objekt.";

function clampDc(n: unknown, fallback: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(5, Math.min(30, v));
}

function defaultDc(difficulty: TrapWizardAiInput["difficulty"], level: number): number {
  const base = difficulty === "easy" ? 12 : difficulty === "hard" ? 17 : 15;
  return clampDc(base + Math.floor(Math.max(1, level) / 4), base);
}

/**
 * Generiert Fallen-Daten via OpenAI anhand World-Lore-Kontext.
 * UI mappt: dc→detectionDC, saveType→save_ability, damage ggf. splitten.
 */
export async function generateTrapWithAI(
  input: TrapWizardAiInput,
): Promise<TrapWizardAiOutput> {
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
            description: input.description?.trim() || "",
            targetLevel: level,
            difficulty,
            locationLoreContext:
              input.locationLoreContext?.trim() ||
              "Keine spezielle Lore — generische Fantasy-Umgebung.",
            outputSchema: {
              name: "string",
              description: "string",
              dc: "number (Perception Check)",
              damage: 'string (z.B. "2d6 fire")',
              effectRadius:
                "number (optional) — Schaden/Effekt-Radius nach Auslösen, NICHT die Trigger-Zone (Trigger ist immer 1 Zelle)",
              isAreaEffect:
                "boolean — true wenn Schaden eine Fläche trifft (AoE erst nach Trigger sichtbar)",
              saveType: 'string (z.B. "Dexterity")',
              statusEffect:
                'string|null — einer von: charmed, unconscious, blinded, exhaustion, restrained, paralyzed, grappled, incapacitated, prone, deafened, invisible, poisoned, frightened, silenced, sick, cursed — oder null',
            },
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Keine Antwort von OpenAI erhalten.");
    }

    const raw = JSON.parse(content) as Record<string, unknown>;
    const isAreaEffect = raw.isAreaEffect === true;
    const radiusRaw = Number(raw.effectRadius);
    const effectRadius =
      isAreaEffect && Number.isFinite(radiusRaw)
        ? Math.max(1, Math.min(8, Math.round(radiusRaw)))
        : isAreaEffect
          ? 2
          : undefined;

    const statusRaw =
      raw.statusEffect != null ? String(raw.statusEffect).trim() : "";
    const statusEffect =
      statusRaw && statusRaw.toLowerCase() !== "null" ? statusRaw : null;

    return {
      name: String(raw.name ?? "Unbekannte Falle").slice(0, 80),
      description: String(raw.description ?? "").slice(0, 800),
      dc: clampDc(raw.dc, fallbackDc),
      damage: String(raw.damage ?? "2d6 piercing").slice(0, 40),
      ...(effectRadius != null ? { effectRadius } : {}),
      isAreaEffect,
      saveType: String(raw.saveType ?? "Dexterity").slice(0, 32),
      statusEffect,
    };
  } catch (error) {
    console.error("[Trap-Wizard AI]", error);
    throw new Error(
      error instanceof Error
        ? `Trap-Wizard AI fehlgeschlagen: ${error.message}`
        : "Trap-Wizard AI fehlgeschlagen.",
    );
  }
}
