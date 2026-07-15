"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Save, ScrollText, Shield, Backpack, BookOpen } from "lucide-react";
import { toast } from "sonner";
import {
  loadDnd5eCharacterSheet,
  saveDnd5eCharacterSheet,
} from "@/src/app/dashboard/campaigns/[id]/character-sheet-actions";
import { ABILITY_KEYS } from "@/src/lib/characters/dnd5e/types";
import type {
  AbilityKey,
  CharacterSheetPayload,
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSkillKey,
  SkillProficiency,
} from "@/src/lib/characters/dnd5e/types";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import { FoundryProgressionLockNotice } from "@/src/components/foundry/FoundryProgressionLockNotice";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import { Dnd5eEquipmentTab } from "@/src/components/characters/Dnd5eEquipmentTab";
import {
  CharacterSheetBiographyCultureTab,
  type CharacterSheetBiographyCultureTabProps,
} from "@/src/components/characters/CharacterSheetBiographyCultureTab";
import { CharacterFlawPicker } from "@/src/components/characters/CharacterFlawPicker";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import type { CharacterFlawEntry } from "@/src/lib/characters/character-flaws";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import { normalizeEquipmentState } from "@/src/lib/characters/dnd5e/equipment";
import { CharacterSheetLanguageToggle } from "@/src/components/characters/CharacterSheetLanguageToggle";
import { CharacterRestPanel } from "@/src/components/characters/CharacterRestPanel";
import { ClassResourcesPanel } from "@/src/components/characters/ClassResourcesPanel";
import { CharacterAchievementsPanel } from "@/src/components/characters/CharacterAchievementsPanel";
import { XpProgressBar } from "@/src/components/characters/XpProgressBar";
import { ensureClassResources } from "@/src/lib/characters/dnd5e/rest";
import {
  CharacterSheetLocaleProvider,
  useCharacterSheetLocale,
} from "@/src/lib/i18n/character-sheet/context";

type SheetTab = "attributes" | "equipment" | "biography";

function ToggleSwitch({
  checked,
  disabled,
  onToggle,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-hero-vibrant focus:ring-offset-2 focus:ring-offset-background-dark disabled:opacity-50 ${
        checked ? "border-hero-vibrant bg-hero-vibrant" : "border-hero-border bg-hero-dark"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  className = "",
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1 text-center font-barlow text-sm text-white disabled:opacity-60 ${className}`}
    />
  );
}

function TextInput({
  value,
  onChange,
  disabled,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-1.5 font-libre text-sm text-white disabled:opacity-60 ${className}`}
    />
  );
}

type Props = {
  campaignId: string;
  characterId: string;
  compact?: boolean;
  onClose?: () => void;
  /** Biografie, Kultur, Portrait, Token & Zustands-Token */
  biographyCulture?: CharacterSheetBiographyCultureTabProps;
};

export function Dnd5eCharacterSheetPanelWithLocale(props: Props) {
  const { campaignId, characterId } = props;

  return (
    <CharacterSheetLocaleProvider
      campaignId={campaignId}
      characterId={characterId}
      initialLocale="de"
    >
      <Dnd5eCharacterSheetPanel {...props} />
    </CharacterSheetLocaleProvider>
  );
}

