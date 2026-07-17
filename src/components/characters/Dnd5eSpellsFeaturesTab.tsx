"use client";

import { useMemo, useState } from "react";
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import type {
  AbilityKey,
  Dnd5eDerivedSheet,
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSpellEntry,
} from "@/src/lib/characters/dnd5e/types";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import {
  defaultSpellAbilityForClass,
  getSpellPreparationStyle,
  groupSpellsByLevel,
  localizedFeatureDescription,
  localizedFeatureName,
  localizedSpellDescription,
  localizedSpellName,
  preparedSpellLimit,
  slotRemaining,
  spellDamageTypeLabel,
  spellRequiresPreparation,
  spellSchoolLabel,
  SPELL_SLOT_LEVEL_KEYS,
  type SpellPreparationStyle,
} from "@/src/lib/characters/dnd5e/spellcasting";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";
import type { CharacterSheetT } from "@/src/lib/i18n/character-sheet";
import { SpellEditorModal } from "@/src/components/characters/SpellEditorModal";
import { SpellCatalogPickerModal } from "@/src/components/characters/SpellCatalogPickerModal";
import { applyClassBasicsFromCatalog } from "@/src/lib/characters/dnd5e/progression/catalog-bridge";
import { resolveClassId } from "@/src/lib/characters/dnd5e/progression/class-ids";

type Props = {
  sheet: Dnd5eSheetData;
  derived: Dnd5eDerivedSheet;
  characterClass: string | null;
  level: number;
  readOnly: boolean;
  onSheetChange: (sheet: Dnd5eSheetData) => void;
};

function spellLevelHeading(level: number, t: CharacterSheetT): string {
  if (level <= 0) return t("spells.cantrips");
  return t("spells.levelHeading", { level });
}

function PreparationBadge({ style }: { style: SpellPreparationStyle }) {
  const { t } = useCharacterSheetLocale();
  if (style === "none") return null;
  const label =
    style === "prepared"
      ? t("spells.prepStyle.prepared")
      : style === "pact"
        ? t("spells.prepStyle.pact")
        : t("spells.prepStyle.known");
  return (
    <span className="rounded border border-hero-border/50 bg-hero-dark/40 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
      {label}
    </span>
  );
}

