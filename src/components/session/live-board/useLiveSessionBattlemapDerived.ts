/**
 * useLiveSessionBattlemapDerived — Visible tokens/props and HP/display memos for the battlemap stage.
 */
"use client";

import { useMemo } from "react";
import { parseNpcSheetData } from "@/src/lib/npcs/npc-sheet-types";
import { useBattlemapCharacterDisplays } from "@/src/components/session/battlemap/useBattlemapCharacterDisplays";
import type { CampaignNpc } from "./live-session-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type Params = {
  campaignId: string;
  isGM: boolean;
  campaignNpcs: CampaignNpc[];
  bm: LiveSessionBattlemapState;
};

export function useLiveSessionBattlemapDerived({
  campaignId,
  isGM,
  campaignNpcs,
  bm,
}: Params) {
  const { battlemapActive, battlemapTokens, battlemapProps } = bm;

  const visibleBattlemapTokens = useMemo(
    () =>
      isGM ? battlemapTokens : battlemapTokens.filter((t) => t.is_visible_to_players),
    [battlemapTokens, isGM],
  );

  const battlemapNpcHpByRef = useMemo(() => {
    const map: Record<string, { current: number; max: number }> = {};
    for (const npc of campaignNpcs) {
      const sheet = parseNpcSheetData(npc.sheet_data);
      if (sheet?.combat?.hpMax) {
        map[`npc:${npc.id}`] = {
          current: sheet.combat.hpCurrent ?? sheet.combat.hpMax,
          max: sheet.combat.hpMax,
        };
      }
    }
    return map;
  }, [campaignNpcs]);

  const battlemapCharacterIds = useMemo(
    () =>
      visibleBattlemapTokens
        .map((t) => t.character_id)
        .filter((id): id is string => Boolean(id)),
    [visibleBattlemapTokens],
  );

  const { displays: battlemapCharDisplays, rollFxUrlByCharacterId } =
    useBattlemapCharacterDisplays(battlemapCharacterIds, {
      campaignId,
      enabled: battlemapActive,
    });

  const characterDisplayUrlById = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const id of battlemapCharacterIds) {
      map[id] =
        rollFxUrlByCharacterId[id] ?? battlemapCharDisplays[id]?.url ?? null;
    }
    return map;
  }, [battlemapCharacterIds, battlemapCharDisplays, rollFxUrlByCharacterId]);

  const characterConditionsById = useMemo(() => {
    const map: Record<
      string,
      NonNullable<(typeof battlemapCharDisplays)[string]>["activeConditions"]
    > = {};
    for (const id of battlemapCharacterIds) {
      map[id] = battlemapCharDisplays[id]?.activeConditions ?? [];
    }
    return map;
  }, [battlemapCharacterIds, battlemapCharDisplays]);

  const battlemapTokenHpByRef = useMemo(() => {
    const map: Record<string, { current: number; max: number }> = {
      ...battlemapNpcHpByRef,
    };
    for (const id of battlemapCharacterIds) {
      const d = battlemapCharDisplays[id];
      if (d && d.hpMax > 0) {
        map[`char:${id}`] = { current: d.hpCurrent, max: d.hpMax };
      }
    }
    return map;
  }, [battlemapCharacterIds, battlemapCharDisplays, battlemapNpcHpByRef]);

  const visibleBattlemapProps = useMemo(
    () => (isGM ? battlemapProps : battlemapProps.filter((p) => p.is_visible_to_players)),
    [battlemapProps, isGM],
  );

  return {
    visibleBattlemapTokens,
    visibleBattlemapProps,
    battlemapTokenHpByRef,
    characterDisplayUrlById,
    characterConditionsById,
    battlemapCharDisplays,
  };
}
