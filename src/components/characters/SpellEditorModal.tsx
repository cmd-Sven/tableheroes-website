"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  AbilityKey,
  Dnd5eSpellEntry,
  Dnd5eSpellPreparationMode,
} from "@/src/lib/characters/dnd5e/types";
import { ABILITY_KEYS } from "@/src/lib/characters/dnd5e/types";
import {
  createEmptySpell,
  hydrateSpellComponentFlags,
  normalizeSpellEntry,
  SPELL_DAMAGE_TYPES,
  SPELL_SCHOOL_KEYS,
  spellDamageTypeLabel,
  spellSchoolLabel,
} from "@/src/lib/characters/dnd5e/spellcasting";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  /** null = neuer Zauber */
  spell: Dnd5eSpellEntry | null;
  onClose: () => void;
  onSave: (spell: Dnd5eSpellEntry) => void;
};

const PREP_MODES: Dnd5eSpellPreparationMode[] = [
  "prepared",
  "known",
  "always",
  "pact",
  "innate",
  "atwill",
];

const CASTING_TIME_PRESETS = [
  "1 action",
  "1 bonus action",
  "1 reaction",
  "1 minute",
  "10 minutes",
  "1 hour",
  "8 hours",
  "12 hours",
  "24 hours",
];

const RANGE_PRESETS = [
  "Self",
  "Touch",
  "5 feet",
  "30 feet",
  "60 feet",
  "90 feet",
  "120 feet",
  "150 feet",
  "300 feet",
  "Sight",
  "Unlimited",
  "Special",
];

const DURATION_PRESETS = [
  "Instantaneous",
  "1 round",
  "1 minute",
  "10 minutes",
  "1 hour",
  "8 hours",
  "24 hours",
  "Until dispelled",
  "Special",
];

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 font-barlow text-[10px] uppercase transition-colors ${
        active
          ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
          : "border-hero-border text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
      {children}
    </span>
  );
}

const inputClass =
  "w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant";

