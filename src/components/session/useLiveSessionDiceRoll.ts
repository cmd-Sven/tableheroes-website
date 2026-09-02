"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { getCharacterEquipmentPayload } from "@/src/lib/actions/character-inventory-actions";
import { loadDnd5eCharacterSheet } from "@/src/app/dashboard/campaigns/[id]/character-sheet-actions";
import { applyLiveSessionWeaponPreset } from "@/src/lib/actions/live-session-avatar-actions";
import { DND5E_SKILLS } from "@/src/lib/characters/dnd5e/skills";
import { ABILITY_LABELS_DE, ABILITY_KEYS, type AbilityKey } from "@/src/lib/characters/dnd5e/types";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import {
  computeEquippedWeaponAttacks,
  type WeaponAttackPreview,
} from "@/src/lib/characters/dnd5e/equipment";
import {
  parseRollCommand,
  formatDicePoolFormula,
  parseBonusMalus,
  type DicePoolGroup,
  type DiceRollMode,
} from "@/src/lib/session/dice-roll";
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

export type PendingDamageRoll = {
  requestId: string;
  damage: string;
  weaponName: string;
  critical: boolean;
};

type ActivityLogLike = {
  id: string;
  type?: string;
  character_id?: string;
  meta?: Record<string, unknown>;
};

type UseLiveSessionDiceRollOptions = {
  sessionId: string;
  campaignId: string;
  currentCharacter: DiceRoller | null;
  /** Aktiver Werfer — PC oder SL-Sentinel (__gm__). */
  roller: DiceRoller | null;
  /** Panel sichtbar — Charakterbogen für Angriff/Fertigkeit laden. */
  active: boolean;
  activityLogs?: ActivityLogLike[];
  onActivityPosted?: (entry: SessionActivityEntry) => void;
  userId?: string | null;
  isGM?: boolean;
  /** Überschreibt den Hook-Skin (z. B. wenn Palette separat gesteuert wird). */
  diceSkinId?: DiceSkinId;
};

function normalizeCharacterId(id: string | undefined): string {
  return id?.trim().toLowerCase() ?? "";
}

function resolveDamageFormula(
  meta: Record<string, unknown> | undefined,
  attackPendingById: Map<string, Record<string, unknown>>,
  requestId: string,
): string | null {
  const direct = meta?.damage;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return String(direct);
  }
  const pendingMeta = attackPendingById.get(requestId);
  const fallback = pendingMeta?.damage;
  if (typeof fallback === "string" && fallback.trim()) return fallback.trim();
  if (typeof fallback === "number" && Number.isFinite(fallback)) {
    return String(fallback);
  }
  return null;
}

function computePendingDamageRolls(
  logs: ActivityLogLike[],
  rollerId: string | undefined,
): PendingDamageRoll[] {
  const normalizedRollerId = normalizeCharacterId(rollerId);
  if (!normalizedRollerId || isGmDiceRollerId(rollerId)) return [];

  const rolled = new Set<string>();
  const attackPendingById = new Map<string, Record<string, unknown>>();
  for (const log of logs) {
    if (log.type === "damage_roll" && log.meta?.requestId) {
      rolled.add(String(log.meta.requestId));
    }
    if (log.type === "attack_pending" && log.meta && typeof log.meta === "object") {
      attackPendingById.set(log.id, log.meta);
    }
  }

  const pending: PendingDamageRoll[] = [];
  for (const log of logs) {
    if (log.type !== "attack_hit") continue;
    if (normalizeCharacterId(log.character_id) !== normalizedRollerId) continue;
    const meta = log.meta as
      | {
          awaitsDamageRoll?: boolean;
          hit?: boolean;
          damage?: string | number;
          weaponName?: string;
          critical?: boolean;
          requestId?: string;
        }
      | undefined;
    const awaitsDamage = meta?.awaitsDamageRoll ?? meta?.hit ?? true;
    if (!awaitsDamage) continue;
    const requestId = String(meta?.requestId ?? log.id);
    if (rolled.has(requestId)) continue;
    const damage = resolveDamageFormula(
      meta as Record<string, unknown> | undefined,
      attackPendingById,
      requestId,
    );
    if (!damage) continue;
    const pendingMeta = attackPendingById.get(requestId);
    pending.push({
      requestId,
      damage,
      weaponName:
        (typeof meta?.weaponName === "string" && meta.weaponName) ||
        (typeof pendingMeta?.weaponName === "string" && pendingMeta.weaponName) ||
        "Waffe",
      critical: Boolean(meta?.critical),
    });
  }
  return pending;
}

