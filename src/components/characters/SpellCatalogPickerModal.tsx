"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import type { Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import type { SpellDefinition } from "@/src/lib/characters/dnd5e/progression/types";
import {
  canLearnSpellFromCatalog,
  catalogSpellsForPicker,
  countSpellsOfLevel,
  slotMaxForLevel,
  spellDefinitionToSheetEntry,
} from "@/src/lib/characters/dnd5e/progression/catalog-bridge";
import { resolveClassId } from "@/src/lib/characters/dnd5e/progression/class-ids";
import { CLASS_NAME_DE } from "@/src/lib/characters/dnd5e/progression/labels-de";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  sheet: Dnd5eSheetData;
  characterClass: string | null;
  level: number;
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

export function SpellCatalogPickerModal({
  sheet,
  characterClass,
  level,
  onClose,
  onAdd,
}: Props) {
  const { t, locale } = useCharacterSheetLocale();
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const classId = resolveClassId(characterClass);

  const all = useMemo(
    () => catalogSpellsForPicker(characterClass, sheet),
    [characterClass, sheet],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (levelFilter !== "all" && s.level !== levelFilter) return false;
      if (!q) return true;
      return (
        s.nameDe.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        s.school.toLowerCase().includes(q)
      );
    });
  }, [all, query, levelFilter]);

  const levelsPresent = useMemo(() => {
    const set = new Set(all.map((s) => s.level));
    return [...set].sort((a, b) => a - b);
  }, [all]);

  function reasonLabel(reason?: string): string {
    if (!reason) return "";
    const key = REASON_KEYS[reason as keyof typeof REASON_KEYS];
    return key ? t(key) : reason;
  }

  function addSpell(def: SpellDefinition) {
    const check = canLearnSpellFromCatalog(sheet, def, characterClass, level);
    if (!check.ok) return;
    onAdd(spellDefinitionToSheetEntry(def));
  }

  const classLabel = classId
    ? locale === "de"
      ? CLASS_NAME_DE[classId]
      : classId
    : t("spellCatalog.noClass");

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-hero-border bg-background-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-hero-border px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold">
              <BookOpen className="h-5 w-5" />
              {t("spellCatalog.title")}
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
              const owned = countSpellsOfLevel(sheet.spells ?? [], lvl);
              const max =
                lvl <= 0
                  ? "∞"
                  : String(slotMaxForLevel(sheet, lvl) || 0);
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
                  {lvl <= 0 ? t("spells.cantrips") : t("spells.levelHeading", { level: lvl })}
                  <span className="ml-1 text-gray-500">
                    {owned}/{max}
                  </span>
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
              {filtered.map((def) => {
                const check = canLearnSpellFromCatalog(
                  sheet,
                  def,
                  characterClass,
                  level,
                );
                const name = locale === "de" ? def.nameDe || def.nameEn : def.nameEn;
                return (
                  <li
                    key={def.id}
                    className="flex items-start justify-between gap-3 rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-barlow text-sm font-bold text-white">{name}</p>
                      <p className="font-libre text-[11px] text-gray-500">
                        {def.level <= 0
                          ? t("spells.cantrips")
                          : t("spells.levelHeading", { level: def.level })}
                        {def.school ? ` · ${def.school}` : ""}
                        {def.ritual ? ` · ${t("spells.ritual")}` : ""}
                        {def.concentration ? ` · ${t("spells.concentration")}` : ""}
                      </p>
                      {!check.ok ? (
                        <p className="mt-0.5 font-libre text-[10px] text-accent-blood">
                          {reasonLabel(check.reason)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={!check.ok}
                      onClick={() => addSpell(def)}
                      className="shrink-0 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("spellCatalog.add")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
