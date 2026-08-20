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
import { parseRollCommand, formatDicePoolFormula, type DicePoolGroup, type DiceRollMode } from "@/src/lib/session/dice-roll";
import { requestLiveDiceRoll } from "@/src/lib/actions/session-dice-actions";
import { requestDiceDropPlacement } from "@/src/lib/session/dice-placement-store";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import type { CharacterSheetPayload } from "@/src/lib/characters/dnd5e/types";
import type { Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";

function sheetDerivedForRolls(payload: CharacterSheetPayload) {
  const base = computeDerivedDnd5eSheet(payload.sheet, payload.level);
  const flaws = payload.characterFlaws ?? [];
  return applyFlawModifiersToDerived(base, payload.sheet.combat.speed, flaws).derived;
}

type UseLiveSessionDiceRollOptions = {
  sessionId: string;
  campaignId: string;
  currentCharacter: { id: string; name: string } | null;
  /** Panel sichtbar — Charakterbogen für Angriff/Fertigkeit laden. */
  active: boolean;
  onActivityPosted?: (entry: SessionActivityEntry) => void;
};

export function useLiveSessionDiceRoll({
  sessionId,
  campaignId,
  currentCharacter,
  active,
  onActivityPosted,
}: UseLiveSessionDiceRollOptions) {
  const [rollMode, setRollMode] = useState<DiceRollMode>("normal");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [skillBonus, setSkillBonus] = useState(0);
  const [selectedSave, setSelectedSave] = useState<AbilityKey | "">("");
  const [saveBonus, setSaveBonus] = useState(0);
  const [primaryAttack, setPrimaryAttack] = useState<WeaponAttackPreview | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!active || !currentCharacter) return;
    void Promise.all([
      loadDnd5eCharacterSheet(campaignId, currentCharacter.id),
      getCharacterEquipmentPayload(currentCharacter.id),
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
  }, [campaignId, currentCharacter, active, selectedSkill, selectedSave]);

  function postLiveDiceRoll(
    input: Omit<
      Parameters<typeof requestLiveDiceRoll>[0],
      "sessionId" | "characterId" | "characterName"
    >,
  ) {
    if (!currentCharacter) {
      toast.error("Kein Charakter ausgewählt.");
      return;
    }
    const characterId = currentCharacter.id;
    const characterName = currentCharacter.name;
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
          dropNx,
          dropNy,
          throwDirX,
          throwDirZ,
          throwStrength,
          isTap,
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
    });
  }

  function rollPool(groups: DicePoolGroup[], mode: DiceRollMode = rollMode) {
    const total = groups.reduce((s, g) => s + g.count, 0);
    if (total <= 0) return;
    postLiveDiceRoll({
      kind: "dice",
      dice: total,
      sides: groups[0]?.sides ?? 20,
      diceGroups: groups,
      mode,
      label: formatDicePoolFormula(groups),
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
    });
    return true;
  }

  function handleSkillCheck() {
    if (!currentCharacter || !selectedSkill) return;
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
    });
  }

  function handleSavingThrow() {
    if (!currentCharacter || !selectedSave) return;
    postLiveDiceRoll({
      kind: "save",
      dice: 1,
      sides: 20,
      modifier: saveBonus,
      mode: rollMode,
      label: `${ABILITY_LABELS_DE[selectedSave]}-Rettungswurf`,
      saveAbility: selectedSave,
    });
  }

  function handleAttackRoll() {
    if (!currentCharacter) return;
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
    if (!currentCharacter || !value) {
      setSkillBonus(0);
      return;
    }
    void loadDnd5eCharacterSheet(campaignId, currentCharacter.id).then((payload) => {
      if (!payload) return;
      const derived = sheetDerivedForRolls(payload);
      setSkillBonus(derived.skills[value as Dnd5eSkillKey]?.total ?? 0);
    });
  }

  function onSaveChange(value: AbilityKey | "") {
    setSelectedSave(value);
    if (!currentCharacter || !value) {
      setSaveBonus(0);
      return;
    }
    void loadDnd5eCharacterSheet(campaignId, currentCharacter.id).then((payload) => {
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
    primaryAttack,
    pending,
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