function SpellCard({
  spell,
  style,
  readOnly,
  onTogglePrepared,
  onEdit,
  onDelete,
}: {
  spell: Dnd5eSpellEntry;
  style: SpellPreparationStyle;
  readOnly: boolean;
  onTogglePrepared: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, locale, abilityLabel } = useCharacterSheetLocale();
  const [open, setOpen] = useState(false);
  const name = localizedSpellName(spell, locale);
  const description = localizedSpellDescription(spell, locale);
  const school = spellSchoolLabel(spell.school, locale);
  const damageType = spellDamageTypeLabel(spell.damageType, locale);
  const needsPrep = spellRequiresPreparation(spell, style);
  const isPrepared = Boolean(spell.prepared) || !needsPrep;

  return (
    <div
      className={`rounded border p-3 transition-colors ${
        needsPrep && !spell.prepared
          ? "border-hero-dark/60 bg-background-dark/40 opacity-75"
          : "border-hero-border/40 bg-hero-dark/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {needsPrep ? (
          <label className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={Boolean(spell.prepared)}
              disabled={readOnly}
              onChange={onTogglePrepared}
              className="h-3.5 w-3.5 rounded border-hero-border bg-hero-dark text-hero-vibrant focus:ring-hero-vibrant"
              aria-label={t("spells.preparedAria", { name })}
            />
          </label>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-barlow text-sm font-bold text-white">{name}</span>
            {school ? (
              <span className="font-libre text-[10px] text-gray-500">{school}</span>
            ) : null}
            {spell.ritual ? (
              <span className="font-barlow text-[9px] font-bold uppercase text-accent-gold">
                {t("spells.ritual")}
              </span>
            ) : null}
            {spell.concentration ? (
              <span className="font-barlow text-[9px] font-bold uppercase text-accent-blood">
                {t("spells.concentration")}
              </span>
            ) : null}
            {needsPrep && isPrepared ? (
              <span className="font-barlow text-[9px] font-bold uppercase text-hero-vibrant">
                {t("spells.prepared")}
              </span>
            ) : null}
            {open ? (
              <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-500" />
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-libre text-[11px] text-gray-500">
            {spell.castingTime ? <span>{spell.castingTime}</span> : null}
            {spell.range ? <span>{spell.range}</span> : null}
            {spell.duration ? <span>{spell.duration}</span> : null}
            {spell.components ? <span>{spell.components}</span> : null}
            {spell.damage ? (
              <span>
                {spell.damage}
                {damageType ? ` ${damageType}` : ""}
              </span>
            ) : null}
          </div>
        </button>

        {!readOnly ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1.5 text-gray-400 hover:bg-hero-dark hover:text-hero-vibrant"
              aria-label={t("spellEditor.editAria", { name })}
              title={t("spellEditor.edit")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1.5 text-gray-400 hover:bg-hero-dark hover:text-red-400"
              aria-label={t("spellEditor.deleteAria", { name })}
              title={t("spellEditor.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 space-y-2 border-t border-hero-dark/60 pt-2">
          {spell.target ||
          spell.saveAbility ||
          (spell.attackType && spell.attackType !== "none") ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-libre text-[11px] text-gray-400">
              {spell.target ? (
                <span>
                  {t("spellEditor.target")}: {spell.target}
                </span>
              ) : null}
              {spell.saveAbility ? (
                <span>
                  {t("spells.saveDc")}: {abilityLabel(spell.saveAbility)}
                </span>
              ) : null}
              {spell.attackType && spell.attackType !== "none" ? (
                <span>
                  {t("spellEditor.attackType")}:{" "}
                  {spell.attackType === "melee"
                    ? t("spellEditor.attackMelee")
                    : t("spellEditor.attackRanged")}
                </span>
              ) : null}
            </div>
          ) : null}
          {description ? (
            <p className="font-libre text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
              {description}
            </p>
          ) : null}
          {spell.higherLevels ? (
            <p className="font-libre text-xs leading-relaxed text-accent-gold/90 whitespace-pre-wrap">
              <span className="font-barlow font-bold uppercase text-[10px]">
                {t("spellEditor.higherLevels")}:{" "}
              </span>
              {spell.higherLevels}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FeatureCard({ feature }: { feature: Dnd5eFeatureEntry }) {
  const { locale } = useCharacterSheetLocale();
  const [open, setOpen] = useState(false);
  const name = localizedFeatureName(feature, locale);
  const description = localizedFeatureDescription(feature, locale);

  return (
    <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="min-w-0 flex-1 font-barlow text-sm font-bold text-white">{name}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        )}
      </button>
      {open && description ? (
        <p className="mt-2 border-t border-hero-dark/60 pt-2 font-libre text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Dnd5eSpellsFeaturesTab({
  sheet,
  derived,
  characterClass,
  level,
  readOnly,
  onSheetChange,
}: Props) {
  const { t, abilityLabel } = useCharacterSheetLocale();
  const prepStyle = getSpellPreparationStyle(characterClass);
  const spells = sheet.spells ?? [];
  const features = sheet.features ?? [];
  const slots = sheet.spellcasting?.slots;
  const castAbility = (sheet.spellcasting?.ability ??
    defaultSpellAbilityForClass(characterClass)) as AbilityKey;
  const abilityMod = derived.abilities[castAbility]?.modifier ?? 0;
  const [editorSpell, setEditorSpell] = useState<Dnd5eSpellEntry | null | "new">(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const classId = resolveClassId(characterClass);

  const grouped = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const preparedCount = useMemo(() => {
    return spells.filter((s) => spellRequiresPreparation(s, prepStyle) && s.prepared).length;
  }, [spells, prepStyle]);

  const prepLimit = preparedSpellLimit(characterClass, level, abilityMod);

  const slotKeys = useMemo(() => {
    const keys: string[] = [];
    for (const lvl of SPELL_SLOT_LEVEL_KEYS) {
      if (slots?.[lvl]?.max) keys.push(lvl);
    }
    if (slots?.pact?.max) keys.push("pact");
    return keys;
  }, [slots]);

  function ensureSpellcasting(next: Dnd5eSheetData): Dnd5eSheetData {
    if (next.spellcasting) return next;
    return {
      ...next,
      spellcasting: {
        ability: defaultSpellAbilityForClass(characterClass),
        spellSaveDcOverride: null,
        spellAttackBonusOverride: null,
        slots: {},
      },
    };
  }

  function togglePrepared(spellId: string) {
    if (readOnly) return;
    const nextSpells = (sheet.spells ?? []).map((s) =>
      s.id === spellId ? { ...s, prepared: !s.prepared } : s,
    );
    onSheetChange({ ...sheet, spells: nextSpells });
  }

  function adjustSlotUsed(key: string, delta: number) {
    if (readOnly || !sheet.spellcasting?.slots?.[key]) return;
    const block = sheet.spellcasting.slots[key];
    const used = Math.max(0, Math.min(block.max, block.used + delta));
    onSheetChange({
      ...sheet,
      spellcasting: {
        ...sheet.spellcasting,
        slots: {
          ...sheet.spellcasting.slots,
          [key]: { ...block, used },
        },
      },
    });
  }

  function saveSpell(spell: Dnd5eSpellEntry) {
    const existing = sheet.spells ?? [];
    const idx = existing.findIndex((s) => s.id === spell.id);
    const nextSpells =
      idx >= 0
        ? existing.map((s, i) => (i === idx ? spell : s))
        : [...existing, spell];
    onSheetChange(ensureSpellcasting({ ...sheet, spells: nextSpells }));
    setEditorSpell(null);
  }

  function addFromCatalog(spell: Dnd5eSpellEntry) {
    let next = ensureSpellcasting({ ...sheet });
    if (!next.spellcasting?.slots || Object.keys(next.spellcasting.slots).length === 0) {
      next = applyClassBasicsFromCatalog(next, characterClass, level);
    }
    const existing = next.spells ?? [];
    if (existing.some((s) => s.id === spell.id)) return;
    onSheetChange({ ...next, spells: [...existing, spell] });
  }

  function deleteSpell(spellId: string) {
    if (readOnly) return;
    const name =
      spells.find((s) => s.id === spellId)?.name ??
      t("spellEditor.unnamed");
    if (!window.confirm(t("spellEditor.deleteConfirm", { name }))) return;
    onSheetChange({
      ...sheet,
      spells: (sheet.spells ?? []).filter((s) => s.id !== spellId),
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hero-dark pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Wand2 className="h-4 w-4 text-accent-gold" />
              <h2 className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
                {t("spells.sectionTitle")}
              </h2>
              <PreparationBadge style={prepStyle} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {sheet.spellcasting || spells.length > 0 ? (
                <div className="flex flex-wrap gap-4 font-libre text-xs text-gray-300">
                  <span>
                    {t("spells.ability")}:{" "}
                    <span className="font-barlow font-bold text-white">
                      {abilityLabel(castAbility)}
                    </span>
                  </span>
                  {derived.spellSaveDc != null ? (
                    <span>
                      {t("spells.saveDc")}:{" "}
                      <span className="font-barlow font-bold text-hero-vibrant">
                        {derived.spellSaveDc}
                      </span>
                    </span>
                  ) : null}
                  {derived.spellAttackBonus != null ? (
                    <span>
                      {t("spells.attackBonus")}:{" "}
                      <span className="font-barlow font-bold text-hero-vibrant">
                        {formatSigned(derived.spellAttackBonus)}
                      </span>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCatalogOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded border border-accent-gold/60 bg-accent-gold/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    {t("spellCatalog.open")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorSpell("new")}
                    className="inline-flex items-center gap-1.5 rounded border border-hero-vibrant/60 bg-hero-vibrant/10 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("spellEditor.addCustom")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {prepStyle === "prepared" && prepLimit != null ? (
            <p className="font-libre text-xs text-gray-400">
              {t("spells.preparedCount", { current: preparedCount, max: prepLimit })}
              {preparedCount > prepLimit ? (
                <span className="ml-2 text-accent-blood">{t("spells.preparedOver")}</span>
              ) : null}
            </p>
          ) : null}

          {prepStyle === "known" ? (
            <p className="font-libre text-xs text-gray-400">{t("spells.knownHint")}</p>
          ) : null}
          {prepStyle === "pact" ? (
            <p className="font-libre text-xs text-gray-400">{t("spells.pactHint")}</p>
          ) : null}

          {slotKeys.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {slotKeys.map((key) => {
                const block = slots![key];
                const remaining = slotRemaining(slots, key);
                const label =
                  key === "pact" ? t("spells.pactSlot") : t("spells.slotLevel", { level: key });
                return (
                  <div
                    key={key}
                    className="flex min-w-[5.5rem] flex-col items-center rounded border border-hero-border/50 bg-background-card px-2 py-2"
                  >
                    <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                      {label}
                    </span>
                    <span className="font-barlow text-lg font-extrabold text-hero-vibrant">
                      {remaining}
                      <span className="text-sm text-gray-500">/{block.max}</span>
                    </span>
                    {!readOnly ? (
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => adjustSlotUsed(key, 1)}
                          disabled={block.used >= block.max}
                          className="rounded px-1.5 font-barlow text-[10px] font-bold text-gray-400 hover:bg-hero-dark hover:text-white disabled:opacity-30"
                          aria-label={t("spells.useSlot")}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustSlotUsed(key, -1)}
                          disabled={block.used <= 0}
                          className="rounded px-1.5 font-barlow text-[10px] font-bold text-gray-400 hover:bg-hero-dark hover:text-white disabled:opacity-30"
                          aria-label={t("spells.restoreSlot")}
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {!classId && !readOnly ? (
            <p className="font-libre text-xs text-accent-blood">
              {t("spellCatalog.pickClassFirst")}
            </p>
          ) : null}

          {spells.length === 0 ? (
            <p className="font-libre text-sm text-gray-500">{t("spells.emptyEditable")}</p>
          ) : (
            <div className="space-y-5">
              {[...grouped.entries()].map(([lvl, list]) => (
                <div key={lvl} className="space-y-2">
                  <h3 className="font-cinzel text-sm font-bold text-accent-gold">
                    {spellLevelHeading(lvl, t)}
                    <span className="ml-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
                      ({list.length})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {list.map((spell) => (
                      <SpellCard
                        key={spell.id}
                        spell={spell}
                        style={prepStyle}
                        readOnly={readOnly}
                        onTogglePrepared={() => togglePrepared(spell.id)}
                        onEdit={() => setEditorSpell(spell)}
                        onDelete={() => deleteSpell(spell.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-hero-dark pb-2">
          <BookMarked className="h-4 w-4 text-accent-gold" />
          <h2 className="font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
            {t("spells.featuresTitle")}
          </h2>
          <Sparkles className="h-3.5 w-3.5 text-gray-500" />
        </div>

        {features.length === 0 ? (
          <p className="font-libre text-sm text-gray-500">{t("spells.featuresEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {features.map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        )}
      </section>

      {editorSpell !== null ? (
        <SpellEditorModal
          spell={editorSpell === "new" ? null : editorSpell}
          onClose={() => setEditorSpell(null)}
          onSave={saveSpell}
        />
      ) : null}

      {catalogOpen ? (
        <SpellCatalogPickerModal
          sheet={sheet}
          characterClass={characterClass}
          level={level}
          onClose={() => setCatalogOpen(false)}
          onAdd={addFromCatalog}
        />
      ) : null}
    </div>
  );
}
