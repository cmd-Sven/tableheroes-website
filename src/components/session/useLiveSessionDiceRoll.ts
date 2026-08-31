"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getCharacterEquipmentPayload } from "@/src/lib/actions/character-inventory-actions";
import { loadDnd5eCharacterSheet } from "@/src/app/dashboard/campaigns/[id]/character-sheet-actions";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import { ABILITY_LABELS_DE, ABILITY_KEYS, type AbilityKey } from "@/src/lib/characters/dnd5e/types";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import {
  computeEquippedWeaponAttacks,
  type WeaponAttackPreview,
} from "@/src/lib/characters/dnd5e/equipment";
import { parseRollCommand, formatDicePoolFormula, parseBonusMalus, type DicePoolGroup, type DiceRollMode } from "@/src/lib/session/dice-roll";
import { requestLiveDiceRoll } from "@/src/lib/actions/session-dice-actions";
import { requestDiceDropPlacement } from "@/src/lib/session/dice-placement-store";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import type { CharacterSheetPayload } from "@/src/lib/characters/dnd5e/types";
import type { Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import { useDiceSkin } from "@/src/hooks/useDiceSkin";
import { isGmDiceRollerId, type DiceSkinId } from "@/src/lib/session/dice-skins";

function sheetDerivedForRolls(payload: CharacterSheetPayload) {
  const base = computeDerivedDnd5eSheet(payload.sheet, payload.level);
  const flaws = payload.characterFlaws ?? [];
  return applyFlawModifiersToDerived(base, payload.sheet.combat.speed, flaws).derived;
}

type DiceRoller = { id: string; name: string };

type UseLiveSessionDiceRollOptions = {
  sessionId: string;
  campaignId: string;
  currentCharacter: DiceRoller | null;
  /** Aktiver Werfer — PC oder SL-Sentinel (__gm__). */
  roller: DiceRoller | null;
  /** Panel sichtbar — Charakterbogen für Angriff/Fertigkeit laden. */
  active: boolean;
  onActivityPosted?: (entry: SessionActivityEntry) => void;
  userId?: string | null;
  isGM?: boolean;
  /** Überschreibt den Hook-Skin (z. B. wenn Palette separat gesteuert wird). */
  diceSkinId?: DiceSkinId;
};

export function useLiveSessionDiceRoll({
  sessionId,
  campaignId,
  currentCharacter,
  roller,
  active,
  onActivityPosted,
  userId = null,
  isGM = false,
  diceSkinId: diceSkinIdProp,
}: UseLiveSessionDiceRollOptions) {
  const rollingAsGm = isGmDiceRollerId(roller?.id);
  const sheetCharacter = rollingAsGm ? null : roller;

  const [rollMode, setRollMode] = useState<DiceRollMode>("normal");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [skillBonus, setSkillBonus] = useState(0);
  const [selectedSave, setSelectedSave] = useState<AbilityKey | "">("");
  const [saveBonus, setSaveBonus] = useState(0);
  const [primaryAttack, setPrimaryAttack] = useState<WeaponAttackPreview | null>(null);
  const [bonusMalusInput, setBonusMalusInput] = useState("");
  const [pending, startTransition] = useTransition();
  const { skinId: storedSkinId, setSkinId } = useDiceSkin(userId, isGM);
  const skinId = diceSkinIdProp ?? storedSkinId;
  const bonusMalus = parseBonusMalus(bonusMalusInput);

  useEffect(() => {
    if (!rollingAsGm) return;
    setSelectedSkill("");
    setSkillBonus(0);
    setSelectedSave("");
    setSaveBonus(0);
    setPrimaryAttack(null);
  }, [rollingAsGm]);

  useEffect(() => {
    if (!active || !sheetCharacter) return;
    void Promise.all([
      loadDnd5eCharacterSheet(campaignId, sheetCharacter.id),
      getCharacterEquipmentPayload(sheetCharacter.id),
    ]).then(([payload, equip]) => {
      if (!payload) return;
      const derived = sheetDerivedForRolls(payload);
      const attacks = computeEquippedWeaponAttacks(
        payload.sheet,
        derived,
        equip.items.filter((i) => !i.is_deleted),
        equip.equipment,
        payload.level,
      );
      setPrimaryAttack(attacks[0] ?? null);
      if (selectedSkill) {
        setSkillBonus(derived.skills[selectedSkill as Dnd5eSkillKey]?.total ?? 0);
      }
      if (selectedSave) {
        setSaveBonus(derived.savingThrows[selectedSave]?.total ?? 0);
      }
    });
  }, [campaignId, sheetCharacter, active, selectedSkill, selectedSave]);

  function postLiveDiceRoll(
    input: Omit<
      Parameters<typeof requestLiveDiceRoll>[0],
      "sessionId" | "characterId" | "characterName"
    >,
  ) {
    if (!roller) {
      toast.error("Kein Werfer ausgewählt.");
      return;
    }
    if (
      rollingAsGm &&
      input.kind !== "dice" &&
      input.kind !== "damage"
    ) {
      toast.error("Als Spielleiter nur Pool-Würfe — kein Bogen nötig.");
      return;
    }
    const characterId = roller.id;
    const characterName = roller.name;
    startTransition(async () => {
      try {
        let dropNx: number | undefined;
        let dropNy: number | undefined;
        let throwDirX: number | undefined;
        let throwDirZ: number | undefined;
        let throwStrength: number | undefined;
        let isTap: boolean | undefined;
        try {
        const drop = await requestDiceDropPlacement({
            sides: input.sides,
            count: input.diceGroups
              ? input.diceGroups.reduce((s, g) => s + g.count, 0)
              : input.dice,
          });
          dropNx = drop.dropNx;
          dropNy = drop.dropNy;
          throwDirX = drop.throwDirX;
          throwDirZ = drop.throwDirZ;
          throwStrength = drop.throwStrength;
          isTap = drop.isTap;
        } catch {
          return;
        }
        const entry = await requestLiveDiceRoll({
          sessionId,
          characterId,
          characterName,
          ...input,
          bonusMalus: input.bonusMalus ?? bonusMalus,
          dropNx,
          dropNy,
          throwDirX,
          throwDirZ,
          throwStrength,
          isTap,
          diceSkin: skinId,
        });
        onActivityPosted?.(entry);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Wurf fehlgeschlagen.");
      }
    });
  }

  function rollDice(sides: number, mode: DiceRollMode = rollMode, modifier = 0) {
    postLiveDiceRoll({
      kind: "dice",
      dice: 1,
      sides,
      modifier,
      mode,
      bonusMalus: sides === 20 ? bonusMalus : 0,
    });
  }

  function rollPool(groups: DicePoolGroup[], mode: DiceRollMode = rollMode) {
    const total = groups.reduce((s, g) => s + g.count, 0);
    if (total <= 0) return;
    const hasD20 = groups.some((g) => g.sides === 20 && g.count > 0);
    postLiveDiceRoll({
      kind: "dice",
      dice: total,
      sides: groups[0]?.sides ?? 20,
      diceGroups: groups,
      mode,
      label: formatDicePoolFormula(groups, hasD20 ? bonusMalus : 0),
      bonusMalus: hasD20 ? bonusMalus : 0,
    });
  }

  function rollFromCommand(trimmed: string) {
    const parsed = parseRollCommand(trimmed);
    if (!parsed) return false;
    postLiveDiceRoll({
      kind: "dice",
      dice: parsed.dice,
      sides: parsed.sides,
      modifier: parsed.modifier,
      mode: rollMode,
      label: parsed.dice > 1 ? `${parsed.dice}d${parsed.sides}` : undefined,
      bonusMalus: parsed.sides === 20 ? bonusMalus : 0,
    });
    return true;
  }

  function handleSkillCheck() {
    if (rollingAsGm) {
      toast.error("Fertigkeitswürfe brauchen einen Charakter — nicht als Spielleiter.");
      return;
    }
    if (!sheetCharacter || !selectedSkill) return;
    const def = DND5E_SKILLS.find((s) => s.key === selectedSkill);
    const label = def?.labelDe ?? selectedSkill;
    postLiveDiceRoll({
      kind: "skill",
      dice: 1,
      sides: 20,
      modifier: skillBonus,
      mode: rollMode,
      label,
      skillKey: selectedSkill,
      bonusMalus,
    });
  }

  function handleSavingThrow() {
    if (rollingAsGm) {
      toast.error("Rettungswürfe brauchen einen Charakter — nicht als Spielleiter.");
      return;
    }
    if (!sheetCharacter || !selectedSave) return;
    postLiveDiceRoll({
      kind: "save",
      dice: 1,
      sides: 20,
      modifier: saveBonus,
      mode: rollMode,
      label: `${ABILITY_LABELS_DE[selectedSave]}-Rettungswurf`,
      saveAbility: selectedSave,
      bonusMalus,
    });
  }

  function handleAttackRoll() {
    if (rollingAsGm) {
      toast.error("Angriffswürfe brauchen einen Charakter — nicht als Spielleiter.");
      return;
    }
    if (!sheetCharacter) return;
    const bonus = primaryAttack?.attackBonus ?? 0;
    const weaponName = primaryAttack?.name ?? "Waffe";
    postLiveDiceRoll({
      kind: "attack",
      dice: 1,
      sides: 20,
      modifier: bonus,
      mode: rollMode,
      weaponName,
      damage: primaryAttack?.damage ?? null,
      attackBonus: bonus,
      bonusMalus,
    });
  }

  function handleDamageRoll(
    damageFormula: string | null | undefined,
    critical: boolean,
    requestId?: string,
    weaponName?: string,
  ) {
    if (!currentCharacter || !damageFormula) {
      toast.error("Kein Schadenswert für diese Waffe hinterlegt.");
      return;
    }
    const parsed = parseRollCommand(damageFormula.replace(/\s+/g, ""));
    if (!parsed) {
      toast.error(`Schaden „${damageFormula}" konnte nicht gelesen werden.`);
      return;
    }
    const diceCount = critical ? parsed.dice * 2 : parsed.dice;
    postLiveDiceRoll({
      kind: "damage",
      dice: diceCount,
      sides: parsed.sides,
      modifier: parsed.modifier,
      mode: "normal",
      critical,
      requestId,
      damageFormula,
      weaponName,
    });
  }

  function onSkillChange(value: string) {
    setSelectedSkill(value);
    if (!sheetCharacter || !value) {
      setSkillBonus(0);
      return;
    }
    void loadDnd5eCharacterSheet(campaignId, sheetCharacter.id).then((payload) => {
      if (!payload) return;
      const derived = sheetDerivedForRolls(payload);
      setSkillBonus(derived.skills[value as Dnd5eSkillKey]?.total ?? 0);
    });
  }

  function onSaveChange(value: AbilityKey | "") {
    setSelectedSave(value);
    if (!sheetCharacter || !value) {
      setSaveBonus(0);
      return;
    }
    void loadDnd5eCharacterSheet(campaignId, sheetCharacter.id).then((payload) => {
      if (!payload) return;
      const derived = sheetDerivedForRolls(payload);
      setSaveBonus(derived.savingThrows[value]?.total ?? 0);
    });
  }

  return {
    rollMode,
    setRollMode,
    selectedSkill,
    skillBonus,
    selectedSave,
    saveBonus,
    primaryAttack: rollingAsGm ? null : primaryAttack,
    bonusMalus,
    bonusMalusInput,
    setBonusMalusInput,
    pending,
    rollingAsGm,
    canRoll: Boolean(roller),
    skinId,
    setSkinId,
    rollDice,
    rollPool,
    rollFromCommand,
    handleSkillCheck,
    handleSavingThrow,
    handleAttackRoll,
    handleDamageRoll,
    onSkillChange,
    onSaveChange,
    skillOptions: DND5E_SKILLS,
    saveOptions: ABILITY_KEYS,
  };
}
