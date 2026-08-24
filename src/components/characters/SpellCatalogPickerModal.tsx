"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import type { Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import type { SpellDefinition } from "@/src/lib/characters/dnd5e/progression/types";
import {
  canLearnSpellFromCatalog,
  catalogSpellsForPicker,
  classDisplayName,
  countSpellsOfLevel,
  effectiveSlotMaxForLevel,
  spellDefinitionToSheetEntry,
} from "@/src/lib/characters/dnd5e/progression/catalog-bridge";
import { resolveClassId } from "@/src/lib/characters/dnd5e/progression/class-ids";
import { spellSchoolLabel } from "@/src/lib/characters/dnd5e/spellcasting";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  sheet: Dnd5eSheetData;
  characterClass: string | null;
  /** Subklasse (für Drittel-Zauberer → Magierliste) */
  characterSubclass?: string | null;
  level: number;
  /** true = nur browsen ohne Hinzufügen (read-only Sheet) */
  browseOnly?: boolean;
  /** false = nur browsen; wird von browseOnly überschrieben wenn true */
  allowAdd?: boolean;
  onClose: () => void;
  onAdd: (spell: ReturnType<typeof spellDefinitionToSheetEntry>) => void;
};

const REASON_KEYS = {
  "no-class": "spellCatalog.reasonNoClass",
  "wrong-class": "spellCatalog.reasonWrongClass",
  duplicate: "spellCatalog.reasonDuplicate",
  "level-too-high": "spellCatalog.reasonLevelTooHigh",
  "cantrip-limit": "spellCatalog.reasonCantripLimit",
  "no-slots": "spellCatalog.reasonNoSlots",
  "slot-limit": "spellCatalog.reasonSlotLimit",
  "known-limit": "spellCatalog.reasonKnownLimit",
} as const;

