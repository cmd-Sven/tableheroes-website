"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import type { Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import { abilityModifier, formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import { xpForLevel } from "@/src/lib/characters/dnd5e/xp-table";
import {
  applyLevelUpDraft,
  getAllClassProgressions,
  getFeats,
  getSpellsForClass,
  highestAvailableSpellLevel,
  planLevelUp,
  spellListClassIdForSubclass,
  SRD_ATTRIBUTION,
  type AbilityKeyShort,
  type AsiChoice,
  type ClassId,
  type LevelUpDraft,
  type RaceId,
} from "@/src/lib/characters/dnd5e/progression";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import { saveDnd5eCharacterSheet } from "@/src/app/dashboard/campaigns/[id]/character-sheet-actions";

type MetaSnapshot = {
  name: string;
  className: string;
  subclass: string;
  race: string;
  background: string;
  alignment: string;
  level: number;
  experiencePoints: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  characterId: string;
  sheet: Dnd5eSheetData;
  meta: MetaSnapshot;
  overrides: Record<string, boolean | number | null>;
  onApplied: () => void;
};

type StepId =
  | "overview"
  | "hp"
  | "subclass"
  | "features"
  | "raceFeatures"
  | "asi"
  | "spells"
  | "summary";

const ABILITIES: AbilityKeyShort[] = ["str", "dex", "con", "int", "wis", "cha"];

const RACE_OPTIONS: RaceId[] = [
  "dragonborn",
  "dwarf",
  "elf",
  "gnome",
  "half-elf",
  "half-orc",
  "halfling",
  "human",
  "tiefling",
];

