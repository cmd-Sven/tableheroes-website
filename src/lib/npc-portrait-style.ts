import type { WorldBlueprint } from "@/src/types/world";

export type PortraitArtStyle = {
  label: string;
  promptSuffix: string;
  genre: string;
  techLevel: string;
  magicPrevalence: string;
};

/** Leitet aus dem Welt-Blueprint einen D&D-5e-tauglichen Charakter-Art-Stil ab. */
export function buildPortraitArtStyle(blueprint: WorldBlueprint | null): PortraitArtStyle {
  const genre = blueprint?.vibes?.genre?.trim() || "Fantasy";
  const techLevel = blueprint?.vibes?.tech_level?.trim() || "Mittelalter";
  const magicPrevalence = blueprint?.vibes?.magic_prevalence?.trim() || "moderat verbreitet";

  const label = `${genre} · D&D-5e-Charakterportrait`;

  const promptSuffix = [
    "Official Dungeons & Dragons 5th edition character portrait style.",
    `Setting genre: ${genre}.`,
    `Technology level: ${techLevel}.`,
    `Magic in the world: ${magicPrevalence}.`,
    "Semi-realistic fantasy illustration, painterly digital art, dramatic rim lighting.",
    "Bust portrait, shoulders up, neutral blurred background.",
    "No text, no watermark, no UI frames, no modern clothing unless the setting explicitly allows it.",
  ].join(" ");

  return { label, promptSuffix, genre, techLevel, magicPrevalence };
}

export function buildPortraitImagePrompt(params: {
  name: string;
  appearance: string;
  race?: string;
  age?: string;
  gender?: string;
  role?: string;
  artStyle: PortraitArtStyle;
  styleOverride?: string;
}): string {
  const parts = [
    params.name ? `Character: ${params.name}` : null,
    params.race ? `Race: ${params.race}` : null,
    params.age ? `Age: ${params.age}` : null,
    params.gender ? `Gender presentation: ${params.gender}` : null,
    params.role ? `Occupation/role: ${params.role}` : null,
    `Visual description: ${params.appearance.trim()}`,
    params.styleOverride?.trim() || params.artStyle.promptSuffix,
  ].filter(Boolean);

  const prompt = parts.join(". ");
  return prompt.length > 3900 ? `${prompt.slice(0, 3897)}...` : prompt;
}
