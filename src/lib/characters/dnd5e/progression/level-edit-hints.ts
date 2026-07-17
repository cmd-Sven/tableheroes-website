import { levelGrantsAsi } from "./asi";
import { getClassProgression } from "./catalog";
import { matchSubclassOption, resolveClassId } from "./class-ids";
import {
  casterTypeForClass,
  isThirdCasterSubclass,
  slotsForClassLevel,
} from "./spell-slots";
import type { SlotKey } from "./types";

export type LevelEditHintId =
  | "subclassUnlock"
  | "subclassDue"
  | "asi"
  | "spellSlots"
  | "wizardRecommend";

export type LevelEditHint = {
  id: LevelEditHintId;
  params?: Record<string, string | number>;
};

function formatSlotSummary(slots: Partial<Record<SlotKey, number>>): string {
  const parts: string[] = [];
  for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "pact"] as SlotKey[]) {
    const n = slots[key] ?? 0;
    if (n <= 0) continue;
    parts.push(key === "pact" ? `Pakt ${n}` : `${key}: ${n}`);
  }
  return parts.join(" · ");
}

function slotsEqual(
  a: Partial<Record<SlotKey, number>>,
  b: Partial<Record<SlotKey, number>>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k as SlotKey] ?? 0) !== (b[k as SlotKey] ?? 0)) return false;
  }
  return true;
}

/**
 * Leichte Hinweise für manuelle Stufenanpassung im Bearbeitungsmodus.
 * Nutzt Katalog (subclassLevel, asiLevels) und Slot-Tabellen — kein voller planLevelUp.
 */
export function buildLevelEditHints(input: {
  className: string | null;
  subclass: string | null;
  level: number;
  /** Zuletzt gespeicherte Stufe (für Wizard-Empfehlung bei Erhöhung). */
  savedLevel: number;
}): LevelEditHint[] {
  const level = Math.min(20, Math.max(1, Math.floor(input.level)));
  const savedLevel = Math.min(20, Math.max(1, Math.floor(input.savedLevel)));
  const classId = resolveClassId(input.className);
  const prog = getClassProgression(classId);
  const hints: LevelEditHint[] = [];

  if (level > savedLevel) {
    hints.push({ id: "wizardRecommend" });
  }

  if (classId && prog) {
    const subclassLevel = prog.subclassLevel ?? 3;
    const hasSubclassOptions = (prog.subclasses?.length ?? 0) > 0;
    const matchedSubclass = input.subclass
      ? matchSubclassOption(input.subclass, prog.subclasses ?? [])
      : null;

    if (hasSubclassOptions && level === subclassLevel) {
      hints.push({ id: "subclassUnlock", params: { level: subclassLevel } });
    } else if (
      hasSubclassOptions &&
      level >= subclassLevel &&
      !matchedSubclass
    ) {
      hints.push({ id: "subclassDue", params: { level: subclassLevel } });
    }

    if (levelGrantsAsi(classId, level)) {
      hints.push({ id: "asi", params: { level } });
    }

    const subclassHint = matchedSubclass?.id ?? input.subclass;
    let caster = prog.caster ?? casterTypeForClass(classId);
    if (
      caster === "none" &&
      (classId === "fighter" || classId === "rogue") &&
      isThirdCasterSubclass(subclassHint)
    ) {
      caster = "third";
    }

    if (caster !== "none") {
      const currentSlots = slotsForClassLevel(classId, level, subclassHint);
      const prevSlots =
        level > 1
          ? slotsForClassLevel(classId, level - 1, subclassHint)
          : {};
      if (!slotsEqual(currentSlots, prevSlots)) {
        const summary = formatSlotSummary(currentSlots);
        if (summary) {
          hints.push({ id: "spellSlots", params: { slots: summary } });
        }
      }
    }
  }

  return hints;
}