export function SpellEditorModal({ spell, onClose, onSave }: Props) {
  const { t, locale, abilityLabel } = useCharacterSheetLocale();
  const isNew = spell === null;
  const [draft, setDraft] = useState<Dnd5eSpellEntry>(() =>
    spell ? hydrateSpellComponentFlags({ ...spell }) : createEmptySpell(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(spell ? hydrateSpellComponentFlags({ ...spell }) : createEmptySpell());
    setError(null);
  }, [spell]);

  function patch(partial: Partial<Dnd5eSpellEntry>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function handleSave() {
    const name = draft.name.trim() || draft.nameDe?.trim() || draft.nameEn?.trim() || "";
    if (!name) {
      setError(t("spellEditor.nameMissing"));
      return;
    }
    const normalized = normalizeSpellEntry({
      ...draft,
      name,
      source: draft.source === "foundry" ? "foundry" : "manual",
    });
    onSave(normalized);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? t("spellEditor.titleNew") : t("spellEditor.titleEdit")}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-hero-border bg-background-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-hero-dark px-4 py-3">
          <h2 className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
            {isNew ? t("spellEditor.titleNew") : t("spellEditor.titleEdit")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
            aria-label={t("sheet.closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <FieldLabel>{t("spellEditor.name")}</FieldLabel>
              <input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={inputClass}
                placeholder={t("spellEditor.namePlaceholder")}
                autoFocus
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.nameDe")}</FieldLabel>
              <input
                value={draft.nameDe ?? ""}
                onChange={(e) => patch({ nameDe: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.nameEn")}</FieldLabel>
              <input
                value={draft.nameEn ?? ""}
                onChange={(e) => patch({ nameEn: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.level")}</FieldLabel>
              <select
                value={draft.level}
                onChange={(e) => patch({ level: Number(e.target.value) })}
                className={inputClass}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? t("spells.cantrips") : t("spells.levelHeading", { level: i })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.school")}</FieldLabel>
              <select
                value={draft.school ?? "evo"}
                onChange={(e) => patch({ school: e.target.value })}
                className={inputClass}
              >
                {SPELL_SCHOOL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {spellSchoolLabel(key, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.prepMode")}</FieldLabel>
              <select
                value={draft.preparationMode ?? "prepared"}
                onChange={(e) =>
                  patch({ preparationMode: e.target.value as Dnd5eSpellPreparationMode })
                }
                className={inputClass}
              >
                {PREP_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`spellEditor.mode.${mode}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToggleChip
              label={t("spells.ritual")}
              active={Boolean(draft.ritual)}
              onClick={() => patch({ ritual: !draft.ritual })}
            />
            <ToggleChip
              label={t("spells.concentration")}
              active={Boolean(draft.concentration)}
              onClick={() => patch({ concentration: !draft.concentration })}
            />
            <ToggleChip
              label={t("spells.prepared")}
              active={Boolean(draft.prepared)}
              onClick={() => patch({ prepared: !draft.prepared })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.castingTime")}</FieldLabel>
              <input
                list="spell-casting-times"
                value={draft.castingTime ?? ""}
                onChange={(e) => patch({ castingTime: e.target.value })}
                className={inputClass}
              />
              <datalist id="spell-casting-times">
                {CASTING_TIME_PRESETS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.range")}</FieldLabel>
              <input
                list="spell-ranges"
                value={draft.range ?? ""}
                onChange={(e) => patch({ range: e.target.value })}
                className={inputClass}
              />
              <datalist id="spell-ranges">
                {RANGE_PRESETS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.duration")}</FieldLabel>
              <input
                list="spell-durations"
                value={draft.duration ?? ""}
                onChange={(e) => patch({ duration: e.target.value })}
                className={inputClass}
              />
              <datalist id="spell-durations">
                {DURATION_PRESETS.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.target")}</FieldLabel>
              <input
                value={draft.target ?? ""}
                onChange={(e) => patch({ target: e.target.value })}
                className={inputClass}
                placeholder={t("spellEditor.targetPlaceholder")}
              />
            </label>
          </div>

          <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3 space-y-3">
            <FieldLabel>{t("spellEditor.components")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                label="V"
                active={Boolean(draft.componentVocal)}
                onClick={() => patch({ componentVocal: !draft.componentVocal })}
              />
              <ToggleChip
                label="S"
                active={Boolean(draft.componentSomatic)}
                onClick={() => patch({ componentSomatic: !draft.componentSomatic })}
              />
              <ToggleChip
                label="M"
                active={Boolean(draft.componentMaterial)}
                onClick={() => patch({ componentMaterial: !draft.componentMaterial })}
              />
            </div>
            {draft.componentMaterial ? (
              <label className="block space-y-1">
                <FieldLabel>{t("spellEditor.materials")}</FieldLabel>
                <input
                  value={draft.materials ?? ""}
                  onChange={(e) => patch({ materials: e.target.value })}
                  className={inputClass}
                  placeholder={t("spellEditor.materialsPlaceholder")}
                />
              </label>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.attackType")}</FieldLabel>
              <select
                value={draft.attackType ?? "none"}
                onChange={(e) =>
                  patch({
                    attackType: e.target.value as Dnd5eSpellEntry["attackType"],
                  })
                }
                className={inputClass}
              >
                <option value="none">{t("spellEditor.attackNone")}</option>
                <option value="melee">{t("spellEditor.attackMelee")}</option>
                <option value="ranged">{t("spellEditor.attackRanged")}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.saveAbility")}</FieldLabel>
              <select
                value={draft.saveAbility ?? ""}
                onChange={(e) =>
                  patch({
                    saveAbility: (e.target.value || null) as AbilityKey | null,
                  })
                }
                className={inputClass}
              >
                <option value="">{t("spellEditor.saveNone")}</option>
                {ABILITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {abilityLabel(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <FieldLabel>{t("spellEditor.damage")}</FieldLabel>
              <input
                value={draft.damage ?? ""}
                onChange={(e) => patch({ damage: e.target.value })}
                className={inputClass}
                placeholder="8d6"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <FieldLabel>{t("spellEditor.damageType")}</FieldLabel>
            <select
              value={draft.damageType ?? ""}
              onChange={(e) => patch({ damageType: e.target.value || null })}
              className={inputClass}
            >
              <option value="">{t("spellEditor.damageTypeNone")}</option>
              {SPELL_DAMAGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {spellDamageTypeLabel(type, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <FieldLabel>{t("spellEditor.description")}</FieldLabel>
            <textarea
              value={
                locale === "de"
                  ? draft.descriptionDe || draft.description || ""
                  : draft.descriptionEn || draft.description || ""
              }
              onChange={(e) => {
                const value = e.target.value;
                if (locale === "de") {
                  patch({ descriptionDe: value, description: value });
                } else {
                  patch({ descriptionEn: value, description: value });
                }
              }}
              rows={5}
              className={inputClass}
              placeholder={t("spellEditor.descriptionPlaceholder")}
            />
          </label>

          <label className="block space-y-1">
            <FieldLabel>{t("spellEditor.higherLevels")}</FieldLabel>
            <textarea
              value={draft.higherLevels ?? ""}
              onChange={(e) => patch({ higherLevels: e.target.value })}
              rows={2}
              className={inputClass}
              placeholder={t("spellEditor.higherLevelsPlaceholder")}
            />
          </label>

          {error ? (
            <p className="font-libre text-sm text-accent-blood">{error}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-hero-dark px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-300 hover:bg-hero-dark"
          >
            {t("spellEditor.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase text-black hover:bg-yellow-500"
          >
            {t("spellEditor.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