export function LevelUpWizardModal({
  open,
  onClose,
  campaignId,
  characterId,
  sheet,
  meta,
  overrides,
  onApplied,
}: Props) {
  const { t, locale } = useCharacterSheetLocale();
  const [isPending, startTransition] = useTransition();

  const [classOverride, setClassOverride] = useState<ClassId | null>(null);
  const [raceOverride, setRaceOverride] = useState<RaceId | null>(null);

  const [subclassId, setSubclassId] = useState<string | null>(null);

  const plan = useMemo(
    () =>
      planLevelUp({
        className: meta.className,
        subclass: meta.subclass || null,
        raceName: meta.race,
        fromLevel: meta.level,
        sheet,
        classIdOverride: classOverride ?? undefined,
        raceIdOverride: raceOverride ?? undefined,
        subclassOverride: subclassId,
      }),
    [meta, sheet, classOverride, raceOverride, subclassId],
  );

  const steps = useMemo(() => {
    const list: StepId[] = ["overview", "hp"];
    if (plan.needsSubclass) list.push("subclass");
    if (plan.features.length > 0) list.push("features");
    if (plan.raceFeatures.length > 0) list.push("raceFeatures");
    if (plan.needsAsi) list.push("asi");
    if (plan.spellcasting) list.push("spells");
    list.push("summary");
    return list;
  }, [plan]);

  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? "overview";

  const conMod = abilityModifier(sheet.abilities.con?.score ?? 10);
  const [hpMode, setHpMode] = useState<"avg" | "roll">("avg");
  const [hpRoll, setHpRoll] = useState(plan.hitDie);
  const hpGain =
    hpMode === "avg" ? plan.hpAverage : Math.max(1, Math.floor(hpRoll) + conMod);

  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>(() =>
    plan.features.map((f) => f.id),
  );
  const [selectedRaceFeatureIds, setSelectedRaceFeatureIds] = useState<string[]>(
    () => plan.raceFeatures.map((f) => f.id),
  );
  const [asiMode, setAsiMode] = useState<"asi" | "feat">("asi");
  const [asiStyle, setAsiStyle] = useState<"plus2" | "plus1x2">("plus2");
  const [asiA, setAsiA] = useState<AbilityKeyShort>("str");
  const [asiB, setAsiB] = useState<AbilityKeyShort>("dex");
  const [featId, setFeatId] = useState("");
  const [featQuery, setFeatQuery] = useState("");
  const [customFeatName, setCustomFeatName] = useState("");
  const [customFeatDesc, setCustomFeatDesc] = useState("");
  const [useCustomFeat, setUseCustomFeat] = useState(false);
  const [newSpellIds, setNewSpellIds] = useState<string[]>([]);
  const [setXpToThreshold, setSetXpToThreshold] = useState(false);

  useEffect(() => {
    setSelectedFeatureIds(plan.features.map((f) => f.id));
    setSelectedRaceFeatureIds(plan.raceFeatures.map((f) => f.id));
  }, [plan.features, plan.raceFeatures]);

  useEffect(() => {
    if (plan.isEpicBoonLevel) {
      setAsiMode("feat");
    }
  }, [plan.isEpicBoonLevel, plan.toLevel]);

  useEffect(() => {
    setStepIndex(0);
    setSubclassId(null);
  }, [plan.fromLevel, plan.toLevel, plan.classId, plan.raceId]);

  const feats = useMemo(() => getFeats(), []);
  const filteredFeats = useMemo(() => {
    const q = featQuery.trim().toLowerCase();
    if (!q) return feats;
    return feats.filter(
      (f) =>
        f.nameEn.toLowerCase().includes(q) ||
        f.nameDe.toLowerCase().includes(q) ||
        f.id.includes(q),
    );
  }, [feats, featQuery]);

  const spellChoices = useMemo(() => {
    if (!plan.classId || !plan.spellcasting) return { cantrips: [], leveled: [] };
    const maxLvl = highestAvailableSpellLevel(plan);
    const subclassHint = subclassId || meta.subclass || null;
    const listClassId =
      spellListClassIdForSubclass(plan.classId, subclassHint) ?? plan.classId;
    const all = getSpellsForClass(listClassId, Math.max(1, maxLvl));
    const owned = new Set((sheet.spells ?? []).map((s) => s.id));
    return {
      cantrips: all.filter((s) => s.level === 0 && !owned.has(s.id)),
      leveled: all.filter((s) => s.level >= 1 && s.level <= maxLvl && !owned.has(s.id)),
    };
  }, [plan, sheet.spells, subclassId, meta.subclass]);

  if (!open) return null;

  const classes = getAllClassProgressions();
  const locName = (en: string, de: string) => (locale === "de" ? de || en : en || de);

  function toggleId(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function toggleSpell(id: string, bucket: "cantrip" | "leveled") {
    const limit =
      bucket === "cantrip"
        ? (plan.spellcasting?.cantripsToLearn ?? 0)
        : (plan.spellcasting?.spellsToLearn ?? 0);
    const pool =
      bucket === "cantrip"
        ? spellChoices.cantrips.map((s) => s.id)
        : spellChoices.leveled.map((s) => s.id);
    const selectedInBucket = newSpellIds.filter((x) => pool.includes(x));
    if (newSpellIds.includes(id)) {
      setNewSpellIds(newSpellIds.filter((x) => x !== id));
      return;
    }
    if (limit > 0 && selectedInBucket.length >= limit) return;
    if (limit === 0 && selectedInBucket.length >= 4) return;
    setNewSpellIds([...newSpellIds, id]);
  }

  function buildAsi(): AsiChoice | null {
    if (!plan.needsAsi) return null;
    if (plan.isEpicBoonLevel || asiMode === "feat") {
      if (useCustomFeat) {
        return {
          type: "feat",
          featId: "custom",
          customName: customFeatName,
          customDescription: customFeatDesc,
        };
      }
      if (!featId) return null;
      return { type: "feat", featId };
    }
    if (asiStyle === "plus2") {
      return { type: "asi", increases: [{ ability: asiA, delta: 2 }] };
    }
    if (asiA === asiB) return null;
    return {
      type: "asi",
      increases: [
        { ability: asiA, delta: 1 },
        { ability: asiB, delta: 1 },
      ],
    };
  }

  function canProceed(): boolean {
    if (step === "subclass") return Boolean(subclassId);
    if (step === "asi") {
      const asi = buildAsi();
      if (!asi) return false;
      if (asi.type === "feat" && asi.featId === "custom" && !asi.customName?.trim()) {
        return false;
      }
      return true;
    }
    if (step === "spells" && plan.spellcasting) {
      const cantripsPicked = newSpellIds.filter((id) =>
        spellChoices.cantrips.some((s) => s.id === id),
      ).length;
      const spellsPicked = newSpellIds.filter((id) =>
        spellChoices.leveled.some((s) => s.id === id),
      ).length;
      if (cantripsPicked < (plan.spellcasting.cantripsToLearn ?? 0)) return false;
      if (spellsPicked < (plan.spellcasting.spellsToLearn ?? 0)) return false;
    }
    return true;
  }

  function buildDraft(): LevelUpDraft {
    return {
      plan,
      hpGain,
      selectedFeatureIds,
      selectedRaceFeatureIds,
      subclassId,
      asi: buildAsi(),
      newSpellIds,
      customSpells: [],
      customFeature: null,
      setXpToThreshold,
    };
  }

  function handleApply() {
    const threshold = xpForLevel(plan.toLevel);
    if (meta.experiencePoints < threshold) {
      const ok = window.confirm(
        t("levelUp.xpLowConfirm", { level: String(plan.toLevel) }),
      );
      if (!ok) return;
    }

    startTransition(async () => {
      try {
        const draft = buildDraft();
        const applied = applyLevelUpDraft(sheet, draft, meta.experiencePoints);
        const result = await saveDnd5eCharacterSheet({
          campaignId,
          characterId,
          sheet: applied.sheet,
          overrides,
          meta: {
            name: meta.name,
            race: meta.race,
            class: meta.className,
            subclass: (applied.meta.subclass ?? meta.subclass) || null,
            background: meta.background,
            alignment: meta.alignment,
            level: applied.meta.level,
            experiencePoints:
              applied.meta.experiencePoints ?? meta.experiencePoints,
          },
        });
        if (!result.success) {
          toast.error(result.error ?? t("levelUp.error"));
          return;
        }
        toast.success(t("levelUp.success"));
        onApplied();
        onClose();
      } catch {
        toast.error(t("levelUp.error"));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal
        aria-label={t("levelUp.title")}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-hero-border bg-background-dark shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-hero-dark px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent-gold" />
            <h2 className="font-barlow text-lg font-bold uppercase text-hero-vibrant">
              {t("levelUp.title")}
            </h2>
            <span className="font-libre text-sm text-gray-400">
              {t("levelUp.fromTo", {
                from: String(plan.fromLevel),
                to: String(plan.toLevel),
              })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
            aria-label={t("levelUp.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-hero-dark px-3 py-2">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`shrink-0 rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                i === stepIndex
                  ? "bg-hero-vibrant/20 text-hero-vibrant"
                  : i < stepIndex
                    ? "text-accent-gold"
                    : "text-gray-600"
              }`}
            >
              {t(`levelUp.step.${s}` as "levelUp.step.overview")}
            </span>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {step === "overview" ? (
            <div className="space-y-3">
              <p className="font-libre text-gray-200">
                {t("levelUp.pb", {
                  from: formatSigned(plan.proficiencyBonus.from),
                  to: formatSigned(plan.proficiencyBonus.to),
                })}
              </p>
              {plan.needsSubclass ? (
                <p className="rounded border border-accent-gold/40 bg-hero-dark/30 px-3 py-2 font-libre text-sm text-accent-gold">
                  {t("levelUp.subclassCatchUp")}
                </p>
              ) : meta.subclass ? (
                <p className="font-libre text-sm text-gray-400">
                  {t("levelUp.currentSubclass", { name: meta.subclass })}
                </p>
              ) : null}
              {plan.features.length > 0 ? (
                <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3">
                  <p className="mb-2 font-barlow text-xs font-bold uppercase text-accent-gold">
                    {t("levelUp.featuresPreview")}
                  </p>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f.id} className="font-libre text-sm text-gray-200">
                        <span className="text-gray-500">
                          {t("levelUp.levelAbbrev", { level: f.level })}:{" "}
                        </span>
                        {locName(f.nameEn, f.nameDe)}
                        {f.subclass ? (
                          <span className="text-accent-gold/80">
                            {" "}
                            · {t("levelUp.subclassTag")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="font-libre text-sm text-gray-500">
                  {plan.needsSubclass
                    ? t("levelUp.featuresAfterSubclass")
                    : t("levelUp.noFeatures")}
                </p>
              )}
              {plan.spellcasting ? (
                <p className="font-libre text-xs text-gray-400">
                  {t("levelUp.spellcastingPreview", {
                    cantrips: String(plan.spellcasting.cantripsToLearn),
                    spells: String(plan.spellcasting.spellsToLearn),
                  })}
                </p>
              ) : null}
              <label className="block space-y-1">
                <span className="font-barlow text-xs uppercase text-gray-500">
                  {t("levelUp.classDetected")}
                </span>
                <select
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                  value={plan.classId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value as ClassId | "";
                    setClassOverride(v || null);
                  }}
                >
                  <option value="">{t("levelUp.classUnknown")}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {locName(c.nameEn, c.nameDe)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="font-barlow text-xs uppercase text-gray-500">
                  {t("levelUp.raceDetected")}
                </span>
                <select
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                  value={plan.raceId}
                  onChange={(e) => setRaceOverride(e.target.value as RaceId)}
                >
                  <option value="unknown">—</option>
                  {RACE_OPTIONS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              {!plan.classId ? (
                <p className="font-libre text-sm text-yellow-500">
                  {t("levelUp.classUnknown")}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "hp" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHpMode("avg")}
                  className={`rounded border px-3 py-2 font-barlow text-xs font-bold uppercase ${
                    hpMode === "avg"
                      ? "border-hero-vibrant text-hero-vibrant"
                      : "border-hero-dark text-gray-400"
                  }`}
                >
                  {t("levelUp.hpAvg", { avg: String(plan.hpAverage) })}
                </button>
                <button
                  type="button"
                  onClick={() => setHpMode("roll")}
                  className={`rounded border px-3 py-2 font-barlow text-xs font-bold uppercase ${
                    hpMode === "roll"
                      ? "border-hero-vibrant text-hero-vibrant"
                      : "border-hero-dark text-gray-400"
                  }`}
                >
                  {t("levelUp.hpRoll")}
                </button>
              </div>
              {hpMode === "roll" ? (
                <label className="block space-y-1">
                  <span className="font-barlow text-xs uppercase text-gray-500">
                    {t("levelUp.hpRollHint")} (d{plan.hitDie})
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={plan.hitDie}
                    value={hpRoll}
                    onChange={(e) => setHpRoll(Number(e.target.value))}
                    className="w-32 rounded border border-hero-dark bg-slate-900 p-2 text-white"
                  />
                </label>
              ) : null}
              <p className="font-libre text-accent-gold">
                {t("levelUp.hpTotal", { gain: String(hpGain) })}
              </p>
            </div>
          ) : null}

          {step === "subclass" ? (
            <div className="space-y-2">
              <p className="font-barlow text-sm uppercase text-accent-gold">
                {t("levelUp.pickSubclass")}
              </p>
              <p className="font-libre text-sm text-gray-400">
                {t("levelUp.subclassCatchUpHint")}
              </p>
              {plan.subclassOptions.map((opt) => (
                <label
                  key={opt.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2"
                >
                  <input
                    type="radio"
                    name="subclass"
                    checked={subclassId === opt.id}
                    onChange={() => setSubclassId(opt.id)}
                  />
                  <span className="font-libre text-gray-200">
                    {locName(opt.nameEn, opt.nameDe)}
                  </span>
                </label>
              ))}
              {subclassId && plan.features.some((f) => f.subclass) ? (
                <div className="mt-3 rounded border border-hero-border/30 bg-hero-dark/10 p-3">
                  <p className="mb-1 font-barlow text-xs uppercase text-accent-gold">
                    {t("levelUp.subclassFeaturesNow")}
                  </p>
                  <ul className="space-y-1">
                    {plan.features
                      .filter((f) => f.subclass)
                      .map((f) => (
                        <li key={f.id} className="font-libre text-sm text-gray-300">
                          {t("levelUp.levelAbbrev", { level: f.level })}:{" "}
                          {locName(f.nameEn, f.nameDe)}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "features" ? (
            <div className="space-y-2">
              {plan.features.length === 0 ? (
                <p className="font-libre text-gray-500">{t("levelUp.noFeatures")}</p>
              ) : (
                plan.features.map((f) => (
                  <label
                    key={f.id}
                    className="block cursor-pointer rounded border border-hero-border/40 bg-hero-dark/20 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedFeatureIds.includes(f.id)}
                        onChange={() =>
                          toggleId(selectedFeatureIds, f.id, setSelectedFeatureIds)
                        }
                      />
                      <div>
                        <p className="font-cinzel font-bold text-accent-gold">
                          {locName(f.nameEn, f.nameDe)}
                          <span className="ml-2 font-barlow text-xs font-bold uppercase text-gray-500">
                            {t("levelUp.levelAbbrev", { level: f.level })}
                            {f.subclass ? ` · ${t("levelUp.subclassAbbrev")}` : ""}
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap font-libre text-sm text-gray-300">
                          {(locale === "de"
                            ? f.descriptionDe || f.descriptionEn
                            : f.descriptionEn || f.descriptionDe) ?? ""}
                        </p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          ) : null}

          {step === "raceFeatures" ? (
            <div className="space-y-2">
              {plan.raceFeatures.map((f) => (
                <label
                  key={f.id}
                  className="block cursor-pointer rounded border border-hero-border/40 bg-hero-dark/20 p-3"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedRaceFeatureIds.includes(f.id)}
                      onChange={() =>
                        toggleId(
                          selectedRaceFeatureIds,
                          f.id,
                          setSelectedRaceFeatureIds,
                        )
                      }
                    />
                    <div>
                      <p className="font-cinzel font-bold text-accent-gold">
                        {locName(f.nameEn, f.nameDe)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-libre text-sm text-gray-300">
                        {(locale === "de"
                          ? f.descriptionDe || f.descriptionEn
                          : f.descriptionEn || f.descriptionDe) ?? ""}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : null}

          {step === "asi" ? (
            <div className="space-y-4">
              <p className="font-barlow text-sm uppercase text-accent-gold">
                {plan.isEpicBoonLevel
                  ? t("levelUp.epicBoonTitle")
                  : t("levelUp.asiTitle")}
              </p>
              {plan.isEpicBoonLevel ? (
                <p className="font-libre text-sm text-gray-400">
                  {t("levelUp.epicBoonHint")}
                </p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAsiMode("asi")}
                    className={`rounded border px-3 py-2 font-barlow text-xs font-bold uppercase ${
                      asiMode === "asi"
                        ? "border-hero-vibrant text-hero-vibrant"
                        : "border-hero-dark text-gray-400"
                    }`}
                  >
                    {t("levelUp.asiOption")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsiMode("feat")}
                    className={`rounded border px-3 py-2 font-barlow text-xs font-bold uppercase ${
                      asiMode === "feat"
                        ? "border-hero-vibrant text-hero-vibrant"
                        : "border-hero-dark text-gray-400"
                    }`}
                  >
                    {t("levelUp.featOption")}
                  </button>
                </div>
              )}

              {!plan.isEpicBoonLevel && asiMode === "asi" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAsiStyle("plus2")}
                      className={`rounded border px-2 py-1 font-barlow text-[10px] uppercase ${
                        asiStyle === "plus2"
                          ? "border-accent-gold text-accent-gold"
                          : "border-hero-dark text-gray-500"
                      }`}
                    >
                      {t("levelUp.asiPlus2")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsiStyle("plus1x2")}
                      className={`rounded border px-2 py-1 font-barlow text-[10px] uppercase ${
                        asiStyle === "plus1x2"
                          ? "border-accent-gold text-accent-gold"
                          : "border-hero-dark text-gray-500"
                      }`}
                    >
                      {t("levelUp.asiPlus1x2")}
                    </button>
                  </div>
                  <select
                    value={asiA}
                    onChange={(e) => setAsiA(e.target.value as AbilityKeyShort)}
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                  >
                    {ABILITIES.map((a) => (
                      <option key={a} value={a}>
                        {t(`levelUp.ability.${a}` as "levelUp.ability.str")} (
                        {sheet.abilities[a]?.score ?? 10})
                      </option>
                    ))}
                  </select>
                  {asiStyle === "plus1x2" ? (
                    <select
                      value={asiB}
                      onChange={(e) => setAsiB(e.target.value as AbilityKeyShort)}
                      className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                    >
                      {ABILITIES.map((a) => (
                        <option key={a} value={a}>
                          {t(`levelUp.ability.${a}` as "levelUp.ability.str")} (
                          {sheet.abilities[a]?.score ?? 10})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="search"
                    value={featQuery}
                    onChange={(e) => setFeatQuery(e.target.value)}
                    placeholder={
                      plan.isEpicBoonLevel
                        ? t("levelUp.epicBoonSearch")
                        : t("levelUp.featSearch")
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                  />
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {filteredFeats.map((f) => (
                      <label
                        key={f.id}
                        className="flex cursor-pointer gap-2 rounded border border-hero-border/30 p-2"
                      >
                        <input
                          type="radio"
                          name="feat"
                          checked={!useCustomFeat && featId === f.id}
                          onChange={() => {
                            setUseCustomFeat(false);
                            setFeatId(f.id);
                          }}
                        />
                        <div>
                          <p className="font-barlow font-bold text-white">
                            {locName(f.nameEn, f.nameDe)}
                          </p>
                          <p className="line-clamp-3 font-libre text-xs text-gray-400">
                            {locale === "de"
                              ? f.descriptionDe || f.descriptionEn
                              : f.descriptionEn || f.descriptionDe}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={useCustomFeat}
                      onChange={(e) => setUseCustomFeat(e.target.checked)}
                    />
                    {t("levelUp.featCustom")}
                  </label>
                  {useCustomFeat ? (
                    <div className="space-y-2">
                      <input
                        value={customFeatName}
                        onChange={(e) => setCustomFeatName(e.target.value)}
                        placeholder={t("levelUp.featCustomName")}
                        className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                      />
                      <textarea
                        value={customFeatDesc}
                        onChange={(e) => setCustomFeatDesc(e.target.value)}
                        rows={3}
                        className="w-full rounded border border-hero-dark bg-slate-900 p-2 text-white"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {step === "spells" && plan.spellcasting ? (
            <div className="space-y-4">
              <p className="font-libre text-sm text-gray-300">{t("levelUp.spellsSlots")}</p>
              {plan.spellcasting.preparedHint ? (
                <p className="font-libre text-xs text-gray-500">
                  {t("levelUp.spellsPreparedHint")}
                </p>
              ) : null}
              <p className="font-libre text-xs text-accent-gold">
                Slots:{" "}
                {Object.entries(plan.spellcasting.slotsMax)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(" · ") || "—"}
              </p>

              {plan.spellcasting.cantripsToLearn > 0 ? (
                <div>
                  <p className="mb-2 font-barlow text-xs uppercase text-accent-gold">
                    {t("levelUp.spellsCantrips", {
                      count: String(plan.spellcasting.cantripsToLearn),
                    })}
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {spellChoices.cantrips.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer gap-2 rounded border border-hero-border/20 px-2 py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={newSpellIds.includes(s.id)}
                          onChange={() => toggleSpell(s.id, "cantrip")}
                        />
                        <span className="font-libre text-gray-200">
                          {locName(s.nameEn, s.nameDe)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {plan.spellcasting.spellsToLearn > 0 || plan.spellcasting.preparedHint ? (
                <div>
                  <p className="mb-2 font-barlow text-xs uppercase text-accent-gold">
                    {t("levelUp.spellsKnown", {
                      count: String(plan.spellcasting.spellsToLearn || "0–4"),
                    })}
                  </p>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {spellChoices.leveled.slice(0, 80).map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer gap-2 rounded border border-hero-border/20 px-2 py-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={newSpellIds.includes(s.id)}
                          onChange={() => toggleSpell(s.id, "leveled")}
                        />
                        <span className="font-libre text-gray-200">
                          [{s.level}] {locName(s.nameEn, s.nameDe)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === "summary" ? (
            <div className="space-y-3 font-libre text-gray-200">
              <p>{t("levelUp.summaryHp", { gain: String(hpGain) })}</p>
              <p>
                {t("levelUp.summaryFeatures", {
                  count: String(
                    selectedFeatureIds.length + selectedRaceFeatureIds.length,
                  ),
                })}
              </p>
              {plan.needsAsi ? (
                <p>
                  {plan.isEpicBoonLevel
                    ? t("levelUp.summaryEpicBoon")
                    : t("levelUp.summaryAsi")}
                </p>
              ) : null}
              <p>
                {t("levelUp.summarySpells", { count: String(newSpellIds.length) })}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={setXpToThreshold}
                  onChange={(e) => setSetXpToThreshold(e.target.checked)}
                />
                {t("levelUp.setXp")}
              </label>
            </div>
          ) : null}
        </div>

        <footer className="space-y-2 border-t border-hero-dark px-4 py-3">
          <p className="font-libre text-[10px] text-gray-600" title={SRD_ATTRIBUTION}>
            {t("levelUp.attribution")}
          </p>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              disabled={stepIndex === 0 || isPending}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1 rounded border border-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-300 disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("levelUp.back")}
            </button>
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                disabled={!canProceed() || isPending}
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="inline-flex items-center gap-1 rounded border border-hero-vibrant bg-hero-dark/40 px-3 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
              >
                {t("levelUp.next")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canProceed() || isPending}
                onClick={handleApply}
                className="inline-flex items-center gap-1 rounded border border-accent-gold bg-accent-gold/10 px-3 py-2 font-barlow text-xs font-bold uppercase text-accent-gold disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
                {isPending ? t("levelUp.applying") : t("levelUp.apply")}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
