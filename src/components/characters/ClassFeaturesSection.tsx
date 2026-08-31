"use client";

import { HelpCircle } from "lucide-react";
import type { Dnd5eFeatureEntry, Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import {
  featureHasEditableChoices,
  mergeFeatureChoices,
  updateFeatureChoice,
} from "@/src/lib/characters/dnd5e/feature-choices";
import {
  getClassFeatureGroups,
  type FeatureListItem,
} from "@/src/lib/characters/dnd5e/feature-entry";
import {
  localizedFeatureDescription,
  localizedFeatureName,
} from "@/src/lib/characters/dnd5e/spellcasting";
import {
  useCharacterSheetLocale,
  type CharacterSheetMessageKey,
} from "@/src/lib/i18n/character-sheet/context";

const CHOICE_LABEL_KEYS: Record<string, CharacterSheetMessageKey> = {
  "weapon-1": "classFeatures.choiceWeapon1",
  "weapon-2": "classFeatures.choiceWeapon2",
  "skill-1": "classFeatures.choiceSkill1",
  "skill-2": "classFeatures.choiceSkill2",
  language: "classFeatures.choiceLanguage",
};

type Props = {
  features: Dnd5eFeatureEntry[];
  characterClass: string | null;
  characterSubclass: string | null;
  level: number;
  readOnly: boolean;
  onUpdateFeature: (index: number, patch: Partial<Dnd5eFeatureEntry>) => void;
  onFeatureHelp: (title: string, description: string | null) => void;
};

function FeatureChoiceFields({
  feature,
  readOnly,
  onChoiceChange,
}: {
  feature: Dnd5eFeatureEntry;
  readOnly: boolean;
  onChoiceChange: (choiceId: string, value: string) => void;
}) {
  const { t, locale, skillLabel } = useCharacterSheetLocale();
  const choices = mergeFeatureChoices(feature);
  if (choices.length === 0) return null;

  const isExpertise = feature.id.includes("expertise");
  const choiceLabel = (choiceId: string, fallback: string) =>
    CHOICE_LABEL_KEYS[choiceId] ? t(CHOICE_LABEL_KEYS[choiceId]) : fallback;

  return (
    <div className="mt-2 space-y-1.5 border-t border-hero-border/30 pt-2">
      <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-500">
        {t("classFeatures.choicesTitle")}
      </p>
      {choices.map((choice) => (
        <label key={choice.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="shrink-0 font-barlow text-[10px] font-bold uppercase text-gray-400 sm:w-24">
            {choiceLabel(choice.id, choice.label)}
          </span>
          {isExpertise ? (
            <select
              value={choice.value ?? ""}
              disabled={readOnly}
              onChange={(e) => onChoiceChange(choice.id, e.target.value)}
              className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-xs text-white disabled:opacity-70"
            >
              <option value="">{t("classFeatures.choiceUnset")}</option>
              {DND5E_SKILLS.map((skill) => (
                <option key={skill.key} value={skill.key}>
                  {skillLabel(skill.key)}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={choice.value ?? ""}
              disabled={readOnly}
              onChange={(e) => onChoiceChange(choice.id, e.target.value)}
              placeholder={t("classFeatures.choicePlaceholder")}
              className="min-w-0 flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-xs text-white placeholder:text-gray-600 disabled:opacity-70"
            />
          )}
        </label>
      ))}
    </div>
  );
}

function FeatureCard({
  item,
  variant,
  readOnly,
  onUpdateFeature,
  onFeatureHelp,
}: {
  item: FeatureListItem;
  variant: "class" | "subclass";
  readOnly: boolean;
  onUpdateFeature: (index: number, patch: Partial<Dnd5eFeatureEntry>) => void;
  onFeatureHelp: (title: string, description: string | null) => void;
}) {
  const { t, locale, skillLabel } = useCharacterSheetLocale();
  const { feature, index } = item;
  const name = localizedFeatureName(feature, locale);
  const description = localizedFeatureDescription(feature, locale);
  const level = feature.level;
  const hasChoices = featureHasEditableChoices(feature);

  const borderClass =
    variant === "subclass"
      ? "border-accent-gold/50 bg-accent-gold/5"
      : "border-hero-vibrant/40 bg-hero-vibrant/5";

  const levelBadgeClass =
    variant === "subclass"
      ? "border-accent-gold/60 text-accent-gold"
      : "border-hero-vibrant/60 text-hero-vibrant";

  return (
    <div className={`rounded border p-2.5 ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-barlow text-sm font-bold text-white">{name}</p>
            {level != null ? (
              <span
                className={`rounded border px-1.5 py-0.5 font-barlow text-[9px] font-bold uppercase ${levelBadgeClass}`}
              >
                {t("classFeatures.levelBadge", { level })}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFeatureHelp(name, description)}
          className="shrink-0 rounded p-1 text-gray-500 hover:bg-hero-dark/50 hover:text-accent-gold focus:outline-none focus:ring-2 focus:ring-hero-vibrant"
          aria-label={t("features.help.aria", { name })}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {hasChoices && !readOnly ? (
        <FeatureChoiceFields
          feature={feature}
          readOnly={readOnly}
          onChoiceChange={(choiceId, value) =>
            onUpdateFeature(index, { choices: updateFeatureChoice(feature, choiceId, value) })
          }
        />
      ) : hasChoices ? (
        <div className="mt-2 space-y-0.5 border-t border-hero-border/30 pt-2">
          {mergeFeatureChoices(feature)
            .filter((c) => c.value)
            .map((c) => {
              const displayValue =
                feature.id.includes("expertise") && c.value
                  ? skillLabel(c.value as Dnd5eSkillKey)
                  : c.value;
              const label = CHOICE_LABEL_KEYS[c.id]
                ? t(CHOICE_LABEL_KEYS[c.id])
                : c.label;
              return (
                <p key={c.id} className="font-libre text-xs text-gray-400">
                  <span className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                    {label}:
                  </span>{" "}
                  {displayValue}
                </p>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}

function FeatureGroup({
  title,
  variant,
  items,
  readOnly,
  onUpdateFeature,
  onFeatureHelp,
}: {
  title: string;
  variant: "class" | "subclass";
  items: FeatureListItem[];
  readOnly: boolean;
  onUpdateFeature: (index: number, patch: Partial<Dnd5eFeatureEntry>) => void;
  onFeatureHelp: (title: string, description: string | null) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4
        className={`font-cinzel text-xs font-bold ${
          variant === "subclass" ? "text-accent-gold" : "text-hero-vibrant"
        }`}
      >
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <FeatureCard
            key={`${item.feature.id}-${item.index}`}
            item={item}
            variant={variant}
            readOnly={readOnly}
            onUpdateFeature={onUpdateFeature}
            onFeatureHelp={onFeatureHelp}
          />
        ))}
      </div>
    </div>
  );
}

export function ClassFeaturesSection({
  features,
  characterClass,
  characterSubclass,
  level,
  readOnly,
  onUpdateFeature,
  onFeatureHelp,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const { class: classItems, subclass: subclassItems } = getClassFeatureGroups(
    features,
    characterClass ?? "",
    characterSubclass,
    level,
  );

  if (classItems.length === 0 && subclassItems.length === 0) {
    return (
      <section className="rounded-lg border border-hero-dark bg-background-card p-4">
        <h3 className="mb-3 border-b border-hero-dark pb-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
          {t("classFeatures.title")}
        </h3>
        <p className="font-libre text-sm text-gray-500">{t("classFeatures.empty")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
      <h3 className="border-b border-hero-dark pb-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
        {t("classFeatures.title")}
      </h3>
      <FeatureGroup
        title={t("classFeatures.classGroup")}
        variant="class"
        items={classItems}
        readOnly={readOnly}
        onUpdateFeature={onUpdateFeature}
        onFeatureHelp={onFeatureHelp}
      />
      <FeatureGroup
        title={t("classFeatures.subclassGroup")}
        variant="subclass"
        items={subclassItems}
        readOnly={readOnly}
        onUpdateFeature={onUpdateFeature}
        onFeatureHelp={onFeatureHelp}
      />
    </section>
  );
}