function CatalogSpellRow({
  def,
  allowAdd,
  sheet,
  characterClass,
  characterSubclass,
  level,
  onAdd,
}: {
  def: SpellDefinition;
  allowAdd: boolean;
  sheet: Dnd5eSheetData;
  characterClass: string | null;
  characterSubclass: string | null;
  level: number;
  onAdd: (def: SpellDefinition) => void;
}) {
  const { t, locale } = useCharacterSheetLocale();
  const [open, setOpen] = useState(false);
  const check = canLearnSpellFromCatalog(
    sheet,
    def,
    characterClass,
    level,
    characterSubclass,
  );
  const name = locale === "de" ? def.nameDe || def.nameEn : def.nameEn;
  const description =
    locale === "de"
      ? def.descriptionDe?.trim() || def.descriptionEn?.trim() || null
      : def.descriptionEn?.trim() || def.descriptionDe?.trim() || null;
  const school = spellSchoolLabel(def.school, locale);

  function reasonLabel(reason?: string): string {
    if (!reason) return "";
    const key = REASON_KEYS[reason as keyof typeof REASON_KEYS];
    return key ? t(key) : reason;
  }

  return (
    <li className="rounded border border-hero-border/40 bg-hero-dark/20">
      <div className="flex items-start justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-barlow text-sm font-bold text-white">{name}</p>
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            )}
          </div>
          <p className="mt-0.5 font-libre text-[11px] text-gray-500">
            {def.level <= 0
              ? t("spells.cantrips")
              : t("spells.levelHeading", { level: def.level })}
            {school ? ` · ${school}` : ""}
            {def.ritual ? ` · ${t("spells.ritual")}` : ""}
            {def.concentration ? ` · ${t("spells.concentration")}` : ""}
          </p>
          {allowAdd && !check.ok ? (
            <p className="mt-0.5 font-libre text-[10px] text-accent-blood">
              {reasonLabel(check.reason)}
            </p>
          ) : null}
        </button>
        {allowAdd ? (
          <button
            type="button"
            disabled={!check.ok}
            onClick={() => onAdd(def)}
            className="shrink-0 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("spellCatalog.add")}
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-2 border-t border-hero-dark/60 px-3 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-libre text-[11px] text-gray-400">
            <span>
              {def.level <= 0
                ? t("spells.cantrips")
                : t("spells.levelHeading", { level: def.level })}
            </span>
            {school ? <span>{school}</span> : null}
            {def.ritual ? (
              <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                {t("spells.ritual")}
              </span>
            ) : null}
            {def.concentration ? (
              <span className="font-barlow text-[10px] font-bold uppercase text-accent-blood">
                {t("spells.concentration")}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="font-libre text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
              {description}
            </p>
          ) : (
            <p className="font-libre text-xs text-gray-500">
              {t("spellCatalog.noDescription")}
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function SpellCatalogPickerModal({
  sheet,
  characterClass,
  characterSubclass = null,
  level,
  browseOnly = false,
  allowAdd: allowAddProp = true,
  onClose,
  onAdd,
}: Props) {
  const { t, locale } = useCharacterSheetLocale();
  const allowAdd = browseOnly ? false : allowAddProp;
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const classId = resolveClassId(characterClass);

  const all = useMemo(
    () => catalogSpellsForPicker(characterClass, sheet, characterSubclass, level),
    [characterClass, characterSubclass, sheet, level],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (levelFilter !== "all" && s.level !== levelFilter) return false;
      if (!q) return true;
      const school = (s.school ?? "").toLowerCase();
      return (
        s.nameDe.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        school.includes(q)
      );
    });
  }, [all, query, levelFilter]);

  const levelsPresent = useMemo(() => {
    const set = new Set(all.map((s) => s.level));
    return [...set].sort((a, b) => a - b);
  }, [all]);

  function addSpell(def: SpellDefinition) {
    if (!allowAdd) return;
    const check = canLearnSpellFromCatalog(
      sheet,
      def,
      characterClass,
      level,
      characterSubclass,
    );
    if (!check.ok) return;
    onAdd(spellDefinitionToSheetEntry(def));
  }

  const classLabel = classId
    ? classDisplayName(classId, locale)
    : t("spellCatalog.noClass");

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-hero-border bg-background-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-hero-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold">
              <BookOpen className="h-5 w-5" />
              {browseOnly ? t("spellCatalog.titleBrowse") : t("spellCatalog.title")}
            </h2>
            <p className="mt-1 font-libre text-xs text-gray-400">
              {t("spellCatalog.subtitle", { class: classLabel })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
            aria-label={t("spellCatalog.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-b border-hero-dark px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("spellCatalog.search")}
              className="w-full rounded border border-hero-dark bg-slate-900 py-2 pl-9 pr-3 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setLevelFilter("all")}
              className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                levelFilter === "all"
                  ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                  : "border-hero-border text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("spellCatalog.allLevels")}
            </button>
            {levelsPresent.map((lvl) => {
              const slotMax =
                lvl <= 0
                  ? 0
                  : effectiveSlotMaxForLevel(
                      sheet,
                      characterClass,
                      level,
                      lvl,
                      characterSubclass,
                    );
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase ${
                    levelFilter === lvl
                      ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                      : "border-hero-border text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {lvl <= 0
                    ? t("spells.cantrips")
                    : t("spells.levelHeading", { level: lvl })}
                  {lvl > 0 && slotMax > 0 ? (
                    <span className="ml-1 text-gray-500">
                      {t("spellCatalog.levelChipSlots", {
                        owned: countSpellsOfLevel(sheet.spells ?? [], lvl),
                        slots: slotMax,
                      })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!classId ? (
            <p className="font-libre text-sm text-accent-blood">
              {t("spellCatalog.pickClassFirst")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="font-libre text-sm text-gray-500">{t("spellCatalog.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((def) => (
                <CatalogSpellRow
                  key={def.id}
                  def={def}
                  allowAdd={allowAdd}
                  sheet={sheet}
                  characterClass={characterClass}
                  characterSubclass={characterSubclass}
                  level={level}
                  onAdd={addSpell}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
