import type { Dnd5eFeatureChoice, Dnd5eFeatureEntry } from "./types";

/** Standard-Entscheidungsfelder für bekannte Klassenmerkmale. */
export function defaultChoicesForFeature(featureId: string): Dnd5eFeatureChoice[] | null {
  if (featureId.includes("weapon-mastery")) {
    return [
      { id: "weapon-1", label: "Waffe 1", value: null },
      { id: "weapon-2", label: "Waffe 2", value: null },
    ];
  }
  if (featureId.includes("expertise")) {
    return [
      { id: "skill-1", label: "Fertigkeit 1", value: null },
      { id: "skill-2", label: "Fertigkeit 2", value: null },
    ];
  }
  if (featureId === "thieves-cant") {
    return [{ id: "language", label: "Zweite Sprache", value: null }];
  }
  return null;
}

export function mergeFeatureChoices(feature: Dnd5eFeatureEntry): Dnd5eFeatureChoice[] {
  const defaults = defaultChoicesForFeature(feature.id);
  if (!defaults) return feature.choices ?? [];
  const stored = feature.choices ?? [];
  return defaults.map((d) => {
    const hit = stored.find((c) => c.id === d.id);
    return hit ? { ...d, value: hit.value ?? null } : d;
  });
}

export function featureHasEditableChoices(feature: Dnd5eFeatureEntry): boolean {
  return mergeFeatureChoices(feature).length > 0;
}

export function updateFeatureChoice(
  feature: Dnd5eFeatureEntry,
  choiceId: string,
  value: string,
): Dnd5eFeatureChoice[] {
  const merged = mergeFeatureChoices(feature);
  return merged.map((c) => (c.id === choiceId ? { ...c, value: value || null } : c));
}
