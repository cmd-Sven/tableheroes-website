"use client";

import { Plus, X } from "lucide-react";
import type { Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import { ABILITY_LABELS_DE } from "@/src/lib/characters/dnd5e/types";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import type {
  LoreRaceAbilityBonuses,
  LoreRaceBonusSpec,
  LoreRaceFeatureEntry,
  LoreRaceFeatureType,
} from "@/src/lib/lore-race-bonuses";
import {
  hasLoreRaceBonusContent,
  parseRaceTraits,
  serializeRaceTraits,
} from "@/src/lib/lore-race-bonuses";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

type Props = {
  displayText: string;
  bonusSpec: LoreRaceBonusSpec | null;
  onDisplayTextChange: (value: string) => void;
  onBonusSpecChange: (value: LoreRaceBonusSpec | null) => void;
};

function emptyBonusSpec(): LoreRaceBonusSpec {
  return { v: 1, abilityBonuses: {}, features: [] };
}

function ensureBonusSpec(spec: LoreRaceBonusSpec | null): LoreRaceBonusSpec {
  return spec ?? emptyBonusSpec();
}

function newFeature(type: LoreRaceFeatureType): LoreRaceFeatureEntry {
  if (type === "skill") {
    return {
      type: "skill",
      name: "",
      description: "",
      skillKey: "his",
      skillBonus: 1,
    };
  }
  return {
    type: "other",
    name: "",
    description: "",
  };
}

export function LoreRaceBonusEditor({
  displayText,
  bonusSpec,
  onDisplayTextChange,
  onBonusSpecChange,
}: Props) {
  const spec = ensureBonusSpec(bonusSpec);
  const features = spec.features ?? [];

  function updateSpec(patch: Partial<LoreRaceBonusSpec>) {
    onBonusSpecChange({ ...spec, ...patch });
  }

  function updateAbilityBonus(key: keyof LoreRaceAbilityBonuses, raw: string) {
    const parsed = raw.trim() === "" ? 0 : Number.parseInt(raw, 10);
    const value = Number.isFinite(parsed) ? parsed : 0;
    const next = { ...(spec.abilityBonuses ?? {}) };
    if (value === 0) {
      delete next[key];
    } else {
      next[key] = value;
    }
    updateSpec({
      abilityBonuses: Object.keys(next).length > 0 ? next : undefined,
    });
  }

  function updateFeature(index: number, patch: Partial<LoreRaceFeatureEntry>) {
    const next = features.map((f, i) => (i === index ? { ...f, ...patch } : f));
    updateSpec({ features: next });
  }

  function removeFeature(index: number) {
    updateSpec({ features: features.filter((_, i) => i !== index) });
  }

  function addFeature(type: LoreRaceFeatureType) {
    updateSpec({ features: [...features, newFeature(type)] });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block font-barlow font-bold text-xs uppercase text-gray-300">
          Besondere Merkmale (Beschreibung)
        </label>
        <textarea
          rows={4}
          value={displayText}
          onChange={(e) => onDisplayTextChange(e.target.value)}
          className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none transition-all focus:border-accent-gold resize-none"
          placeholder="Physische und kulturelle Merkmale der Rasse — erscheint im Charakterbogen."
        />
      </div>

      <div>
        <label className="mb-2 block font-barlow font-bold text-xs uppercase text-gray-300">
          Rassenboni (Attribute)
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ABILITY_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="min-w-[7rem] font-libre text-[11px] text-gray-400">
                {ABILITY_LABELS_DE[key]}
              </span>
              <input
                type="number"
                min={-5}
                max={5}
                step={1}
                value={spec.abilityBonuses?.[key] ?? ""}
                onChange={(e) => updateAbilityBonus(key, e.target.value)}
                className="w-16 rounded border border-hero-dark bg-slate-900/80 px-2 py-1 font-libre text-xs text-white outline-none focus:border-accent-gold"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] font-libre text-gray-500">
          Positive Werte wie +1 oder +2 — werden beim Rassenwechsel automatisch verrechnet.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="font-barlow font-bold text-xs uppercase text-gray-300">
            Weitere Besonderheiten
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => addFeature("skill")}
              className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:border-accent-gold"
            >
              <Plus className="h-3 w-3" />
              Fertigkeit
            </button>
            <button
              type="button"
              onClick={() => addFeature("other")}
              className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:border-accent-gold"
            >
              <Plus className="h-3 w-3" />
              Sonstiges
            </button>
          </div>
        </div>

        {features.length === 0 ? (
          <p className="rounded border border-dashed border-hero-border/60 bg-slate-900/40 p-3 font-libre text-[11px] text-gray-500">
            Noch keine mechanischen Besonderheiten — z. B. Fertigkeitsbonus oder Roboter-Begleiter.
          </p>
        ) : (
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li
                key={feature.id ?? `feature-${index}`}
                className="rounded border border-hero-border bg-slate-900/50 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                    {feature.type === "skill" ? "Fertigkeitsbonus" : "Besonderheit"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="rounded p-1 text-gray-500 hover:bg-accent-blood/20 hover:text-accent-blood"
                    aria-label="Entfernen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {feature.type === "skill" ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block font-barlow text-[10px] uppercase text-gray-500">
                        Fertigkeit
                      </label>
                      <select
                        value={feature.skillKey ?? "his"}
                        onChange={(e) =>
                          updateFeature(index, {
                            skillKey: e.target.value as Dnd5eSkillKey,
                            name:
                              feature.name?.trim() ||
                              DND5E_SKILLS.find((s) => s.key === e.target.value)?.labelDe ||
                              "",
                          })
                        }
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none focus:border-accent-gold"
                      >
                        {DND5E_SKILLS.map((skill) => (
                          <option key={skill.key} value={skill.key}>
                            {skill.labelDe}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-barlow text-[10px] uppercase text-gray-500">
                        Bonus
                      </label>
                      <input
                        type="number"
                        min={-10}
                        max={10}
                        step={1}
                        value={feature.skillBonus ?? 1}
                        onChange={(e) =>
                          updateFeature(index, {
                            skillBonus: Number.parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none focus:border-accent-gold"
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block font-barlow text-[10px] uppercase text-gray-500">
                    Name
                  </label>
                  <input
                    type="text"
                    value={feature.name}
                    onChange={(e) => updateFeature(index, { name: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none focus:border-accent-gold"
                    placeholder={
                      feature.type === "skill" ? "Optional — Standard ist Fertigkeitsname" : "z. B. Kleiner Roboter"
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block font-barlow text-[10px] uppercase text-gray-500">
                    Beschreibung
                  </label>
                  <textarea
                    rows={2}
                    value={feature.description}
                    onChange={(e) => updateFeature(index, { description: e.target.value })}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-xs text-white outline-none focus:border-accent-gold resize-none"
                    placeholder={
                      feature.type === "skill"
                        ? "Optional — z. B. situativer Bonus"
                        : "Regeltext für den Charakterbogen"
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function parseRaceTraitsFormState(raw: string | null | undefined): {
  displayText: string;
  bonusSpec: LoreRaceBonusSpec | null;
} {
  const parsed = parseRaceTraits(raw);
  const bonuses = parsed.bonuses;
  if (bonuses?.features) {
    bonuses.features = bonuses.features.map((f) => ({
      ...f,
      type: f.type ?? (f.skillKey ? "skill" : "other"),
    }));
  }
  return { displayText: parsed.displayText, bonusSpec: bonuses };
}

export function serializeRaceTraitsFormState(
  displayText: string,
  bonusSpec: LoreRaceBonusSpec | null,
): string {
  const cleaned = bonusSpec && hasLoreRaceBonusContent(bonusSpec) ? bonusSpec : null;
  return serializeRaceTraits(displayText, cleaned);
}