export function useLiveSessionDiceRoll({
  sessionId,
  campaignId,
  currentCharacter,
  roller,
  active,
  activityLogs = [],
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
  const [weaponAttacks, setWeaponAttacks] = useState<WeaponAttackPreview[]>([]);
  const [selectedAttackIndex, setSelectedAttackIndex] = useState(0);
  const [weaponPresets, setWeaponPresets] = useState<{ id: string; name: string }[]>([]);
  const [bonusMalusInput, setBonusMalusInput] = useState("");
  const [pending, startTransition] = useTransition();
  const { skinId: storedSkinId, setSkinId } = useDiceSkin(userId, isGM);
  const skinId = diceSkinIdProp ?? storedSkinId;
  const bonusMalus = parseBonusMalus(bonusMalusInput);

  const selectedAttack =
    weaponAttacks[selectedAttackIndex] ?? weaponAttacks[0] ?? null;

  const pendingDamageRolls = useMemo(
    () => computePendingDamageRolls(activityLogs, roller?.id),
    [activityLogs, roller?.id],
  );

  const reloadWeaponData = useCallback(async (characterId: string) => {
    const [payload, equip] = await Promise.all([
      loadDnd5eCharacterSheet(campaignId, characterId),
      getCharacterEquipmentPayload(characterId),
    ]);
    if (!payload) return;
    const derived = sheetDerivedForRolls(payload);
    const attacks = computeEquippedWeaponAttacks(
      payload.sheet,
      derived,
      equip.items.filter((i) => !i.is_deleted),
      equip.equipment,
      payload.level,
    );
    setWeaponAttacks(attacks);
    setSelectedAttackIndex(0);
    setWeaponPresets(
      (equip.equipment.weaponPresets ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    );
    if (selectedSkill) {
      setSkillBonus(derived.skills[selectedSkill as Dnd5eSkillKey]?.total ?? 0);
    }
    if (selectedSave) {
      setSaveBonus(derived.savingThrows[selectedSave]?.total ?? 0);
    }
  }, [campaignId, selectedSave, selectedSkill]);

  useEffect(() => {
    if (!rollingAsGm) return;
    setSelectedSkill("");
    setSkillBonus(0);
    setSelectedSave("");
    setSaveBonus(0);
    setWeaponAttacks([]);
    setSelectedAttackIndex(0);
    setWeaponPresets([]);
  }, [rollingAsGm]);

  useEffect(() => {
    if (!active || !sheetCharacter) return;
    void reloadWeaponData(sheetCharacter.id);
  }, [active, sheetCharacter, reloadWeaponData]);

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
    if (!sheetCharacter || !selectedAttack) return;
    const bonus = selectedAttack.attackBonus;
    postLiveDiceRoll({
      kind: "attack",
      dice: 1,
      sides: 20,
      modifier: bonus,
      mode: rollMode,
      weaponName: selectedAttack.name,
      damage: selectedAttack.damage,
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
    if (!sheetCharacter || !damageFormula) {
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
      bonusMalus,
    });
  }

  function switchWeaponPreset(presetId: string) {
    if (!sheetCharacter || !presetId) return;
    startTransition(async () => {
      try {
        await applyLiveSessionWeaponPreset({
          sessionId,
          characterId: sheetCharacter.id,
          characterName: sheetCharacter.name,
          presetId,
        });
        await reloadWeaponData(sheetCharacter.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Waffenwechsel fehlgeschlagen.");
      }
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
    selectedAttack: rollingAsGm ? null : selectedAttack,
    weaponAttacks: rollingAsGm ? [] : weaponAttacks,
    selectedAttackIndex,
    setSelectedAttackIndex,
    weaponPresets: rollingAsGm ? [] : weaponPresets,
    switchWeaponPreset,
    pendingDamageRolls,
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
    /** @deprecated Alias für selectedAttack */
    primaryAttack: rollingAsGm ? null : selectedAttack,
  };
}
