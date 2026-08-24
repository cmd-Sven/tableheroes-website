"use client";

import { useMemo, type ComponentType } from "react";
import {
  Axe,
  BookOpen,
  BowArrow,
  Cross,
  Feather,
  Flame,
  Footprints,
  Leaf,
  Music,
  Scroll,
  Shield,
  Swords,
  WandSparkles,
} from "lucide-react";
import {
  getAllClassProgressions,
  getSpellsForClass,
  getSubclassAvailability,
  planLevel1Creation,
  STANDARD_ARRAY,
  type AbilityKeyShort,
  type ClassId,
  type RaceId,
} from "@/src/lib/characters/dnd5e/progression";
import { abilityModifier, formatSigned } from "@/src/lib/characters/dnd5e/formulas";

const ABILITIES: { key: AbilityKeyShort; label: string }[] = [
  { key: "str", label: "Stärke" },
  { key: "dex", label: "Geschicklichkeit" },
  { key: "con", label: "Konstitution" },
  { key: "int", label: "Intelligenz" },
  { key: "wis", label: "Weisheit" },
  { key: "cha", label: "Charisma" },
];

const SRD_RACES: { id: RaceId; label: string }[] = [
  { id: "human", label: "Mensch" },
  { id: "elf", label: "Elf" },
  { id: "dwarf", label: "Zwerg" },
  { id: "halfling", label: "Halbling" },
  { id: "dragonborn", label: "Drachenblütiger" },
  { id: "gnome", label: "Gnom" },
  { id: "half-elf", label: "Halbelf" },
  { id: "half-orc", label: "Halbork" },
  { id: "tiefling", label: "Tiefling" },
];

const CLASS_ICONS: Record<ClassId, ComponentType<{ className?: string }>> = {
  barbarian: Axe,
  bard: Music,
  cleric: Cross,
  druid: Leaf,
  fighter: Swords,
  monk: Footprints,
  paladin: Shield,
  ranger: BowArrow,
  rogue: Feather,
  sorcerer: Flame,
  warlock: BookOpen,
  wizard: WandSparkles,
};

type Props = {
  classId: ClassId | "";
  onClassId: (id: ClassId | "") => void;
  subclassId: string;
  onSubclassId: (id: string) => void;
  srdRaceId: RaceId;
  onSrdRaceId: (id: RaceId) => void;
  baseAbilities: Record<AbilityKeyShort, number>;
  onBaseAbilities: (next: Record<AbilityKeyShort, number>) => void;
  applyRacialBonuses: boolean;
  onApplyRacialBonuses: (v: boolean) => void;
  spellIds: string[];
  onSpellIds: (ids: string[]) => void;
  mode: "class" | "abilities" | "spells";
};

