import type { AbilityKey, Dnd5eDerivedSheet, Dnd5eSkillKey } from "./dnd5e/types";
import { abilityModifier } from "./dnd5e/formulas";
import type { CharacterFlawEntry } from "./character-flaws";
import { getFlawById } from "./character-flaws";

export type FlawModifierNotes = {
  flawId: string;
  flawName: string;
  text: string;
};

export type FlawModifiers = {
  abilityScoreDelta: Partial<Record<AbilityKey, number>>;
  skillBonus: Partial<Record<Dnd5eSkillKey, number>>;
  savingThrowBonus: Partial<Record<AbilityKey, number>>;
  initiative: number;
  speed: number;
  passivePerception: number;
  notes: FlawModifierNotes[];
};

function addAbilityDelta(
  target: Partial<Record<AbilityKey, number>>,
  key: AbilityKey,
  delta: number,
) {
  target[key] = (target[key] ?? 0) + delta;
}

function addSkillBonus(
  target: Partial<Record<Dnd5eSkillKey, number>>,
  key: Dnd5eSkillKey,
  delta: number,
) {
  target[key] = (target[key] ?? 0) + delta;
}

function addSaveBonus(
  target: Partial<Record<AbilityKey, number>>,
  key: AbilityKey,
  delta: number,
) {
  target[key] = (target[key] ?? 0) + delta;
}

function addNote(
  notes: FlawModifierNotes[],
  flawId: string,
  flawName: string,
  text: string,
) {
  notes.push({ flawId, flawName, text });
}

/** Aggregiert numerische und situative Makel-Effekte aus gewählten Makeln. */
export function applyFlawModifiers(flaws: CharacterFlawEntry[]): FlawModifiers {
  const result: FlawModifiers = {
    abilityScoreDelta: {},
    skillBonus: {},
    savingThrowBonus: {},
    initiative: 0,
    speed: 0,
    passivePerception: 0,
    notes: [],
  };

  for (const entry of flaws) {
    const def = getFlawById(entry.flawId);
    if (!def) continue;

    switch (def.id) {
      case "burn_scars":
        addAbilityDelta(result.abilityScoreDelta, "cha", -1);
        addSkillBonus(result.skillBonus, "itm", 2);
        addNote(result.notes, def.id, def.name, "Nachteil auf Überzeugen (sichtbare Narben)");
        break;
      case "chronic_limp":
        result.speed -= 5;
        addSkillBonus(result.skillBonus, "med", 2);
        addNote(result.notes, def.id, def.name, "Nachteil auf Akrobatik");
        break;
      case "one_eyed":
        addSkillBonus(result.skillBonus, "prc", -2);
        addNote(
          result.notes,
          def.id,
          def.name,
          "Nachteil Fernkampf (weite Reichweite); +1 passive Wahrnehmung gegen Hinterhalte (situationsabhängig)",
        );
        break;
      case "shaking_hands":
        addSkillBonus(result.skillBonus, "slt", -3);
        addNote(result.notes, def.id, def.name, "−1 Fernkampf-Schadenswürfe; −3 Diebeswerkzeug");
        break;
      case "damaged_voice":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Keine verbalen Zauberkomponenten bei eingeschränkter Bewegung; Nachteil auf Auftreten",
        );
        break;
      case "deep_paranoia":
        result.initiative += 2;
        addSkillBonus(result.skillBonus, "per", -2);
        addNote(
          result.notes,
          def.id,
          def.name,
          "−2 gegen Verängstigt; nicht überraschbar bei Bewusstsein",
        );
        break;
      case "claustrophobia":
        addNote(
          result.notes,
          def.id,
          def.name,
          "In Räumen < 10 Fuß: Nachteil auf Proben und Angriffe; +2 Initiative in engen Räumen (situationsabhängig)",
        );
        break;
      case "glass_bones":
        addSaveBonus(result.savingThrowBonus, "dex", 1);
        addNote(
          result.notes,
          def.id,
          def.name,
          "Doppelter Fallschaden; bei Wuchtschaden > halbe max. TP: 1 Runde betäubt",
        );
        break;
      case "night_blindness":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Keine Dunkelsicht; in Dämmerung Abzüge wie totale Dunkelheit; immun gegen Blendeffekte",
        );
        break;
      case "hard_of_hearing":
        result.initiative -= 2;
        addNote(
          result.notes,
          def.id,
          def.name,
          "Nachteil auf hörbasierte Wahrnehmung; Resistenz gegen Schallschaden",
        );
        break;
      case "weak_immune":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Nachteil auf Konstitutions-Rettungswürfe gegen Gifte, Krankheiten und Vergiftet; Vorteil Überleben (Kräuter)",
        );
        break;
      case "acrophobia":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Über 20 Fuß mit sichtbarer Tiefe: Zustand Verängstigt; +2 Wahrnehmung auf Strukturen (situationsabhängig)",
        );
        break;
      case "phantom_pain":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Kampfbeginn W20: Bei 1 keine Bonusaktion in Runde 1; Vorteil gegen Folter/Schmerz",
        );
        break;
      case "superstition":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Bei schlechtem Omen: 10 Min. Nachteil auf nächsten Rettungswurf; +2 gegen Flüche",
        );
        break;
      case "animal_dread":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Nachteil Animal Handling; Bestien überraschen dich nie",
        );
        break;
      case "short_breath":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Nachteil gegen Erschöpfung durch Reisen/Hitze; Spurt als Bonusaktion (1×/kurze Rast)",
        );
        break;
      case "color_blind":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Automatisches Scheitern bei farbabhängigen Proben; immun gegen farbbasierte Illusionen",
        );
        break;
      case "arcane_static":
        for (const key of ["int", "wis", "cha"] as AbilityKey[]) {
          addSaveBonus(result.savingThrowBonus, key, 1);
        }
        addNote(
          result.notes,
          def.id,
          def.name,
          "Beim Zaubern W20: Bei 1 flackert der Zauber wirkungslos",
        );
        break;
      case "glory_hunger":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Bei öffentlicher Beleidigung: WIS SG 13 oder Herausforderung annehmen; +2 Rettungswürfe vor Publikum (situationsabhängig)",
        );
        break;
      case "cold_shiver":
        addNote(
          result.notes,
          def.id,
          def.name,
          "Unter Gefrierpunkt: Nachteil auf physische Angriffswürfe; Resistenz Kälteschaden",
        );
        break;
      default:
        break;
    }
  }

  return result;
}

