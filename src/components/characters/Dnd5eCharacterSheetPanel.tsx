/**
 * Dnd5eCharacterSheetPanel — Der Charakterbogen in digitaler Pergamentform.
 * Attribute, Zauber, Overrides und Exhaustion — alles, was ein Held zwischen den Sessions braucht.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Loader2,
  Save,
  ScrollText,
  Shield,
  Backpack,
  BookOpen,
  Wand2,
  ClipboardCheck,
  TrendingUp,
  Dumbbell,
  Wind,
  HeartPulse,
  Brain,
  Eye,
  Sparkles,
  HelpCircle,
  X,
  type LucideIcon,
} from "lucide-react";
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
import { Dnd5eSpellsFeaturesTab } from "@/src/components/characters/Dnd5eSpellsFeaturesTab";
import {
  CharacterSheetBiographyCultureTab,
  type CharacterSheetBiographyCultureTabProps,
} from "@/src/components/characters/CharacterSheetBiographyCultureTab";
import { CharacterFlawPicker } from "@/src/components/characters/CharacterFlawPicker";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import type { CharacterFlawEntry } from "@/src/lib/characters/character-flaws";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import {
  computeArmorClassPreview,
  hasBackpackContainer,
  normalizeEquipmentState,
  withSyncedArmorClass,
} from "@/src/lib/characters/dnd5e/equipment";
import {
  getCharacterEquipmentPayload,
  saveCharacterEquipment,
} from "@/src/lib/actions/character-inventory-actions";
import type { CharacterItem } from "@/src/types/inventory";
import { CharacterSheetLanguageToggle } from "@/src/components/characters/CharacterSheetLanguageToggle";
import { CharacterRestPanel } from "@/src/components/characters/CharacterRestPanel";
import { ClassResourcesPanel } from "@/src/components/characters/ClassResourcesPanel";
import { CharacterAchievementsPanel } from "@/src/components/characters/CharacterAchievementsPanel";
import { CharakterTuvPanel } from "@/src/components/characters/CharakterTuvPanel";
import { XpProgressBar } from "@/src/components/characters/XpProgressBar";
import { LevelUpWizardModal } from "@/src/components/characters/LevelUpWizardModal";
import { FeatCatalogPickerModal } from "@/src/components/characters/FeatCatalogPickerModal";
import { ensureClassResources } from "@/src/lib/characters/dnd5e/rest";
import {
  localizedFeatureDescription,
  localizedFeatureName,
} from "@/src/lib/characters/dnd5e/spellcasting";
import {
  applyClassBasicsFromCatalog,
  classDisplayName,
  matchSheetFeatureToFeat,
  featDefinitionToFeatureEntry,
} from "@/src/lib/characters/dnd5e/progression/catalog-bridge";
import { buildLevelEditHints } from "@/src/lib/characters/dnd5e/progression/level-edit-hints";
import type { LevelEditHintId } from "@/src/lib/characters/dnd5e/progression/level-edit-hints";
import {
  applyClassProficienciesFromCatalog,
  customProficiencyEntries,
  getClassProficiencyLabels,
  getProficienciesByCategory,
  listHasProficiency,
  matchProficiencyEntry,
  proficiencyLabel,
  reconcileProficienciesWithCatalog,
  resolveProficiencyLabel,
  toggleProficiencyInList,
  type ProficiencyCategory,
  type ProficiencyDefinition,
} from "@/src/lib/characters/dnd5e/progression/proficiencies-catalog";
import {
  CLASS_IDS,
  matchSubclassOption,
  resolveClassId,
} from "@/src/lib/characters/dnd5e/progression/class-ids";
import {
  findBackgroundByName,
  getClassProgression,
} from "@/src/lib/characters/dnd5e/progression/catalog";
import {
  listBackgroundOptions,
  resolveAppliedBackgroundId,
  setCharacterBackground,
} from "@/src/lib/characters/dnd5e/progression/apply-background";
import {
  applySubclassChange,
  catalogSubclassLevel,
  listCatalogSubclassOptions,
} from "@/src/lib/characters/dnd5e/progression/apply-subclass-change";
import { applyClassChange } from "@/src/lib/characters/dnd5e/progression/apply-class-change";
import {
  CharacterSheetLocaleProvider,
  useCharacterSheetLocale,
  type CharacterSheetMessageKey,
} from "@/src/lib/i18n/character-sheet/context";
import {
  applyLoreRaceBonusesToSheet,
  filterRacesForCulture,
  formatLoreRaceBonusesForDisplay,
  getSheetCampaignLore,
  resolveLoreRaceBonuses,
  setSheetCampaignLore,
} from "@/src/lib/lore-race-bonuses";
import {
  DND5E_ALIGNMENTS,
  findAlignmentOption,
  normalizeAlignmentValue,
} from "@/src/lib/characters/dnd5e-alignments";

type SheetTab = "attributes" | "equipment" | "spells" | "biography" | "tuv";

const LEVEL_EDIT_HINT_KEYS: Record<LevelEditHintId, CharacterSheetMessageKey> = {
  subclassUnlock: "levelEdit.hint.subclassUnlock",
  subclassDue: "levelEdit.hint.subclassDue",
  asi: "levelEdit.hint.asi",
  spellSlots: "levelEdit.hint.spellSlots",
  wizardRecommend: "levelEdit.hint.wizardRecommend",
};

const ABILITY_ICONS: Record<AbilityKey, LucideIcon> = {
  str: Dumbbell,
  dex: Wind,
  con: HeartPulse,
  int: Brain,
  wis: Eye,
  cha: Sparkles,
};

const ABILITY_HELP_WHAT: Record<AbilityKey, CharacterSheetMessageKey> = {
  str: "ability.help.str.what",
  dex: "ability.help.dex.what",
  con: "ability.help.con.what",
  int: "ability.help.int.what",
  wis: "ability.help.wis.what",
  cha: "ability.help.cha.what",
};

const ABILITY_HELP_USED_FOR: Record<AbilityKey, CharacterSheetMessageKey> = {
  str: "ability.help.str.usedFor",
  dex: "ability.help.dex.usedFor",
  con: "ability.help.con.usedFor",
  int: "ability.help.int.usedFor",
  wis: "ability.help.wis.usedFor",
  cha: "ability.help.cha.usedFor",
};

/** Local help illustrations under public/images/abilities/ (full names — Windows reserves CON). */
const ABILITY_HELP_IMAGES: Record<AbilityKey, string> = {
  str: "/images/abilities/strength.jpg",
  dex: "/images/abilities/dexterity.jpg",
  con: "/images/abilities/constitution.jpg",
  int: "/images/abilities/intelligence.jpg",
  wis: "/images/abilities/wisdom.jpg",
  cha: "/images/abilities/charisma.jpg",
};

const SKILL_HELP_WHAT: Record<Dnd5eSkillKey, CharacterSheetMessageKey> = {
  acr: "skill.help.acr.what",
  ani: "skill.help.ani.what",
  arc: "skill.help.arc.what",
  ath: "skill.help.ath.what",
  dec: "skill.help.dec.what",
  his: "skill.help.his.what",
  ins: "skill.help.ins.what",
  itm: "skill.help.itm.what",
  inv: "skill.help.inv.what",
  med: "skill.help.med.what",
  nat: "skill.help.nat.what",
  prc: "skill.help.prc.what",
  prf: "skill.help.prf.what",
  per: "skill.help.per.what",
  rel: "skill.help.rel.what",
  slt: "skill.help.slt.what",
  ste: "skill.help.ste.what",
  surv: "skill.help.surv.what",
};

const SKILL_HELP_EXAMPLES: Record<Dnd5eSkillKey, CharacterSheetMessageKey> = {
  acr: "skill.help.acr.examples",
  ani: "skill.help.ani.examples",
  arc: "skill.help.arc.examples",
  ath: "skill.help.ath.examples",
  dec: "skill.help.dec.examples",
  his: "skill.help.his.examples",
  ins: "skill.help.ins.examples",
  itm: "skill.help.itm.examples",
  inv: "skill.help.inv.examples",
  med: "skill.help.med.examples",
  nat: "skill.help.nat.examples",
  prc: "skill.help.prc.examples",
  prf: "skill.help.prf.examples",
  per: "skill.help.per.examples",
  rel: "skill.help.rel.examples",
  slt: "skill.help.slt.examples",
  ste: "skill.help.ste.examples",
  surv: "skill.help.surv.examples",
};