export function CharacterCreateRulesPanel({
  classId,
  onClassId,
  subclassId,
  onSubclassId,
  srdRaceId,
  onSrdRaceId,
  baseAbilities,
  onBaseAbilities,
  applyRacialBonuses,
  onApplyRacialBonuses,
  spellIds,
  onSpellIds,
  mode,
}: Props) {
  const classes = useMemo(() => getAllClassProgressions(), []);
  const plan = useMemo(
    () =>
      classId
        ? planLevel1Creation({
            classId,
            subclassId: subclassId || null,
            raceId: srdRaceId,
          })
        : null,
    [classId, subclassId, srdRaceId],
  );

  const selectedClass = useMemo(
    () => (classId ? classes.find((c) => c.id === classId) ?? null : null),
    [classes, classId],
  );

  const ClassIcon = classId ? CLASS_ICONS[classId] ?? Scroll : null;

  const subclassAvailability = useMemo(
    () => (classId ? getSubclassAvailability(classId) : null),
    [classId],
  );

  const availableSubclassesLabel = useMemo(() => {
    if (!selectedClass?.subclasses?.length) return null;
    return selectedClass.subclasses
      .map((s) => s.nameDe || s.nameEn)
      .filter(Boolean)
      .join(", ");
  }, [selectedClass]);

  const spellChoices = useMemo(() => {
    if (!classId || !plan?.spellcasting) return { cantrips: [], leveled: [] };
    const all = getSpellsForClass(classId, 1);
    return {
      cantrips: all.filter((s) => s.level === 0),
      leveled: all.filter((s) => s.level === 1),
    };
  }, [classId, plan]);

  function assignStandardArray() {
    const order: AbilityKeyShort[] = ["str", "dex", "con", "int", "wis", "cha"];
    const next = { ...baseAbilities };
    order.forEach((k, i) => {
      next[k] = STANDARD_ARRAY[i] ?? 10;
    });
    onBaseAbilities(next);
  }

  function toggleSpell(id: string, bucket: "cantrip" | "leveled") {
    if (!plan?.spellcasting) return;
    const limit =
      bucket === "cantrip"
        ? plan.spellcasting.cantripsToLearn
        : plan.spellcasting.spellsToLearn;
    const pool =
      bucket === "cantrip"
        ? spellChoices.cantrips.map((s) => s.id)
        : spellChoices.leveled.map((s) => s.id);
    const inBucket = spellIds.filter((x) => pool.includes(x));
    if (spellIds.includes(id)) {
      onSpellIds(spellIds.filter((x) => x !== id));
      return;
    }
    if (limit > 0 && inBucket.length >= limit) return;
    onSpellIds([...spellIds, id]);
  }

  if (mode === "class") {
    return (
      <div className="space-y-5">
        <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
          Klasse (Stufe 1)
        </h3>
        <p className="font-libre text-sm text-gray-400">
          Wähle eine D&amp;D-5e-Klasse aus dem Katalog. Features, Trefferwürfel und
          Zauberregeln kommen aus dem SRD-Katalog.
        </p>
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Klasse *
          </label>
          <div className="flex items-stretch gap-3">
            {ClassIcon ? (
              <div
                className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded border border-hero-border/50 bg-hero-dark/30 text-accent-gold"
                aria-hidden
              >
                <ClassIcon className="h-6 w-6" />
              </div>
            ) : null}
            <select
              value={classId}
              onChange={(e) => {
                onClassId((e.target.value || "") as ClassId | "");
                onSubclassId("");
                onSpellIds([]);
              }}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
            >
              <option value="">-- Klasse wählen --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameDe || c.nameEn} (W{c.hitDie})
                </option>
              ))}
            </select>
          </div>
          {selectedClass && subclassAvailability ? (
            <div className="mt-2 space-y-1 font-libre text-sm text-gray-400">
              <p>{subclassAvailability.unlockNoteDe}</p>
              <p>
                Gängige Unterklassen:{" "}
                {subclassAvailability.entries.map((entry, i) => (
                  <span key={entry.id}>
                    {i > 0 ? ", " : null}
                    <span
                      className={
                        entry.inSystem ? "text-accent-gold" : "text-gray-500"
                      }
                    >
                      {entry.nameDe}
                      {entry.inSystem ? " (im System)" : " (noch nicht verfügbar)"}
                    </span>
                  </span>
                ))}
              </p>
              {availableSubclassesLabel ? (
                <p className="text-xs text-gray-500">
                  Wählbar im Katalog:{" "}
                  <span className="text-accent-gold">{availableSubclassesLabel}</span>
                  {selectedClass.subclassLevel > 1 ? (
                    <span>
                      {" "}
                      (Wahl ab Stufe {selectedClass.subclassLevel})
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : selectedClass && availableSubclassesLabel ? (
            <p className="mt-2 font-libre text-sm text-gray-400">
              Verfügbare Unterklassen im System:{" "}
              <span className="text-accent-gold">{availableSubclassesLabel}</span>
              {selectedClass.subclassLevel > 1 ? (
                <span className="text-gray-500">
                  {" "}
                  (Wahl ab Stufe {selectedClass.subclassLevel})
                </span>
              ) : null}
            </p>
          ) : selectedClass ? (
            <p className="mt-2 font-libre text-sm text-gray-500">
              Für diese Klasse sind derzeit keine Unterklassen im Katalog hinterlegt.
            </p>
          ) : null}
        </div>

        {plan?.needsSubclass ? (
          <div>
            <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
              Subklasse / Domäne * (ab Stufe {plan.subclassLevel})
            </label>
            <select
              value={subclassId}
              onChange={(e) => onSubclassId(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
            >
              <option value="">-- wählen --</option>
              {plan.subclassOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameDe || s.nameEn}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {plan && plan.classFeatures.length > 0 ? (
          <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-4">
            <p className="mb-2 font-barlow text-xs font-bold uppercase text-accent-gold">
              Klassenfeatures Stufe 1
            </p>
            <ul className="space-y-2 font-libre text-sm text-gray-200">
              {plan.classFeatures.map((f) => (
                <li key={f.id}>
                  <span className="font-semibold text-white">{f.nameDe || f.nameEn}</span>
                  {(f.descriptionDe || f.descriptionEn) && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-3">
                      {f.descriptionDe || f.descriptionEn}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === "abilities") {
    const conMod = abilityModifier(baseAbilities.con ?? 10);
    const hitDie = plan?.hitDie ?? 8;
    return (
      <div className="space-y-5">
        <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">
          Attribute
        </h3>
        <p className="font-libre text-sm text-gray-400">
          Standard-Array ({STANDARD_ARRAY.join(", ")}) oder manuell anpassen.
          Rassenboni werden optional zusätzlich angewendet.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={assignStandardArray}
            className="rounded border border-hero-vibrant px-3 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant"
          >
            Standard-Array setzen
          </button>
          <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
            <input
              type="checkbox"
              checked={applyRacialBonuses}
              onChange={(e) => onApplyRacialBonuses(e.target.checked)}
              className="accent-accent-gold"
            />
            2014-Rassenboni anwenden
          </label>
        </div>
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            SRD-Rasse (Regeln)
          </label>
          <select
            value={srdRaceId}
            onChange={(e) => onSrdRaceId(e.target.value as RaceId)}
            className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none focus:border-accent-gold"
          >
            {SRD_RACES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 font-libre italic">
            Lore-Rasse kommt aus dem Herkunfts-Schritt; hier die mechanische SRD-Rasse für Boni.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ABILITIES.map(({ key, label }) => (
            <label key={key} className="block space-y-1">
              <span className="font-barlow text-xs uppercase text-gray-400">
                {label} ({formatSigned(abilityModifier(baseAbilities[key] ?? 10))})
              </span>
              <input
                type="number"
                min={3}
                max={18}
                value={baseAbilities[key] ?? 10}
                onChange={(e) =>
                  onBaseAbilities({
                    ...baseAbilities,
                    [key]: Number(e.target.value) || 10,
                  })
                }
                className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
              />
            </label>
          ))}
        </div>
        <p className="font-libre text-sm text-accent-gold">
          Start-TP (ohne Rassenbonus auf CON): ca. {hitDie + conMod} (W{hitDie} + CON)
        </p>
      </div>
    );
  }

  // spells
  if (!plan?.spellcasting) {
    return (
      <p className="font-libre text-gray-400">Diese Klasse hat auf Stufe 1 keine Zauberwahl.</p>
    );
  }

  const cantripsPicked = spellIds.filter((id) =>
    spellChoices.cantrips.some((s) => s.id === id),
  ).length;
  const spellsPicked = spellIds.filter((id) =>
    spellChoices.leveled.some((s) => s.id === id),
  ).length;

  return (
    <div className="space-y-5">
      <h3 className="font-barlow font-bold text-lg text-white uppercase mb-4">Zauber</h3>
      {plan.spellcasting.preparedHint ? (
        <p className="font-libre text-sm text-gray-400">
          Vorbereitende Zauberer: Cantrips wählen; vorbereitete Zauber kannst du später auf dem
          Blatt anpassen.
        </p>
      ) : null}
      {plan.spellcasting.cantripsToLearn > 0 ? (
        <div>
          <p className="mb-2 font-barlow text-xs font-bold uppercase text-accent-gold">
            Cantrips ({cantripsPicked}/{plan.spellcasting.cantripsToLearn})
          </p>
          <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
            {spellChoices.cantrips.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm font-libre ${
                  spellIds.includes(s.id)
                    ? "border-accent-gold bg-accent-gold/10 text-white"
                    : "border-hero-dark text-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={spellIds.includes(s.id)}
                  onChange={() => toggleSpell(s.id, "cantrip")}
                  className="accent-accent-gold"
                />
                {s.nameDe || s.nameEn}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {plan.spellcasting.spellsToLearn > 0 ? (
        <div>
          <p className="mb-2 font-barlow text-xs font-bold uppercase text-accent-gold">
            Zauber Grad 1 ({spellsPicked}/{plan.spellcasting.spellsToLearn})
          </p>
          <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
            {spellChoices.leveled.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm font-libre ${
                  spellIds.includes(s.id)
                    ? "border-accent-gold bg-accent-gold/10 text-white"
                    : "border-hero-dark text-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={spellIds.includes(s.id)}
                  onChange={() => toggleSpell(s.id, "leveled")}
                  className="accent-accent-gold"
                />
                {s.nameDe || s.nameEn}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function spellsStepValid(
  classId: ClassId | "",
  subclassId: string,
  spellIds: string[],
): boolean {
  if (!classId) return false;
  const plan = planLevel1Creation({
    classId,
    subclassId: subclassId || null,
  });
  if (!plan.spellcasting) return true;
  const all = getSpellsForClass(classId, 1);
  const cantripIds = new Set(all.filter((s) => s.level === 0).map((s) => s.id));
  const leveledIds = new Set(all.filter((s) => s.level === 1).map((s) => s.id));
  const c = spellIds.filter((id) => cantripIds.has(id)).length;
  const l = spellIds.filter((id) => leveledIds.has(id)).length;
  if (c < plan.spellcasting.cantripsToLearn) return false;
  if (l < plan.spellcasting.spellsToLearn) return false;
  return true;
}