export type FlawAdjustedSheet = {
  derived: Dnd5eDerivedSheet;
  displaySpeed: number;
  passivePerception: number;
  flawNotes: FlawModifierNotes[];
  hasFlawAdjustments: boolean;
};

/** Wendet Makel-Modifikatoren auf abgeleitete Blattwerte an (nur Anzeige, keine Speicherung). */
export function applyFlawModifiersToDerived(
  derived: Dnd5eDerivedSheet,
  baseSpeed: number,
  flaws: CharacterFlawEntry[],
): FlawAdjustedSheet {
  const mods = applyFlawModifiers(flaws);

  const abilities = { ...derived.abilities };
  for (const key of Object.keys(abilities) as AbilityKey[]) {
    const scoreDelta = mods.abilityScoreDelta[key] ?? 0;
    if (scoreDelta !== 0) {
      const adjustedScore = abilities[key].score + scoreDelta;
      abilities[key] = {
        score: abilities[key].score,
        modifier: abilityModifier(adjustedScore),
      };
    }
  }

  const savingThrows = { ...derived.savingThrows };
  for (const key of Object.keys(savingThrows) as AbilityKey[]) {
    const saveBonus = mods.savingThrowBonus[key] ?? 0;
    const abilityMod = abilities[key].modifier;
    if (saveBonus !== 0 || abilityMod !== derived.abilities[key].modifier) {
      const baseTotal = savingThrows[key].total;
      const abilityDelta = abilityMod - derived.abilities[key].modifier;
      savingThrows[key] = {
        ...savingThrows[key],
        modifier: abilityMod,
        total: baseTotal + abilityDelta + saveBonus,
      };
    }
  }

  const skills = { ...derived.skills };
  for (const key of Object.keys(skills) as Dnd5eSkillKey[]) {
    const skillBonus = mods.skillBonus[key] ?? 0;
    const abilityKey = skills[key].ability;
    const abilityMod = abilities[abilityKey].modifier;
    const abilityDelta = abilityMod - derived.abilities[abilityKey].modifier;
    if (skillBonus !== 0 || abilityDelta !== 0) {
      skills[key] = {
        ...skills[key],
        modifier: abilityMod,
        total: skills[key].total + abilityDelta + skillBonus,
      };
    }
  }

  const initiative = derived.initiative + mods.initiative;
  const displaySpeed = Math.max(0, baseSpeed + mods.speed);
  const passivePerception =
    10 + (skills.prc?.total ?? derived.skills.prc.total) + mods.passivePerception;

  const hasFlawAdjustments =
    mods.initiative !== 0 ||
    mods.speed !== 0 ||
    mods.passivePerception !== 0 ||
    Object.keys(mods.abilityScoreDelta).length > 0 ||
    Object.keys(mods.skillBonus).length > 0 ||
    Object.keys(mods.savingThrowBonus).length > 0;

  return {
    derived: {
      ...derived,
      abilities,
      savingThrows,
      skills,
      initiative,
    },
    displaySpeed,
    passivePerception,
    flawNotes: mods.notes,
    hasFlawAdjustments,
  };
}