export function Dnd5eCharacterSheetPanel({
  campaignId,
  characterId,
  compact = false,
  biographyCulture,
}: Props) {
  const { t, abilityLabel, skillLabel, formatDateTime, hydrateLocale } = useCharacterSheetLocale();
  const [payload, setPayload] = useState<CharacterSheetPayload | null>(null);
  const [sheet, setSheet] = useState<Dnd5eSheetData | null>(null);
  const [meta, setMeta] = useState({
    subclass: "",
    background: "",
    alignment: "",
    name: "",
    race: "",
    className: "",
    level: 1,
    experiencePoints: 0,
  });
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<SheetTab>("attributes");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadDnd5eCharacterSheet(campaignId, characterId);
      if (!data) {
        setPayload(null);
        setSheet(null);
        return;
      }
      setPayload(data);
      const loadedSheet = ensureClassResources(structuredClone(data.sheet), data.class ?? "");
      setSheet(loadedSheet);
      setMeta({
        subclass: data.subclass ?? "",
        background: data.background ?? "",
        alignment: data.alignment ?? "",
        name: data.name,
        race: data.race ?? "",
        className: data.class ?? "",
        level: data.level,
        experiencePoints: data.experiencePoints,
      });
      hydrateLocale(data.sheetLocale);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("sheet.loadError"));
    } finally {
      setLoading(false);
    }
  }, [campaignId, characterId, hydrateLocale, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const derived = useMemo(() => {
    if (!sheet) return null;
    return computeDerivedDnd5eSheet(sheet, meta.level);
  }, [sheet, meta.level]);

  const characterFlaws: CharacterFlawEntry[] = biographyCulture?.characterFlaws ?? [];

  const flawAdjusted = useMemo(() => {
    if (!derived || !sheet) return null;
    return applyFlawModifiersToDerived(derived, sheet.combat.speed, characterFlaws);
  }, [derived, sheet, characterFlaws]);

  const displayDerived = flawAdjusted?.derived ?? derived;

  const canEdit = payload?.canEdit ?? false;
  const readOnly = !editMode || !canEdit;
  const passivePerception = flawAdjusted?.passivePerception ?? (derived ? 10 + derived.skills.prc.total : 10);
  const displaySpeed = flawAdjusted?.displaySpeed ?? sheet?.combat.speed ?? 0;
  const flawNotes = flawAdjusted?.flawNotes ?? [];
  const hasFlawAdjustments = flawAdjusted?.hasFlawAdjustments ?? false;

  function updateAbility(key: AbilityKey, score: number) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      abilities: { ...sheet.abilities, [key]: { score } },
    });
  }

  function updateSave(key: AbilityKey, proficient: boolean) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      savingThrows: { ...sheet.savingThrows, [key]: { proficient } },
    });
  }

  function updateSkill(key: Dnd5eSkillKey, proficient: SkillProficiency) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      skills: { ...sheet.skills, [key]: { ...sheet.skills[key], proficient } },
    });
  }

  function updateCombat<K extends keyof Dnd5eSheetData["combat"]>(
    key: K,
    value: Dnd5eSheetData["combat"][K],
  ) {
    if (!sheet) return;
    setSheet({ ...sheet, combat: { ...sheet.combat, [key]: value } });
  }

  function updateFeature(index: number, patch: Partial<Dnd5eFeatureEntry>) {
    if (!sheet) return;
    const features = [...sheet.features];
    features[index] = { ...features[index], ...patch };
    setSheet({ ...sheet, features });
  }

  function addFeature() {
    if (!sheet) return;
    setSheet({
      ...sheet,
      features: [
        ...sheet.features,
        { id: crypto.randomUUID(), name: t("field.newFeat"), description: null, source: "manual" },
      ],
    });
  }

  function removeFeature(index: number) {
    if (!sheet) return;
    setSheet({ ...sheet, features: sheet.features.filter((_, i) => i !== index) });
  }

  function handleEquipmentChange(equipment: Dnd5eEquipmentState) {
    if (!sheet) return;
    setSheet({ ...sheet, equipment: normalizeEquipmentState(equipment) });
  }

  function handleSave(silent = false) {
    if (!sheet || !payload) return;
    startTransition(async () => {
      const result = await saveDnd5eCharacterSheet({
        campaignId,
        characterId,
        sheet,
        overrides: payload.overrides,
        meta: {
          subclass: meta.subclass,
          background: meta.background,
          alignment: meta.alignment,
          name: meta.name,
          race: meta.race,
          class: meta.className,
          level: meta.level,
          experiencePoints: meta.experiencePoints,
        },
      });
      if (!result.success) {
        toast.error(result.error ?? t("sheet.saveError"));
        return;
      }
      if (!silent) {
        toast.success(t("sheet.saved"));
        setEditMode(false);
      }
      await reload();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-libre text-sm">{t("sheet.loading")}</span>
      </div>
    );
  }

  if (!payload || !sheet || !derived || !displayDerived) {
    return (
      <div className="rounded-lg border border-hero-dark bg-background-card p-6 text-center">
        <p className="font-libre text-gray-400">
          {t("sheet.unavailable")}
        </p>
      </div>
    );
  }

  const classLevelLabel = [meta.className, meta.subclass ? `(${meta.subclass})` : null]
    .filter(Boolean)
    .join(" ");

  const portraitSrc =
    biographyCulture?.avatarBlobUrl ||
    biographyCulture?.avatarUrl?.trim() ||
    null;

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-wrap items-center justify-between gap-4 ${compact ? "" : "rounded-lg border border-hero-dark bg-background-card p-4"}`}
      >
        <div>
          <h2 className="font-barlow text-xl font-bold uppercase text-white flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-accent-gold" />
            {t("sheet.title")}
          </h2>
          {payload.sheetSyncedAt ? (
            <p className="mt-1 font-libre text-xs text-gray-500">
              {t("sheet.foundrySynced")}{" "}
              {formatDateTime(payload.sheetSyncedAt)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {!compact ? <CharacterSheetLanguageToggle /> : null}
          <label className="flex items-center gap-3 cursor-pointer">
          <span className="font-barlow text-xs font-bold uppercase tracking-wide text-gray-400">
            {editMode ? t("sheet.editMode") : t("sheet.viewMode")}
          </span>
          <ToggleSwitch
            checked={editMode}
            disabled={!canEdit}
            onToggle={() => setEditMode((v) => !v)}
            label={editMode ? t("sheet.editModeAria") : t("sheet.viewModeAria")}
          />
        </label>
        </div>
      </div>

      <div className="flex gap-1 border-b border-hero-dark">
        <button
          type="button"
          onClick={() => setActiveTab("attributes")}
          className={`inline-flex items-center gap-2 px-4 py-2 font-barlow text-xs font-bold uppercase border-b-2 transition-colors ${
            activeTab === "attributes"
              ? "border-hero-vibrant text-hero-vibrant"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <ScrollText className="h-3.5 w-3.5" />
          {t("tab.attributes")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("equipment")}
          className={`inline-flex items-center gap-2 px-4 py-2 font-barlow text-xs font-bold uppercase border-b-2 transition-colors ${
            activeTab === "equipment"
              ? "border-hero-vibrant text-hero-vibrant"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Backpack className="h-3.5 w-3.5" />
          {t("tab.equipment")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("biography")}
          className={`inline-flex items-center gap-2 px-4 py-2 font-barlow text-xs font-bold uppercase border-b-2 transition-colors ${
            activeTab === "biography"
              ? "border-hero-vibrant text-hero-vibrant"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t("tab.biography")}
        </button>
      </div>

      {activeTab === "equipment" ? (
        <Dnd5eEquipmentTab
          characterId={characterId}
          sheet={sheet}
          derived={derived}
          level={meta.level}
          readOnly={readOnly}
          onEquipmentChange={handleEquipmentChange}
        />
      ) : null}

      {activeTab === "attributes" ? (
        <>
          {payload.progressionLocked ? (
            <FoundryProgressionLockNotice message={payload.progressionLockMessage} />
          ) : null}

          {/* Kopfzeile wie PHB-Bogen */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4">
            <div className="grid gap-3 lg:grid-cols-12">
              <label className="lg:col-span-4 space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.characterName")}
                </span>
                <TextInput
                  value={meta.name}
                  disabled={readOnly}
                  onChange={(v) => setMeta({ ...meta, name: v })}
                  className="text-lg font-bold"
                />
              </label>
              <label className="lg:col-span-3 space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.classLevel")}
                </span>
                <div className="flex gap-2">
                  <TextInput
                    value={classLevelLabel}
                    disabled={readOnly || payload.progressionLocked}
                    placeholder={t("field.classPlaceholder")}
                    onChange={(v) => setMeta({ ...meta, className: v })}
                    className="flex-1"
                  />
                  <NumberInput
                    value={meta.level}
                    min={1}
                    disabled={readOnly || payload.progressionLocked}
                    onChange={(v) => setMeta({ ...meta, level: Math.max(1, v) })}
                    className="!w-16"
                  />
                </div>
              </label>
              <label className="lg:col-span-2 space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.background")}
                </span>
                <TextInput
                  value={meta.background}
                  disabled={readOnly}
                  onChange={(v) => setMeta({ ...meta, background: v })}
                />
              </label>
              <label className="lg:col-span-3 space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.race")}
                </span>
                <TextInput
                  value={meta.race}
                  disabled={readOnly}
                  onChange={(v) => setMeta({ ...meta, race: v })}
                />
              </label>
              <label className="lg:col-span-3 space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.alignment")}
                </span>
                <TextInput
                  value={meta.alignment}
                  disabled={readOnly}
                  onChange={(v) => setMeta({ ...meta, alignment: v })}
                />
              </label>
              <label className="lg:col-span-3 space-y-1">
                <XpProgressBar
                  currentXp={meta.experiencePoints}
                  level={meta.level}
                  editMode={editMode}
                  readOnly={readOnly || payload.progressionLocked}
                  onChange={(v) => setMeta({ ...meta, experiencePoints: v })}
                />
              </label>
              <div className="lg:col-span-2 flex items-end">
                <div className="w-full rounded border border-hero-border/60 bg-hero-dark/40 px-3 py-2 text-center">
                  <p className="font-barlow text-[10px] uppercase text-gray-500">{t("field.proficiencyBonus")}</p>
                  <p className="font-barlow text-2xl font-bold text-accent-gold">
                    {formatSigned(derived.proficiencyBonus)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-12">
            {/* Linke Spalte: Portrait, Attribute, Rettungswürfe, Fertigkeiten */}
            <div className="xl:col-span-4 space-y-4">
              {portraitSrc ? (
                <section className="rounded-lg border border-hero-dark bg-background-card p-4 flex flex-col items-center">
                  <CharacterAvatarImage
                    src={portraitSrc}
                    avatarDisplay={biographyCulture?.avatarDisplay}
                    className="h-44 w-44 shrink-0 rounded-lg border-2 border-hero-border bg-hero-dark shadow-lg"
                    alt={meta.name || t("field.portraitAlt")}
                  />
                  <p className="mt-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {t("field.portrait")}
                  </p>
                </section>
              ) : null}
              <section className="rounded-lg border border-hero-dark bg-background-card p-3">
                <div className="space-y-2">
                  {ABILITY_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded border border-hero-border/40 bg-hero-dark/30 px-2 py-1.5"
                    >
                      <div className="w-10 text-center">
                        <p className="font-barlow text-xl font-bold text-accent-gold leading-none">
                          {formatSigned(displayDerived.abilities[key].modifier)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-barlow text-[10px] font-bold uppercase text-gray-400 truncate">
                                                    {abilityLabel(key)}
                        </p>
                        {readOnly ? (
                          <p className="font-barlow text-xs text-gray-500">{sheet.abilities[key].score}</p>
                        ) : (
                          <NumberInput
                            value={sheet.abilities[key].score}
                            min={1}
                            max={30}
                            className="!py-0.5 !text-xs"
                            onChange={(v) => updateAbility(key, v)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-3">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-1.5 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> {t("combat.savingThrows")}
                </h3>
                <div className="space-y-1">
                  {ABILITY_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-hero-dark/20"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {!readOnly ? (
                          <input
                            type="checkbox"
                            className="shrink-0"
                            checked={sheet.savingThrows[key].proficient}
                            onChange={(e) => updateSave(key, e.target.checked)}
                          />
                        ) : (
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full border ${
                              sheet.savingThrows[key].proficient
                                ? "border-accent-gold bg-accent-gold"
                                : "border-gray-600"
                            }`}
                          />
                        )}
                        <span className="font-libre text-xs text-gray-300 truncate">
                                                    {abilityLabel(key)}
                        </span>
                      </div>
                      <span className="font-barlow text-sm text-accent-gold shrink-0">
                        {formatSigned(displayDerived.savingThrows[key].total)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-3">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-1.5 mb-2">
                  {t("combat.skills")}
                </h3>
                <div className="space-y-0.5 max-h-[28rem] overflow-y-auto pr-1">
                  {DND5E_SKILLS.map((def) => {
                    const skillDerived = displayDerived.skills[def.key];
                    const entry = sheet.skills[def.key];
                    return (
                      <div
                        key={def.key}
                        className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-hero-dark/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {!readOnly ? (
                            <select
                              value={entry.proficient}
                              onChange={(e) =>
                                updateSkill(def.key, e.target.value as SkillProficiency)
                              }
                              className="w-14 shrink-0 rounded border border-hero-border bg-hero-dark px-0.5 py-0.5 text-[10px] text-white"
                            >
                              <option value="none">—</option>
                              <option value="half">½</option>
                              <option value="proficient">P</option>
                              <option value="expertise">E</option>
                            </select>
                          ) : (
                            <span className="w-4 text-center font-barlow text-[10px] text-gray-500 shrink-0">
                              {entry.proficient === "expertise"
                                ? "E"
                                : entry.proficient === "proficient"
                                  ? "P"
                                  : entry.proficient === "half"
                                    ? "½"
                                    : ""}
                            </span>
                          )}
                          <span className="font-libre text-xs text-gray-300 truncate">
                            {skillLabel(def.key)}
                            <span className="ml-1 text-[9px] uppercase text-gray-600">
                              ({def.ability})
                            </span>
                          </span>
                        </div>
                        <span className="font-barlow text-sm text-accent-gold shrink-0 w-8 text-right">
                          {formatSigned(skillDerived.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded border border-hero-border/50 bg-hero-dark/30 px-3 py-2 flex items-center justify-between">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">
                    {t("combat.passivePerception")}
                  </span>
                  <span className="font-barlow text-lg font-bold text-white">{passivePerception}</span>
                </div>
              </section>
            </div>

            {/* Mittlere Spalte: Kampf */}
            <div className="xl:col-span-4 space-y-4">
              <section className="rounded-lg border border-hero-dark bg-background-card p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border-2 border-hero-border/70 bg-hero-dark/40 p-3">
                    <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">{t("combat.ac")}</p>
                    {readOnly ? (
                      <p className="font-barlow text-4xl font-bold text-white mt-1">{derived.ac}</p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.ac}
                        min={0}
                        className="mt-1 !text-2xl !font-bold"
                        onChange={(v) => updateCombat("ac", v)}
                      />
                    )}
                  </div>
                  <div className="rounded-lg border-2 border-hero-border/70 bg-hero-dark/40 p-3">
                    <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">{t("combat.initiative")}</p>
                    {readOnly ? (
                      <p className="font-barlow text-4xl font-bold text-white mt-1">
                        {formatSigned(displayDerived.initiative)}
                      </p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.initiativeBonus}
                        className="mt-1 !text-2xl !font-bold"
                        onChange={(v) => updateCombat("initiativeBonus", v)}
                      />
                    )}
                  </div>
                  <div className="rounded-lg border-2 border-hero-border/70 bg-hero-dark/40 p-3">
                    <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                      {t("combat.speed")}
                    </p>
                    {readOnly ? (
                      <p className="font-barlow text-4xl font-bold text-white mt-1">
                        {displaySpeed}
                      </p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.speed}
                        min={0}
                        className="mt-1 !text-2xl !font-bold"
                        onChange={(v) => updateCombat("speed", v)}
                      />
                    )}
                    <p className="font-barlow text-[9px] text-gray-500 mt-0.5">{t("combat.speedUnit")}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                  {t("combat.hitPoints")}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1">
                    <span className="font-barlow text-[10px] uppercase text-gray-500">{t("combat.hpMax")}</span>
                    {readOnly ? (
                      <p className="font-barlow text-2xl font-bold text-white text-center">
                        {sheet.combat.hpMax}
                      </p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.hpMax}
                        min={0}
                        onChange={(v) => updateCombat("hpMax", v)}
                      />
                    )}
                  </label>
                  <label className="space-y-1">
                    <span className="font-barlow text-[10px] uppercase text-gray-500">{t("combat.hpCurrent")}</span>
                    {readOnly ? (
                      <p className="font-barlow text-2xl font-bold text-white text-center">
                        {sheet.combat.hpCurrent}
                      </p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.hpCurrent}
                        min={0}
                        onChange={(v) => updateCombat("hpCurrent", v)}
                      />
                    )}
                  </label>
                  <label className="space-y-1">
                    <span className="font-barlow text-[10px] uppercase text-gray-500">{t("combat.hpTemp")}</span>
                    {readOnly ? (
                      <p className="font-barlow text-2xl font-bold text-white text-center">
                        {sheet.combat.hpTemp}
                      </p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.hpTemp}
                        min={0}
                        onChange={(v) => updateCombat("hpTemp", v)}
                      />
                    )}
                  </label>
                </div>
              </section>

              {sheet ? (
                <CharacterRestPanel
                  sheet={sheet}
                  className={meta.className}
                  readOnly={readOnly}
                  onSheetChange={setSheet}
                  onPersist={() => handleSave(true)}
                />
              ) : null}

              {sheet ? (
                <ClassResourcesPanel
                  sheet={sheet}
                  readOnly={readOnly}
                  onSheetChange={setSheet}
                />
              ) : null}

              <section className="rounded-lg border border-hero-dark bg-background-card p-4 grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">{t("combat.hitDice")}</span>
                  <TextInput
                    value={sheet.combat.hitDice}
                    disabled={readOnly}
                    onChange={(v) => updateCombat("hitDice", v)}
                  />
                </label>
                <div className="space-y-2">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">{t("combat.deathSaves")}</span>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">{t("combat.deathSaveSuccesses")}</p>
                      {readOnly ? (
                        <p className="text-white">{sheet.combat.deathSaveSuccesses ?? 0}</p>
                      ) : (
                        <NumberInput
                          value={sheet.combat.deathSaveSuccesses ?? 0}
                          min={0}
                          max={3}
                          onChange={(v) => updateCombat("deathSaveSuccesses", v)}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">{t("combat.deathSaveFailures")}</p>
                      {readOnly ? (
                        <p className="text-white">{sheet.combat.deathSaveFailures ?? 0}</p>
                      ) : (
                        <NumberInput
                          value={sheet.combat.deathSaveFailures ?? 0}
                          min={0}
                          max={3}
                          onChange={(v) => updateCombat("deathSaveFailures", v)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Rechte Spalte: Feats & Proficiencies */}
            <div className="xl:col-span-4 space-y-4">
              <section className="rounded-lg border border-hero-dark bg-background-card p-4 min-h-[20rem] flex flex-col">
                <div className="flex items-center justify-between border-b border-hero-dark pb-2 mb-3">
                  <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                    {t("features.title")}
                  </h3>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={addFeature}
                      className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-white"
                    >
                      {t("features.add")}
                    </button>
                  ) : null}
                </div>
                {sheet.features.length === 0 ? (
                  <p className="font-libre text-sm text-gray-500 flex-1">{t("features.empty")}</p>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[24rem] pr-1">
                    {sheet.features.map((feat, index) => (
                      <div
                        key={feat.id}
                        className="rounded border border-hero-border/40 bg-hero-dark/20 p-2.5"
                      >
                        {readOnly ? (
                          <>
                            <p className="font-barlow text-sm font-bold text-white">{feat.name}</p>
                            {feat.description ? (
                              <p className="mt-1 font-libre text-xs text-gray-400 whitespace-pre-wrap line-clamp-4">
                                {feat.description}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <TextInput
                                value={feat.name}
                                onChange={(v) => updateFeature(index, { name: v })}
                                className="flex-1 !text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => removeFeature(index)}
                                className="text-[10px] text-red-400 hover:text-red-300 px-1"
                              >
                                ×
                              </button>
                            </div>
                            <textarea
                              value={feat.description ?? ""}
                              onChange={(e) => updateFeature(index, { description: e.target.value })}
                              rows={2}
                              className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white"
                              placeholder={t("field.descriptionPlaceholder")}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-2">
                  {t("proficiencies.title")}
                </h3>
                {(
                  [
                    ["proficiencies.armor", sheet.proficiencies.armor],
                    ["proficiencies.weapons", sheet.proficiencies.weapons],
                    ["proficiencies.tools", sheet.proficiencies.tools],
                    ["proficiencies.languages", sheet.proficiencies.languages],
                  ] as const
                ).map(([labelKey, items]) =>
                  items.length > 0 ? (
                    <div key={labelKey}>
                      <p className="font-barlow text-[10px] uppercase text-gray-500 mb-1">{t(labelKey)}</p>
                      <p className="font-libre text-xs text-gray-300">{items.join(", ")}</p>
                    </div>
                  ) : null,
                )}
                {sheet.proficiencies.armor.length === 0 &&
                sheet.proficiencies.weapons.length === 0 &&
                sheet.proficiencies.tools.length === 0 &&
                sheet.proficiencies.languages.length === 0 ? (
                  <p className="font-libre text-sm text-gray-500">{t("proficiencies.empty")}</p>
                ) : null}
              </section>

              <CharacterAchievementsPanel achievements={payload.achievements ?? []} />

              <section className="rounded-lg border border-hero-dark bg-background-card p-4">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-2 mb-2">
                  {t("field.notes")}
                </h3>
                {readOnly ? (
                  <p className="font-libre text-sm text-gray-300 whitespace-pre-wrap min-h-[4rem]">
                    {sheet.notes?.trim() || t("proficiencies.empty")}
                  </p>
                ) : (
                  <textarea
                    value={sheet.notes ?? ""}
                    onChange={(e) => setSheet({ ...sheet, notes: e.target.value })}
                    rows={4}
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                    placeholder={t("field.notesPlaceholder")}
                  />
                )}
              </section>

              {biographyCulture ? (
                <CharacterFlawPicker
                  characterFlaws={characterFlaws}
                  onCharacterFlawsChange={biographyCulture.onCharacterFlawsChange}
                  readOnly={biographyCulture.readOnly}
                  compact
                />
              ) : null}

              {hasFlawAdjustments || flawNotes.length > 0 ? (
                <section className="rounded-lg border border-accent-blood/30 bg-accent-blood/5 p-4 space-y-2">
                  <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-blood">
                    {t("flaws.effectsTitle")}
                  </h3>
                  {hasFlawAdjustments ? (
                    <p className="font-libre text-xs text-gray-400">
                      {t("flaws.effectsHint")}
                    </p>
                  ) : null}
                  {flawNotes.length > 0 ? (
                    <ul className="space-y-1.5">
                      {flawNotes.map((note) => (
                        <li key={`${note.flawId}-${note.text}`} className="font-libre text-xs text-gray-300">
                          <span className="font-barlow font-bold text-gray-400">{note.flawName}:</span>{" "}
                          {note.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
            </div>
          </div>

          {editMode && canEdit ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSave()}
                className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-5 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("sheet.save")}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === "biography" && biographyCulture ? (
        <CharacterSheetBiographyCultureTab {...biographyCulture} />
      ) : null}

      {activeTab === "equipment" && editMode && canEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave()}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-5 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("sheet.saveEquipment")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