function AbilityHelpModal({
  abilityKey,
  onClose,
}: {
  abilityKey: AbilityKey;
  onClose: () => void;
}) {
  const { t, abilityLabel } = useCharacterSheetLocale();
  const Icon = ABILITY_ICONS[abilityKey];
  const name = abilityLabel(abilityKey);
  const imageSrc = ABILITY_HELP_IMAGES[abilityKey];
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`ability-help-${abilityKey}`}
        className="w-full max-w-md overflow-hidden rounded-xl border border-hero-border bg-background-card shadow-2xl"
      >
        {imageSrc && !imageFailed ? (
          <div className="relative aspect-[16/10] w-full bg-background-dark">
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover object-center"
              onError={() => setImageFailed(true)}
              priority
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background-card to-transparent"
              aria-hidden
            />
          </div>
        ) : null}
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hero-border/60 bg-hero-dark/50 text-accent-gold">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3
                id={`ability-help-${abilityKey}`}
                className="font-cinzel text-lg font-bold text-accent-gold truncate"
              >
                {name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:text-white"
              aria-label={t("sheet.closeAria")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t("ability.help.whatLabel")}
              </p>
              <p className="font-libre text-sm text-gray-200 leading-relaxed">
                {t(ABILITY_HELP_WHAT[abilityKey])}
              </p>
            </div>
            <div>
              <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {t("ability.help.usedForLabel")}
              </p>
              <p className="font-libre text-sm text-gray-200 leading-relaxed">
                {t(ABILITY_HELP_USED_FOR[abilityKey])}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillHelpModal({
  skillKey,
  onClose,
}: {
  skillKey: Dnd5eSkillKey;
  onClose: () => void;
}) {
  const { t, skillLabel } = useCharacterSheetLocale();
  const name = skillLabel(skillKey);
  const examples = t(SKILL_HELP_EXAMPLES[skillKey])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`skill-help-${skillKey}`}
        className="w-full max-w-md rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            id={`skill-help-${skillKey}`}
            className="font-cinzel text-lg font-bold text-accent-gold truncate"
          >
            {name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-white"
            aria-label={t("sheet.closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {t("skill.help.whatLabel")}
            </p>
            <p className="font-libre text-sm text-gray-200 leading-relaxed">
              {t(SKILL_HELP_WHAT[skillKey])}
            </p>
          </div>
          <div>
            <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {t("skill.help.examplesLabel")}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 font-libre text-sm text-gray-200 leading-relaxed">
              {examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureHelpModal({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string | null;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-help-title"
        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            id="feature-help-title"
            className="font-cinzel text-lg font-bold text-accent-gold"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
            aria-label={t("sheet.closeAria")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {description?.trim() ? description : t("features.help.empty")}
        </p>
      </div>
    </div>
  );
}

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

function CharacterSheetModeBar({
  editMode,
  canEdit,
  isPending,
  onToggle,
  onSave,
  t,
}: {
  editMode: boolean;
  canEdit: boolean;
  isPending: boolean;
  onToggle: () => void;
  onSave: () => void;
  t: (key: CharacterSheetMessageKey, vars?: Record<string, string | number>) => string;
}) {
  const modeLabel = editMode ? t("sheet.editModeBadge") : t("sheet.viewModeBadge");
  const toggleLabel = editMode ? t("sheet.viewModeAria") : t("sheet.editModeAria");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-t px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md ${
        editMode
          ? "border-hero-vibrant/70 bg-hero-vibrant/15"
          : "border-hero-dark/80 bg-background-card/95"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`inline-flex shrink-0 items-center rounded border px-3 py-1 font-barlow text-[11px] font-bold uppercase tracking-wide ${
            editMode
              ? "border-hero-vibrant bg-hero-vibrant/25 text-hero-vibrant"
              : "border-hero-dark/70 bg-hero-dark/50 text-gray-400"
          }`}
        >
          {modeLabel}
        </span>
        <p className="hidden font-libre text-xs text-gray-400 sm:block">
          {editMode ? t("sheet.editModeActiveHint") : t("sheet.viewModeActiveHint")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {editMode ? t("sheet.switchToView") : t("sheet.switchToEdit")}
          </span>
          <ToggleSwitch
            checked={editMode}
            disabled={!canEdit}
            onToggle={onToggle}
            label={toggleLabel}
          />
        </div>

        {editMode && canEdit ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-[11px] font-bold uppercase text-black hover:bg-yellow-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("sheet.save")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  className = "",
  min,
  max,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  "aria-label"?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      disabled={disabled}
      aria-label={ariaLabel}
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
  /** Live-Session: schlankes Blatt ohne Dashboard-Chrome */
  liveSessionMode?: boolean;
  onSaved?: () => void;
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
  liveSessionMode = false,
  onSaved,
}: Props) {
  const {
    t,
    abilityLabel,
    skillLabel,
    formatDateTime,
    hydrateLocale,
    locale,
    alignmentLabel,
  } = useCharacterSheetLocale();
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
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [abilityHelpKey, setAbilityHelpKey] = useState<AbilityKey | null>(null);
  const [skillHelpKey, setSkillHelpKey] = useState<Dnd5eSkillKey | null>(null);
  const [featureHelp, setFeatureHelp] = useState<{
    title: string;
    description: string | null;
  } | null>(null);
  const [featPicker, setFeatPicker] = useState<null | "add" | number>(null);
  const [activeTab, setActiveTab] = useState<SheetTab>("attributes");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [customProfDraft, setCustomProfDraft] = useState<{
    armor: string;
    weapons: string;
    tools: string;
  }>({ armor: "", weapons: "", tools: "" });
  /** Freitext-Hintergrund (nicht aus Katalog) */
  const [backgroundCustomMode, setBackgroundCustomMode] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<CharacterItem[]>([]);
  const equipmentPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reloadInventoryItems = useCallback(async () => {
    try {
      // Lazy-Ensure: legt fehlenden Start-Rucksack an und liefert aktuelle Items/Equipment
      const data = await getCharacterEquipmentPayload(characterId);
      setInventoryItems((data.items ?? []).filter((item) => !item.is_deleted));
      setSheet((prev) => {
        if (!prev) return prev;
        const current = normalizeEquipmentState(prev.equipment);
        const nextEq = normalizeEquipmentState(data.equipment);
        if (hasBackpackContainer(current) || nextEq.containers.length === 0) {
          return prev;
        }
        if (current.containers.length > 0) return prev;
        return { ...prev, equipment: nextEq };
      });
    } catch {
      setInventoryItems([]);
    }
  }, [characterId]);

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
        alignment: normalizeAlignmentValue(data.alignment ?? ""),
        name: data.name,
        race: data.race ?? "",
        className: data.class ?? "",
        level: data.level,
        experiencePoints: data.experiencePoints,
      });
      const bgName = data.background ?? "";
      setBackgroundCustomMode(
        Boolean(bgName.trim()) && !findBackgroundByName(bgName),
      );
      hydrateLocale(data.sheetLocale);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("sheet.loadError"));
    } finally {
      setLoading(false);
    }
  }, [campaignId, characterId, hydrateLocale, t]);

  useEffect(() => {
    void reload();
    void reloadInventoryItems();
  }, [reload, reloadInventoryItems]);

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

  /** RK aus Ausrüstung — eine Quelle für Attribute- und Ausrüstungs-Tab */
  const equipmentAcPreview = useMemo(() => {
    if (!sheet || !displayDerived || inventoryItems.length === 0) return null;
    return computeArmorClassPreview(
      sheet,
      displayDerived,
      inventoryItems,
      normalizeEquipmentState(sheet.equipment),
    );
  }, [sheet, displayDerived, inventoryItems]);

  const displayAc =
    sheet?.combat.acOverride != null
      ? displayDerived?.ac ?? 10
      : (equipmentAcPreview?.ac ?? displayDerived?.ac ?? 10);

  const displayInitiative =
    sheet?.combat.initiativeOverride != null
      ? derived?.initiative ?? 0
      : displayDerived?.initiative ?? 0;

  const displaySpeed =
    sheet?.combat.speedOverride != null
      ? derived?.speed ?? sheet?.combat.speed ?? 0
      : flawAdjusted?.displaySpeed ?? derived?.speed ?? sheet?.combat.speed ?? 0;

  const canEdit = payload?.canEdit ?? false;
  const readOnly = !editMode || !canEdit;
  const passivePerception = flawAdjusted?.passivePerception ?? (derived ? 10 + derived.skills.prc.total : 10);
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
      savingThrows: {
        ...sheet.savingThrows,
        [key]: { ...sheet.savingThrows[key], proficient },
      },
    });
  }

  function updateSaveManualBonus(key: AbilityKey, manualBonus: number) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      savingThrows: {
        ...sheet.savingThrows,
        [key]: { ...sheet.savingThrows[key], manualBonus },
      },
    });
  }

  function updateSkill(key: Dnd5eSkillKey, proficient: SkillProficiency) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      skills: { ...sheet.skills, [key]: { ...sheet.skills[key], proficient } },
    });
  }

  function updateSkillManualBonus(key: Dnd5eSkillKey, manualBonus: number) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      skills: { ...sheet.skills, [key]: { ...sheet.skills[key], manualBonus } },
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
    setFeatPicker("add");
  }

  function addCustomFeature() {
    if (!sheet) return;
    setSheet({
      ...sheet,
      features: [
        ...sheet.features,
        { id: crypto.randomUUID(), name: t("field.newFeat"), description: null, source: "manual" },
      ],
    });
  }

  function replaceFeatureFromCatalog(index: number) {
    setFeatPicker(index);
  }

  function applyFeatPick(entry: Dnd5eFeatureEntry) {
    if (!sheet) return;
    if (featPicker === "add") {
      setSheet({ ...sheet, features: [...sheet.features, entry] });
    } else if (typeof featPicker === "number") {
      const features = [...sheet.features];
      features[featPicker] = entry;
      setSheet({ ...sheet, features });
    }
    setFeatPicker(null);
  }

  function matchFeatureToCatalog(index: number) {
    if (!sheet) return;
    const matched = matchSheetFeatureToFeat(sheet.features[index]);
    if (!matched) {
      toast.error(t("featCatalog.noMatch"));
      return;
    }
    const features = [...sheet.features];
    features[index] = featDefinitionToFeatureEntry(matched);
    setSheet({ ...sheet, features });
    toast.success(
      t("featCatalog.matched", {
        name:
          locale === "de"
            ? matched.nameDe || matched.nameEn
            : matched.nameEn || matched.nameDe,
      }),
    );
  }

  function setClassFromCatalog(classId: string) {
    if (!sheet) return;
    const prog = getClassProgression(resolveClassId(classId));
    const className =
      locale === "de" && prog
        ? prog.nameDe
        : prog?.nameEn ?? classId;
    const applied = applyClassChange(sheet, {
      previousClassName: meta.className || null,
      nextClassName: className,
      level: meta.level,
      previousSubclass: meta.subclass || null,
      locale,
    });
    setMeta({
      ...meta,
      className: applied.classLabel,
      subclass: applied.subclassLabel ?? "",
    });
    setSheet(applied.sheet);
  }

  function clearClassFromCatalog() {
    if (!sheet) return;
    const applied = applyClassChange(sheet, {
      previousClassName: meta.className || null,
      nextClassName: null,
      level: meta.level,
      previousSubclass: meta.subclass || null,
      locale,
    });
    setMeta({
      ...meta,
      className: "",
      subclass: "",
    });
    setSheet(applied.sheet);
  }

  function setLevelWithCatalogSync(level: number) {
    if (!sheet) return;
    const nextLevel = Math.max(1, level);
    setMeta({ ...meta, level: nextLevel });
    setSheet(
      applyClassBasicsFromCatalog(
        sheet,
        meta.className,
        nextLevel,
        meta.subclass || null,
        locale,
      ),
    );
  }

  function setSubclassFromCatalog(subclassId: string) {
    if (!sheet) return;
    const applied = applySubclassChange(sheet, {
      className: meta.className,
      level: meta.level,
      previousSubclass: meta.subclass || null,
      nextSubclassId: subclassId || null,
      locale,
    });
    setMeta({ ...meta, subclass: applied.subclassLabel ?? "" });
    setSheet(applied.sheet);
    if (applied.subclassLabel) {
      toast.success(t("subclassCatalog.applied", { name: applied.subclassLabel }));
    } else {
      toast.success(t("subclassCatalog.cleared"));
    }
  }

  function setBackgroundFromCatalog(backgroundId: string) {
    if (!sheet) return;
    if (backgroundId === "__custom__") {
      const cleared = setCharacterBackground(sheet, null, {
        previousBackgroundMeta: meta.background || null,
        locale,
      });
      setSheet(cleared.sheet);
      setBackgroundCustomMode(true);
      return;
    }
    if (!backgroundId) {
      const cleared = setCharacterBackground(sheet, null, {
        previousBackgroundMeta: meta.background || null,
        locale,
      });
      setMeta({ ...meta, background: "" });
      setSheet(cleared.sheet);
      setBackgroundCustomMode(false);
      toast.success(t("backgroundCatalog.cleared"));
      return;
    }
    const applied = setCharacterBackground(sheet, backgroundId, {
      previousBackgroundMeta: meta.background || null,
      locale,
    });
    setMeta({ ...meta, background: applied.backgroundLabel ?? "" });
    setSheet(applied.sheet);
    setBackgroundCustomMode(false);
    if (applied.backgroundLabel) {
      toast.success(t("backgroundCatalog.applied", { name: applied.backgroundLabel }));
    }
  }

  function removeFeature(index: number) {
    if (!sheet) return;
    setSheet({ ...sheet, features: sheet.features.filter((_, i) => i !== index) });
  }

  function updateProficiencyList(category: ProficiencyCategory, next: string[]) {
    if (!sheet) return;
    setSheet({
      ...sheet,
      proficiencies: { ...sheet.proficiencies, [category]: next },
    });
  }

  function toggleCatalogProficiency(def: ProficiencyDefinition) {
    if (!sheet || readOnly) return;
    const list = sheet.proficiencies[def.category];
    updateProficiencyList(
      def.category,
      toggleProficiencyInList(list, def, locale),
    );
  }

  function syncClassProficiencies() {
    if (!sheet) return;
    if (!resolveClassId(meta.className)) {
      toast.error(t("proficiencies.noClass"));
      return;
    }
    setSheet(
      applyClassProficienciesFromCatalog(sheet, meta.className, locale, {
        replaceClassGrants: true,
      }),
    );
    toast.success(t("proficiencies.syncClassDone"));
  }

  function reconcileProficiencies() {
    if (!sheet) return;
    const { sheet: next, changed } = reconcileProficienciesWithCatalog(sheet, locale);
    setSheet(next);
    toast.success(
      changed > 0 ? t("proficiencies.reconcileDone") : t("proficiencies.reconcileNone"),
    );
  }

  function addCustomProficiency(category: ProficiencyCategory) {
    if (!sheet || readOnly) return;
    const raw = customProfDraft[category].trim();
    if (!raw) return;
    const label = resolveProficiencyLabel(raw, locale, category);
    const list = sheet.proficiencies[category];
    if (list.some((x) => x.toLowerCase() === label.toLowerCase())) {
      setCustomProfDraft((p) => ({ ...p, [category]: "" }));
      return;
    }
    updateProficiencyList(category, [...list, label]);
    setCustomProfDraft((p) => ({ ...p, [category]: "" }));
  }

  function removeCustomProficiency(category: ProficiencyCategory, value: string) {
    if (!sheet || readOnly) return;
    updateProficiencyList(
      category,
      sheet.proficiencies[category].filter((x) => x !== value),
    );
  }

  /** Lore-Sprachen (characters.languages) + Spiegel in sheet.proficiencies.languages */
  function toggleCampaignLanguage(langId: string) {
    if (!biographyCulture || readOnly) return;
    biographyCulture.onToggleLanguage(langId);
    if (!sheet) return;
    const opts = biographyCulture.languageOptions;
    const nextIds = biographyCulture.languages.includes(langId)
      ? biographyCulture.languages.filter((id) => id !== langId)
      : [...biographyCulture.languages, langId];
    const names = nextIds
      .map((id) => opts.find((l) => l.id === id)?.name)
      .filter((n): n is string => Boolean(n?.trim()));
    setSheet({
      ...sheet,
      proficiencies: { ...sheet.proficiencies, languages: names },
    });
  }

  function handleEquipmentChange(
    equipment: Dnd5eEquipmentState,
    extras?: { combatAc?: number },
  ) {
    setSheet((prev) => {
      if (!prev) return prev;
      const normalized = normalizeEquipmentState(equipment);
      let next: Dnd5eSheetData = {
        ...prev,
        equipment: normalized,
        combat:
          extras?.combatAc != null
            ? { ...prev.combat, ac: extras.combatAc }
            : prev.combat,
      };
      if (inventoryItems.length > 0 && next.combat.acOverride == null) {
        next = withSyncedArmorClass(next, inventoryItems, normalized, meta.level);
      }
      return next;
    });

    if (readOnly) return;

    const normalized = normalizeEquipmentState(equipment);
    if (equipmentPersistTimerRef.current) {
      clearTimeout(equipmentPersistTimerRef.current);
    }
    equipmentPersistTimerRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveCharacterEquipment(characterId, normalized);
          onSaved?.();
        } catch (e: unknown) {
          toast.error(
            e instanceof Error ? e.message : t("sheet.saveError"),
          );
        }
      });
    }, 350);
  }

  useEffect(() => {
    return () => {
      if (equipmentPersistTimerRef.current) {
        clearTimeout(equipmentPersistTimerRef.current);
      }
    };
  }, []);

  function handleSave(silent = false, sheetOverride?: Dnd5eSheetData) {
    const activeSheet = sheetOverride ?? sheet;
    if (!activeSheet || !payload) return;
    startTransition(async () => {
      let sheetToSave = activeSheet;
      if (inventoryItems.length > 0) {
        sheetToSave = withSyncedArmorClass(
          sheetToSave,
          inventoryItems,
          sheetToSave.equipment,
          meta.level,
        );
      }
      if (biographyCulture?.languageOptions?.length) {
        const names = biographyCulture.languages
          .map((id) => biographyCulture.languageOptions.find((l) => l.id === id)?.name)
          .filter((n): n is string => Boolean(n?.trim()));
        sheetToSave = {
          ...sheetToSave,
          proficiencies: { ...sheetToSave.proficiencies, languages: names },
        };
      }
      if (biographyCulture) {
        const relNames = biographyCulture.religionIds
          .map((id) => biographyCulture.religionOptions.find((r) => r.id === id)?.name)
          .filter((n): n is string => Boolean(n?.trim()));
        sheetToSave = setSheetCampaignLore(sheetToSave, {
          ...getSheetCampaignLore(sheetToSave),
          religionIds: biographyCulture.religionIds,
          religionNames: relNames,
        });
      }
      setSheet(sheetToSave);
      const result = await saveDnd5eCharacterSheet({
        campaignId,
        characterId,
        sheet: sheetToSave,
        overrides: payload.overrides,
        meta: {
          subclass: meta.subclass,
          background: meta.background,
          alignment: normalizeAlignmentValue(meta.alignment) || null,
          name: meta.name,
          race: meta.race,
          class: meta.className,
          level: meta.level,
          experiencePoints: meta.experiencePoints,
        },
        lore: biographyCulture
          ? {
              cultureLoreId: biographyCulture.cultureLoreId || null,
              languages: biographyCulture.languages,
            }
          : undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? t("sheet.saveError"));
        return;
      }
      if (!silent) {
        toast.success(t("sheet.saved"));
        if (!liveSessionMode) setEditMode(false);
      }
      onSaved?.();
      await reload();
      await reloadInventoryItems();
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

  const resolvedClassId = resolveClassId(meta.className);
  const subclassOptions = listCatalogSubclassOptions(meta.className, locale);
  const subclassUnlockLevel = catalogSubclassLevel(meta.className);
  // progressionLocked: nur Foundry-Sync-Hinweis — Stufe/XP/Klasse bleiben spieler-editierbar.
  const subclassSelectDisabled =
    readOnly ||
    subclassOptions.length === 0 ||
    (subclassUnlockLevel != null && meta.level < subclassUnlockLevel);
  const levelEditHints = !readOnly
    ? buildLevelEditHints({
        className: meta.className,
        subclass: meta.subclass,
        level: meta.level,
        savedLevel: payload.level,
      })
    : [];
  const matchedSubclassId =
    resolvedClassId && meta.subclass
      ? matchSubclassOption(
          meta.subclass,
          getClassProgression(resolvedClassId)?.subclasses ?? [],
        )?.id ?? ""
      : "";
  const backgroundOptions = listBackgroundOptions(locale);
  const matchedBackgroundId =
    resolveAppliedBackgroundId(sheet, meta.background) ??
    findBackgroundByName(meta.background)?.id ??
    "";
  const backgroundSelectValue = backgroundCustomMode
    ? "__custom__"
    : matchedBackgroundId;

  const sheetCulture = biographyCulture
    ? biographyCulture.cultureOptions.find((c) => c.id === biographyCulture.cultureLoreId)
    : null;
  const sheetRacesForCulture = biographyCulture
    ? filterRacesForCulture(biographyCulture.raceOptions, sheetCulture
        ? {
            id: sheetCulture.id,
            name: sheetCulture.name,
            race_ids: sheetCulture.race_ids ?? [],
          }
        : null)
    : [];
  const headerRaceOptions =
    biographyCulture && sheetCulture && sheetRacesForCulture.length > 0
      ? sheetRacesForCulture
      : biographyCulture?.raceOptions ?? [];
  const headerSelectedRace =
    biographyCulture?.raceOptions.find((r) => r.name === meta.race) ?? null;
  const headerRaceBonusLines = formatLoreRaceBonusesForDisplay(
    resolveLoreRaceBonuses({
      raceName: meta.race,
      raceTraitsRaw: headerSelectedRace?.race_traits,
    }),
  );

  function syncLanguageNamesToSheet(
    base: Dnd5eSheetData,
    langIds: string[],
  ): Dnd5eSheetData {
    if (!biographyCulture?.languageOptions?.length) return base;
    const names = langIds
      .map((id) => biographyCulture.languageOptions.find((l) => l.id === id)?.name)
      .filter((n): n is string => Boolean(n?.trim()));
    return {
      ...base,
      proficiencies: { ...base.proficiencies, languages: names },
    };
  }

  function applyRaceBonusesToSheetData(
    base: Dnd5eSheetData,
    raceName: string,
  ): Dnd5eSheetData {
    const raceOpt = biographyCulture?.raceOptions.find((r) => r.name === raceName);
    const next = applyLoreRaceBonusesToSheet(base, {
      raceName,
      raceTraitsRaw: raceOpt?.race_traits,
      raceLoreId: raceOpt?.id ?? null,
      level: meta.level,
      applyAbilityBonuses: true,
    });
    return setSheetCampaignLore(next, {
      ...getSheetCampaignLore(next),
      religionIds: biographyCulture?.religionIds ?? getSheetCampaignLore(next).religionIds,
      religionNames: (biographyCulture?.religionIds ?? [])
        .map((id) => biographyCulture?.religionOptions.find((r) => r.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
    });
  }

  function applyCultureFromHeader(cultureId: string) {
    if (!biographyCulture || readOnly || !sheet) return;
    biographyCulture.onCultureChange(cultureId);
    const cult = biographyCulture.cultureOptions.find((c) => c.id === cultureId);
    let nextSheet = sheet;

    if (!cult) {
      biographyCulture.onLanguagesChange?.([]);
      biographyCulture.onReligionIdsChange([]);
      nextSheet = syncLanguageNamesToSheet(nextSheet, []);
      setSheet(nextSheet);
      return;
    }

    const langIds = (cult.language_ids ?? []).filter((id) =>
      biographyCulture.languageOptions.some((l) => l.id === id),
    );
    biographyCulture.onLanguagesChange?.(langIds);
    const relIds = (cult.religion_ids ?? []).filter((id) =>
      biographyCulture.religionOptions.some((r) => r.id === id),
    );
    biographyCulture.onReligionIdsChange(relIds);
    nextSheet = syncLanguageNamesToSheet(nextSheet, langIds);

    const nextRaces = filterRacesForCulture(biographyCulture.raceOptions, {
      id: cult.id,
      name: cult.name,
      race_ids: cult.race_ids ?? [],
    });
    if (meta.race && !nextRaces.some((r) => r.name === meta.race)) {
      setMeta({ ...meta, race: "" });
      biographyCulture.onRaceNameChange("");
      nextSheet = applyRaceBonusesToSheetData(nextSheet, "");
    }
    setSheet(nextSheet);
  }

  function applyRaceFromHeader(raceName: string) {
    if (!sheet || readOnly) return;
    setMeta({ ...meta, race: raceName });
    biographyCulture?.onRaceNameChange(raceName);
    setSheet(applyRaceBonusesToSheetData(sheet, raceName));
  }

  function setAlignmentSynced(value: string) {
    const normalized = normalizeAlignmentValue(value);
    setMeta({ ...meta, alignment: normalized });
    biographyCulture?.onAlignmentChange(normalized);
  }

  const portraitSrc =
    biographyCulture?.avatarBlobUrl ||
    biographyCulture?.avatarUrl?.trim() ||
    null;

  return (
    <div className={`grid ${compact ? "min-h-0 flex-1" : ""}`}>
      <div className={`col-start-1 row-start-1 space-y-6 ${compact ? "pb-20" : "pb-24"}`}>
      {!liveSessionMode ? (
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
        </div>
      </div>
      ) : null}

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
          onClick={() => setActiveTab("spells")}
          className={`inline-flex items-center gap-2 px-4 py-2 font-barlow text-xs font-bold uppercase border-b-2 transition-colors ${
            activeTab === "spells"
              ? "border-hero-vibrant text-hero-vibrant"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <Wand2 className="h-3.5 w-3.5" />
          {t("tab.spells")}
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
        <button
          type="button"
          onClick={() => setActiveTab("tuv")}
          className={`inline-flex items-center gap-2 px-4 py-2 font-barlow text-xs font-bold uppercase border-b-2 transition-colors ${
            activeTab === "tuv"
              ? "border-hero-vibrant text-hero-vibrant"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          {t("tab.tuv")}
        </button>
      </div>

      {activeTab === "equipment" ? (
        <Dnd5eEquipmentTab
          characterId={characterId}
          sheet={sheet}
          derived={displayDerived}
          level={meta.level}
          readOnly={readOnly}
          inventoryItems={inventoryItems}
          onInventoryReload={reloadInventoryItems}
          acPreview={equipmentAcPreview}
          onEquipmentChange={handleEquipmentChange}
        />
      ) : null}

      {activeTab === "spells" && sheet && derived ? (
        <Dnd5eSpellsFeaturesTab
          sheet={sheet}
          derived={displayDerived}
          characterClass={meta.className}
          characterSubclass={meta.subclass}
          level={meta.level}
          readOnly={readOnly}
          onSheetChange={setSheet}
        />
      ) : null}

      {activeTab === "attributes" ? (
        <>
          {payload.progressionLockMessage ? (
            <FoundryProgressionLockNotice message={payload.progressionLockMessage} />
          ) : null}

          {/* Kopfzeile — klar gruppiert */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4 md:p-5 space-y-5">
            {/* Name + Übungsbonus / Aufstieg */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <label className="min-w-0 flex-1 space-y-1.5">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.characterName")}
                </span>
                <TextInput
                  value={meta.name}
                  disabled={readOnly}
                  onChange={(v) => setMeta({ ...meta, name: v })}
                  className="font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant"
                />
              </label>
              <div className="flex shrink-0 flex-wrap items-end gap-3">
                <div className="min-w-[5.5rem] rounded border border-hero-border/60 bg-hero-dark/40 px-3 py-2 text-center">
                  <p className="font-barlow text-[10px] uppercase text-gray-500">
                    {t("field.proficiencyBonus")}
                  </p>
                  <p className="font-barlow text-2xl font-bold text-accent-gold">
                    {formatSigned(derived.proficiencyBonus)}
                  </p>
                </div>
                {canEdit && meta.level < 20 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editMode) setEditMode(true);
                      setLevelUpOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded border border-accent-gold/60 bg-accent-gold/10 px-3 py-2.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    {t("levelUp.open")}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Klasse, Stufe, Unterklasse — getrennt, ohne Doppelung */}
            <div className="rounded-md border border-hero-border/30 bg-hero-dark/20 p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)]">
                <label className="space-y-1">
                  <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {t("field.class")}
                  </span>
                  {readOnly ? (
                    <TextInput
                      value={
                        resolvedClassId
                          ? classDisplayName(resolvedClassId, locale)
                          : meta.className || "—"
                      }
                      disabled
                      onChange={() => {}}
                    />
                  ) : (
                    <select
                      value={resolvedClassId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) {
                          clearClassFromCatalog();
                          return;
                        }
                        setClassFromCatalog(id);
                      }}
                      className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-barlow text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                    >
                      <option value="">{t("field.classPlaceholder")}</option>
                      {CLASS_IDS.map((id) => (
                        <option key={id} value={id}>
                          {classDisplayName(id, locale)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {t("sheet.level")}
                  </span>
                  <NumberInput
                    value={meta.level}
                    min={1}
                    max={20}
                    disabled={readOnly}
                    onChange={(v) =>
                      setLevelWithCatalogSync(Math.min(20, Math.max(1, v)))
                    }
                    className="!w-full"
                  />
                </label>
                <div className="space-y-1">
                  <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {t("field.subclass")}
                  </span>
                  {!readOnly ? (
                    <select
                      value={matchedSubclassId}
                      disabled={subclassSelectDisabled}
                      onChange={(e) => setSubclassFromCatalog(e.target.value)}
                      className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white outline-none focus:border-hero-vibrant disabled:opacity-60"
                    >
                      <option value="">{t("field.subclassPlaceholder")}</option>
                      {subclassOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : meta.subclass ? (
                    <p className="rounded border border-hero-border/40 bg-hero-dark/40 px-3 py-1.5 font-libre text-sm text-gray-200">
                      {meta.subclass}
                    </p>
                  ) : (
                    <p className="rounded border border-transparent px-3 py-1.5 font-libre text-sm text-gray-500">
                      —
                    </p>
                  )}
                </div>
              </div>
              {!readOnly && levelEditHints.length > 0 ? (
                <ul className="space-y-0.5">
                  {levelEditHints.map((hint) => (
                    <li
                      key={hint.id}
                      className={`font-libre text-[10px] leading-snug ${
                        hint.id === "wizardRecommend"
                          ? "text-accent-gold"
                          : "text-gray-400"
                      }`}
                    >
                      {t(LEVEL_EDIT_HINT_KEYS[hint.id], hint.params)}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!readOnly && subclassOptions.length === 0 ? (
                <p className="font-libre text-[10px] text-gray-500">
                  {t("subclassCatalog.none")}
                </p>
              ) : !readOnly &&
                subclassUnlockLevel != null &&
                meta.level < subclassUnlockLevel ? (
                <p className="font-libre text-[10px] text-gray-500">
                  {t("subclassCatalog.lockedUntil", { level: subclassUnlockLevel })}
                </p>
              ) : null}
              {!readOnly && resolvedClassId ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!sheet) return;
                    setSheet(
                      applyClassBasicsFromCatalog(
                        sheet,
                        meta.className,
                        meta.level,
                        meta.subclass || null,
                        locale,
                      ),
                    );
                    toast.success(t("classCatalog.synced"));
                  }}
                  className="font-barlow text-[9px] font-bold uppercase text-accent-gold hover:text-white"
                >
                  {t("classCatalog.sync")}
                </button>
              ) : null}
            </div>

            {/* Herkunft: Hintergrund, Kultur, Volk, Gesinnung */}
            <div
              className={`grid gap-3 sm:grid-cols-2 ${
                biographyCulture && biographyCulture.cultureOptions.length > 0
                  ? "lg:grid-cols-4"
                  : "lg:grid-cols-3"
              }`}
            >
              <label className="space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.background")}
                </span>
                {readOnly ? (
                  <TextInput value={meta.background} disabled onChange={() => {}} />
                ) : (
                  <div className="space-y-1">
                    <select
                      value={backgroundSelectValue}
                      disabled={payload.progressionLocked}
                      onChange={(e) => setBackgroundFromCatalog(e.target.value)}
                      className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-sm text-white outline-none focus:border-hero-vibrant disabled:opacity-60"
                    >
                      <option value="">{t("backgroundCatalog.none")}</option>
                      {backgroundOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                      <option value="__custom__">{t("backgroundCatalog.custom")}</option>
                    </select>
                    {backgroundCustomMode || !matchedBackgroundId ? (
                      <TextInput
                        value={meta.background}
                        disabled={payload.progressionLocked}
                        placeholder={t("backgroundCatalog.customPlaceholder")}
                        onChange={(v) => {
                          setBackgroundCustomMode(true);
                          setMeta({ ...meta, background: v });
                        }}
                      />
                    ) : null}
                  </div>
                )}
              </label>
              {biographyCulture && biographyCulture.cultureOptions.length > 0 ? (
                <label className="space-y-1">
                  <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {t("biography.culture")}
                  </span>
                  <select
                    value={biographyCulture.cultureLoreId}
                    disabled={readOnly}
                    onChange={(e) => applyCultureFromHeader(e.target.value)}
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
                  >
                    <option value="">{t("biography.cultureNone")}</option>
                    {biographyCulture.cultureOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.race")}
                </span>
                {biographyCulture && headerRaceOptions.length > 0 ? (
                  <select
                    value={
                      headerRaceOptions.some((r) => r.name === meta.race)
                        ? meta.race
                        : meta.race
                          ? meta.race
                          : ""
                    }
                    disabled={readOnly}
                    onChange={(e) => applyRaceFromHeader(e.target.value)}
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-70"
                  >
                    <option value="">{t("biography.raceNone")}</option>
                    {headerRaceOptions
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    {meta.race && !headerRaceOptions.some((r) => r.name === meta.race) ? (
                      <option value={meta.race}>{meta.race}</option>
                    ) : null}
                  </select>
                ) : (
                  <TextInput
                    value={meta.race}
                    disabled={readOnly}
                    onChange={(v) => applyRaceFromHeader(v)}
                  />
                )}
                {headerRaceBonusLines.length > 0 ? (
                  <p className="font-libre text-[10px] text-accent-gold/90 leading-snug line-clamp-3">
                    {headerRaceBonusLines[0]}
                    {headerRaceBonusLines.length > 1
                      ? ` · +${headerRaceBonusLines.length - 1} weitere`
                      : ""}
                  </p>
                ) : null}
              </label>
              <label className="space-y-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {t("field.alignment")}
                </span>
                {readOnly ? (
                  <TextInput
                    value={alignmentLabel(meta.alignment)}
                    disabled
                    onChange={() => {}}
                  />
                ) : (
                  <select
                    value={findAlignmentOption(meta.alignment)?.value ?? ""}
                    onChange={(e) => setAlignmentSynced(e.target.value)}
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-1.5 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
                  >
                    <option value="">{t("biography.alignmentSelect")}</option>
                    {DND5E_ALIGNMENTS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {alignmentLabel(a.value)}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {/* XP */}
            <XpProgressBar
              currentXp={meta.experiencePoints}
              level={meta.level}
              editMode={editMode}
              readOnly={readOnly}
              onChange={(v) => setMeta({ ...meta, experiencePoints: v })}
            />
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
                  {ABILITY_KEYS.map((key) => {
                    const AbilityIcon = ABILITY_ICONS[key];
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 rounded border border-hero-border/40 bg-hero-dark/30 px-2 py-1.5"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-hero-border/50 bg-hero-dark/60 text-accent-gold"
                          aria-hidden
                        >
                          <AbilityIcon className="h-4 w-4" />
                        </span>
                        <div className="w-10 text-center shrink-0">
                          <p className="font-barlow text-xl font-bold text-accent-gold leading-none">
                            {formatSigned(displayDerived.abilities[key].modifier)}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-barlow text-[10px] font-bold uppercase text-gray-400 truncate">
                            {abilityLabel(key)}
                          </p>
                          {readOnly ? (
                            <p className="font-barlow text-xs text-gray-500">
                              {sheet.abilities[key].score}
                            </p>
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
                        <button
                          type="button"
                          onClick={() => setAbilityHelpKey(key)}
                          className="shrink-0 rounded p-1 text-gray-500 hover:bg-hero-dark/50 hover:text-accent-gold focus:outline-none focus:ring-2 focus:ring-hero-vibrant"
                          aria-label={t("ability.help.aria", { name: abilityLabel(key) })}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-3">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-1.5 mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> {t("combat.savingThrows")}
                </h3>
                {!readOnly ? (
                  <div className="mb-1 flex items-center justify-end gap-2 px-1">
                    <span className="w-12 text-center font-barlow text-[9px] uppercase text-gray-600">
                      {t("combat.manualBonus")}
                    </span>
                    <span className="w-8" />
                  </div>
                ) : null}
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
                      <div className="flex items-center gap-2 shrink-0">
                        {!readOnly ? (
                          <NumberInput
                            value={sheet.savingThrows[key].manualBonus ?? 0}
                            className="!w-12 !py-0.5 !text-xs"
                            aria-label={t("combat.manualBonusAria", { name: abilityLabel(key) })}
                            onChange={(v) => updateSaveManualBonus(key, v)}
                          />
                        ) : null}
                        <span className="font-barlow text-sm text-accent-gold w-8 text-right">
                          {formatSigned(displayDerived.savingThrows[key].total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-3">
                <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-1.5 mb-2">
                  {t("combat.skills")}
                </h3>
                {!readOnly ? (
                  <div className="mb-1 flex items-center justify-end gap-2 px-1">
                    <span className="w-12 text-center font-barlow text-[9px] uppercase text-gray-600">
                      {t("combat.manualBonus")}
                    </span>
                    <span className="w-8" />
                  </div>
                ) : null}
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!readOnly ? (
                            <NumberInput
                              value={entry.manualBonus ?? 0}
                              className="!w-12 !py-0.5 !text-xs"
                              aria-label={t("combat.manualBonusAria", { name: skillLabel(def.key) })}
                              onChange={(v) => updateSkillManualBonus(def.key, v)}
                            />
                          ) : null}
                          <span className="font-barlow text-sm text-accent-gold w-8 text-right">
                            {formatSigned(skillDerived.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSkillHelpKey(def.key)}
                            className="rounded p-0.5 text-gray-500 hover:bg-hero-dark/50 hover:text-accent-gold focus:outline-none focus:ring-2 focus:ring-hero-vibrant"
                            aria-label={t("skill.help.aria", { name: skillLabel(def.key) })}
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                      <p className="font-barlow text-4xl font-bold text-white mt-1">{displayAc}</p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.acOverride ?? displayAc}
                        min={0}
                        className="mt-1 !text-2xl !font-bold"
                        aria-label={t("combat.ac")}
                        onChange={(v) => updateCombat("acOverride", v)}
                      />
                    )}
                    <p className="mt-1 font-libre text-[9px] text-gray-500 leading-tight">
                      {sheet.combat.acOverride != null
                        ? t("combat.acOverrideHint")
                        : t("combat.acFromEquipment")}
                    </p>
                  </div>
                  <div className="rounded-lg border-2 border-hero-border/70 bg-hero-dark/40 p-3">
                    <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">{t("combat.initiative")}</p>
                    {readOnly ? (
                      <p className="font-barlow text-4xl font-bold text-white mt-1">
                        {formatSigned(displayInitiative)}
                      </p>
                    ) : (
                      <NumberInput
                        value={
                          sheet.combat.initiativeOverride != null
                            ? sheet.combat.initiativeOverride
                            : sheet.combat.initiativeBonus
                        }
                        className="mt-1 !text-2xl !font-bold"
                        aria-label={t("combat.initiative")}
                        onChange={(v) =>
                          updateCombat(
                            sheet.combat.initiativeOverride != null
                              ? "initiativeOverride"
                              : "initiativeBonus",
                            v,
                          )
                        }
                      />
                    )}
                    {!readOnly ? (
                      <label className="mt-1 flex items-center justify-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="shrink-0"
                          checked={sheet.combat.initiativeOverride != null}
                          onChange={(e) =>
                            updateCombat(
                              "initiativeOverride",
                              e.target.checked ? displayInitiative : null,
                            )
                          }
                        />
                        <span className="font-libre text-[9px] text-gray-500 leading-tight">
                          {t("combat.useManualOverride")}
                        </span>
                      </label>
                    ) : null}
                    <p className="mt-0.5 font-libre text-[9px] text-gray-500 leading-tight">
                      {sheet.combat.initiativeOverride != null
                        ? t("combat.initiativeOverrideHint")
                        : t("combat.initiativeFromDex")}
                    </p>
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
                        value={
                          sheet.combat.speedOverride != null
                            ? sheet.combat.speedOverride
                            : sheet.combat.speed
                        }
                        min={0}
                        className="mt-1 !text-2xl !font-bold"
                        aria-label={t("combat.speed")}
                        onChange={(v) =>
                          updateCombat(
                            sheet.combat.speedOverride != null ? "speedOverride" : "speed",
                            v,
                          )
                        }
                      />
                    )}
                    {!readOnly ? (
                      <label className="mt-0.5 flex items-center justify-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="shrink-0"
                          checked={sheet.combat.speedOverride != null}
                          onChange={(e) =>
                            updateCombat(
                              "speedOverride",
                              e.target.checked ? displaySpeed : null,
                            )
                          }
                        />
                        <span className="font-libre text-[9px] text-gray-500 leading-tight">
                          {t("combat.useManualOverride")}
                        </span>
                      </label>
                    ) : null}
                    <p className="font-barlow text-[9px] text-gray-500 mt-0.5">
                      {sheet.combat.speedOverride != null
                        ? t("combat.speedOverrideHint")
                        : t("combat.speedFromBase")}
                      {" · "}
                      {t("combat.speedUnit")}
                    </p>
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
                  <label className="mt-3 block space-y-1">
                    <span className="font-barlow text-[10px] uppercase text-gray-500">
                      {t("combat.exhaustion")}
                    </span>
                    {readOnly ? (
                      <p className="font-barlow text-xl font-bold text-white">
                        {sheet.combat.exhaustionLevel ?? 0}
                      </p>
                    ) : (
                      <NumberInput
                        value={sheet.combat.exhaustionLevel ?? 0}
                        min={0}
                        max={10}
                        onChange={(v) => updateCombat("exhaustionLevel", v)}
                      />
                    )}
                    <p className="font-libre text-[9px] text-gray-500 leading-snug">
                      {t("combat.exhaustionHint")}
                    </p>
                  </label>
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addFeature}
                        className="font-barlow text-[10px] font-bold uppercase text-accent-gold hover:text-white"
                      >
                        {t("featCatalog.open")}
                      </button>
                      <button
                        type="button"
                        onClick={addCustomFeature}
                        className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-white"
                      >
                        {t("features.addCustom")}
                      </button>
                    </div>
                  ) : null}
                </div>
                {sheet.features.length === 0 ? (
                  <p className="font-libre text-sm text-gray-500 flex-1">{t("features.empty")}</p>
                ) : (
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[24rem] pr-1">
                    {sheet.features.map((feat, index) => {
                      const catalogMatch = matchSheetFeatureToFeat(feat);
                      const isCatalog =
                        feat.source === "srd-feat" || Boolean(catalogMatch);
                      const featName = localizedFeatureName(feat, locale);
                      const featDescription = localizedFeatureDescription(feat, locale);
                      return (
                      <div
                        key={feat.id}
                        className="rounded border border-hero-border/40 bg-hero-dark/20 p-2.5"
                      >
                        {readOnly ? (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-barlow text-sm font-bold text-white">
                                {featName}
                              </p>
                              {isCatalog ? (
                                <p className="font-barlow text-[9px] font-bold uppercase text-accent-gold">
                                  {t("featCatalog.matchedBadge")}
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFeatureHelp({
                                  title: featName,
                                  description: featDescription,
                                })
                              }
                              className="shrink-0 rounded p-1 text-gray-500 hover:bg-hero-dark/50 hover:text-accent-gold focus:outline-none focus:ring-2 focus:ring-hero-vibrant"
                              aria-label={t("features.help.aria", { name: featName })}
                            >
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <TextInput
                                value={feat.name}
                                onChange={(v) => updateFeature(index, { name: v })}
                                className="flex-1 !text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFeatureHelp({
                                    title: featName || feat.name,
                                    description: featDescription,
                                  })
                                }
                                className="rounded p-1 text-gray-500 hover:bg-hero-dark/50 hover:text-accent-gold focus:outline-none focus:ring-2 focus:ring-hero-vibrant"
                                aria-label={t("features.help.aria", {
                                  name: featName || feat.name,
                                })}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFeature(index)}
                                className="text-[10px] text-red-400 hover:text-red-300 px-1"
                              >
                                ×
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {catalogMatch && feat.source !== "srd-feat" ? (
                                <button
                                  type="button"
                                  onClick={() => matchFeatureToCatalog(index)}
                                  className="font-barlow text-[9px] font-bold uppercase text-accent-gold hover:text-white"
                                >
                                  {t("featCatalog.match")}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => replaceFeatureFromCatalog(index)}
                                className="font-barlow text-[9px] font-bold uppercase text-hero-vibrant hover:text-white"
                              >
                                {t("featCatalog.replace")}
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
                    );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hero-dark pb-2">
                  <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                    {t("proficiencies.title")}
                  </h3>
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={syncClassProficiencies}
                        className="font-barlow text-[9px] font-bold uppercase text-accent-gold hover:text-white"
                      >
                        {t("proficiencies.syncClass")}
                      </button>
                      <button
                        type="button"
                        onClick={reconcileProficiencies}
                        className="font-barlow text-[9px] font-bold uppercase text-hero-vibrant hover:text-white"
                      >
                        {t("proficiencies.reconcile")}
                      </button>
                    </div>
                  ) : null}
                </div>

                {(
                  [
                    ["armor", "proficiencies.armor"] as const,
                    ["weapons", "proficiencies.weapons"] as const,
                    ["tools", "proficiencies.tools"] as const,
                  ]
                ).map(([category, labelKey]) => {
                  const allCatalog = getProficienciesByCategory(category);
                  const list = sheet.proficiencies[category];
                  const customs = customProficiencyEntries(list, category);
                  const classLabels =
                    getClassProficiencyLabels(meta.className, locale)?.[category] ?? [];
                  const classIds = new Set(
                    classLabels
                      .map((label) => matchProficiencyEntry(label, category)?.id)
                      .filter(Boolean),
                  );
                  // Armor/tools: full catalog. Weapons: groups always; specifics if selected or class-granted.
                  const catalogItems =
                    category === "weapons"
                      ? allCatalog.filter((def) => {
                          if (
                            def.id === "weapon-simple" ||
                            def.id === "weapon-martial"
                          ) {
                            return true;
                          }
                          return (
                            listHasProficiency(list, def) || classIds.has(def.id)
                          );
                        })
                      : allCatalog;
                  const selectedCatalog = allCatalog.filter((def) =>
                    listHasProficiency(list, def),
                  );

                  if (readOnly) {
                    const labels = [
                      ...selectedCatalog.map((d) => proficiencyLabel(d, locale)),
                      ...customs,
                    ];
                    if (labels.length === 0) return null;
                    return (
                      <div key={category}>
                        <p className="font-barlow text-[10px] uppercase text-gray-500 mb-1">
                          {t(labelKey)}
                        </p>
                        <p className="font-libre text-xs text-gray-300">
                          {labels.join(", ")}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div key={category} className="space-y-2">
                      <p className="font-barlow text-[10px] uppercase text-gray-500">
                        {t(labelKey)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {catalogItems.map((def) => {
                          const checked = listHasProficiency(list, def);
                          return (
                            <label
                              key={def.id}
                              className={`flex items-center gap-1.5 rounded border px-2 py-1 font-libre text-[11px] text-gray-200 cursor-pointer ${
                                checked
                                  ? "border-hero-vibrant/60 bg-hero-vibrant/10"
                                  : "border-hero-border/50 bg-hero-dark/30 hover:border-hero-vibrant/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCatalogProficiency(def)}
                                className="rounded border-hero-dark"
                              />
                              {proficiencyLabel(def, locale)}
                            </label>
                          );
                        })}
                      </div>
                      {customs.length > 0 ? (
                        <div className="space-y-1">
                          <p className="font-barlow text-[9px] uppercase text-gray-500">
                            {t("proficiencies.custom")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {customs.map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-hero-dark/40 px-2 py-0.5 font-libre text-[11px] text-gray-300"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={() => removeCustomProficiency(category, item)}
                                  className="text-red-400 hover:text-red-300"
                                  aria-label="×"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customProfDraft[category]}
                          onChange={(e) =>
                            setCustomProfDraft((p) => ({
                              ...p,
                              [category]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomProficiency(category);
                            }
                          }}
                          placeholder={t("proficiencies.customPlaceholder")}
                          className="flex-1 rounded border border-hero-border bg-hero-dark/60 px-2 py-1 font-libre text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => addCustomProficiency(category)}
                          className="font-barlow text-[9px] font-bold uppercase text-hero-vibrant hover:text-white shrink-0"
                        >
                          {t("proficiencies.addCustom")}
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-2 border-t border-hero-dark/60 pt-3">
                  <p className="font-barlow text-[10px] uppercase text-gray-500">
                    {t("proficiencies.languages")}
                  </p>
                  {biographyCulture ? (
                    <>
                      <p className="font-libre text-[10px] text-gray-500">
                        {t("proficiencies.languagesHint")}
                      </p>
                      {biographyCulture.languageOptions.length === 0 ? (
                        <p className="font-libre text-xs text-gray-500 italic">
                          {t("proficiencies.languagesEmpty")}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {biographyCulture.languageOptions.map((lang) => {
                            const checked = biographyCulture.languages.includes(lang.id);
                            return (
                              <label
                                key={lang.id}
                                className={`flex items-center gap-1.5 rounded border px-2 py-1 font-libre text-[11px] text-gray-200 ${
                                  readOnly
                                    ? "opacity-80 border-hero-border/50 bg-hero-dark/30"
                                    : checked
                                      ? "cursor-pointer border-hero-vibrant/60 bg-hero-vibrant/10"
                                      : "cursor-pointer border-hero-border/50 bg-hero-dark/30 hover:border-hero-vibrant/40"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={readOnly}
                                  onChange={() => toggleCampaignLanguage(lang.id)}
                                  className="rounded border-hero-dark"
                                />
                                {lang.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : sheet.proficiencies.languages.length > 0 ? (
                    <p className="font-libre text-xs text-gray-300">
                      {sheet.proficiencies.languages.join(", ")}
                    </p>
                  ) : (
                    <p className="font-libre text-xs text-gray-500">{t("proficiencies.empty")}</p>
                  )}
                </div>

                {readOnly &&
                sheet.proficiencies.armor.length === 0 &&
                sheet.proficiencies.weapons.length === 0 &&
                sheet.proficiencies.tools.length === 0 &&
                !(biographyCulture?.languages?.length) &&
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
            </div>

            {biographyCulture ? (
              <div className="xl:col-span-8 xl:col-start-3 space-y-4">
                <CharacterFlawPicker
                  characterFlaws={characterFlaws}
                  onCharacterFlawsChange={biographyCulture.onCharacterFlawsChange}
                  readOnly={readOnly}
                  compact
                />

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
            ) : null}
          </div>

        </>
      ) : null}

      {activeTab === "biography" && biographyCulture ? (
        <CharacterSheetBiographyCultureTab
          {...biographyCulture}
          readOnly={readOnly || Boolean(biographyCulture.readOnly)}
          alignment={meta.alignment}
          onAlignmentChange={setAlignmentSynced}
          raceName={meta.race}
          onRaceNameChange={applyRaceFromHeader}
          onCultureChange={applyCultureFromHeader}
          onToggleLanguage={(id) => {
            if (readOnly) return;
            toggleCampaignLanguage(id);
          }}
          onLanguagesChange={(ids) => {
            if (readOnly || !sheet) return;
            biographyCulture.onLanguagesChange?.(ids);
            setSheet(syncLanguageNamesToSheet(sheet, ids));
          }}
        />
      ) : null}

      {activeTab === "tuv" ? (
        <CharakterTuvPanel
          campaignId={campaignId}
          characterId={characterId}
          sheet={sheet}
          meta={{
            name: meta.name,
            className: meta.className,
            subclass: meta.subclass,
            race: meta.race,
            background: meta.background,
            level: meta.level,
            experiencePoints: meta.experiencePoints,
          }}
          inventoryItems={inventoryItems}
          readOnly={readOnly}
          onSheetChange={setSheet}
          onPersist={(nextSheet) => handleSave(true, nextSheet)}
        />
      ) : null}


      {levelUpOpen && sheet && payload ? (
        <LevelUpWizardModal
          open={levelUpOpen}
          onClose={() => setLevelUpOpen(false)}
          campaignId={campaignId}
          characterId={characterId}
          sheet={sheet}
          meta={meta}
          overrides={payload.overrides}
          onApplied={async () => {
            await reload();
            onSaved?.();
          }}
        />
      ) : null}

      {featPicker !== null ? (
        <FeatCatalogPickerModal
          onClose={() => setFeatPicker(null)}
          onPick={applyFeatPick}
          excludeIds={(sheet?.features ?? []).map((f) => f.id)}
        />
      ) : null}

      {abilityHelpKey ? (
        <AbilityHelpModal
          abilityKey={abilityHelpKey}
          onClose={() => setAbilityHelpKey(null)}
        />
      ) : null}

      {skillHelpKey ? (
        <SkillHelpModal
          skillKey={skillHelpKey}
          onClose={() => setSkillHelpKey(null)}
        />
      ) : null}

      {featureHelp ? (
        <FeatureHelpModal
          title={featureHelp.title}
          description={featureHelp.description}
          onClose={() => setFeatureHelp(null)}
        />
      ) : null}
      </div>

      <div className="pointer-events-none col-start-1 row-start-1 self-end sticky bottom-0 z-30">
        <div className={`pointer-events-auto ${compact ? "-mx-5" : ""}`}>
          <CharacterSheetModeBar
            editMode={editMode}
            canEdit={canEdit}
            isPending={isPending}
            onToggle={() => setEditMode((v) => !v)}
            onSave={() => handleSave()}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
