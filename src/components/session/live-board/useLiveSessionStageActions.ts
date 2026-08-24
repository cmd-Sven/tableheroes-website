/**
 * useLiveSessionStageActions — Stage placement, NPC shop/reaction, scribe, and temperature commits.
 */
"use client";

import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  type TransitionStartFunction,
  useCallback,
} from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { setCampaignVisibility } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-actions";
import { logSceneMediaAppearance } from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import { updateNpcMerchantAssignment } from "@/src/app/dashboard/campaigns/[id]/shop-actions";
import { adjustNpcReputation } from "@/src/lib/actions/npc-reputation-actions";
import { npcReputationSmileyFromScore } from "@/src/lib/npc-reputation-smiley";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import { normalizeTemperatureValue } from "./live-session-weather";
import type {
  CampaignCreature,
  CampaignFaction,
  CampaignNpc,
  LiveState,
  StagePortraitModal,
} from "./live-session-types";

type Params = {
  isGM: boolean;
  campaignId: string;
  sessionId: string;
  liveStateRef: MutableRefObject<LiveState | null>;
  updateLiveState: (patch: Partial<LiveState>, baseOverride?: LiveState) => void;
  writeSystemLog: (type: string, text: string) => void;
  resolveLiveStateBase: () => Promise<LiveState | null>;
  allCampaignNpcs: CampaignNpc[];
  allCampaignCreatures: CampaignCreature[];
  allCampaignFactions: CampaignFaction[];
  allSceneMedia: StageSceneMediaItem[];
  showNpcReaction: (npcId: string, emoji: string) => void;
  setNpcReputationScores: Dispatch<SetStateAction<Record<string, number>>>;
  liveChannelRef: MutableRefObject<RealtimeChannel | null>;
  startTransition: TransitionStartFunction;
  startShopTransition: TransitionStartFunction;
  setNpcMerchantOverrides: Dispatch<
    SetStateAction<Record<string, { is_merchant: boolean; shop_id: string | null }>>
  >;
  setStagePortrait: Dispatch<SetStateAction<StagePortraitModal | null>>;
  router: AppRouterInstance;
  temperatureDraft: number;
};

export function useLiveSessionStageActions({
  isGM,
  campaignId,
  sessionId,
  liveStateRef,
  updateLiveState,
  writeSystemLog,
  resolveLiveStateBase,
  allCampaignNpcs,
  allCampaignCreatures,
  allCampaignFactions,
  allSceneMedia,
  showNpcReaction,
  setNpcReputationScores,
  liveChannelRef,
  startTransition,
  startShopTransition,
  setNpcMerchantOverrides,
  setStagePortrait,
  router,
  temperatureDraft,
}: Params) {
  const revealNpcOnCampaignIfNeeded = useCallback(
    async (npcId: string) => {
      const npc = allCampaignNpcs.find((entry) => String(entry.id) === npcId);
      if (!npc || npc.is_revealed === true) return;
      try {
        await setCampaignVisibility(campaignId, "npc", npcId, true);
        router.refresh();
      } catch (err) {
        console.error("[LiveSessionBoard] reveal NPC on stage:", err);
      }
    },
    [allCampaignNpcs, campaignId, router],
  );

  const revealCreatureOnCampaignIfNeeded = useCallback(
    async (creatureId: string) => {
      const creature = allCampaignCreatures.find((entry) => String(entry.id) === creatureId);
      if (!creature || creature.is_revealed === true) return;
      try {
        await setCampaignVisibility(campaignId, "bestarium", creatureId, true);
        router.refresh();
      } catch (err) {
        console.error("[LiveSessionBoard] reveal creature on stage:", err);
      }
    },
    [allCampaignCreatures, campaignId, router],
  );

  function placeOnStage(kind: "npc" | "faction" | "scene" | "creature", id: string) {
    void (async () => {
      const base = await resolveLiveStateBase();
      if (!base) {
        alert(
          isGM
            ? "Session-Zustand konnte noch nicht angelegt werden. Bitte nutze „Erneut initialisieren“ im Hinweisbanner oder lade die Seite neu."
            : "Session-Zustand ist noch nicht bereit. Bitte warte auf den Spielleiter.",
        );
        return;
      }
      const sid = String(id);
      if (kind === "scene") {
        if (!isGM) return;
        const scene = allSceneMedia.find((entry) => String(entry.id) === sid);
        if (!scene) return;
        updateLiveState({ active_scene_media_id: sid }, base);
        const npcIds = (base.visible_npc_ids || []).map(String);
        const locationLoreId = base.current_location_lore_id
          ? String(base.current_location_lore_id)
          : null;
        const locationName = base.current_location?.trim() || null;
        const locationHint = locationName ? ` (Ort: ${locationName})` : "";
        writeSystemLog(
          "scene_show",
          `Eine Szene wird auf der Bühne gezeigt: „${scene.title}“${locationHint}${npcIds.length > 0 ? ` (NSCs anwesend: ${npcIds.length})` : ""}.`,
        );
        try {
          await logSceneMediaAppearance({
            campaignId,
            sessionId,
            sceneMediaId: sid,
            npcIds,
            locationLoreId,
            locationName,
          });
        } catch (err) {
          console.error("[LiveSessionBoard] scene appearance log:", err);
        }
        setStagePortrait({
          name: scene.title,
          subtitle: scene.category,
          imageUrl: scene.image_url,
        });
        return;
      }
      if (kind === "npc") {
        const currentIds = new Set((base.visible_npc_ids || []).map(String));
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_npc_ids: Array.from(currentIds) }, base);
        const npc = allCampaignNpcs.find((entry) => String(entry.id) === sid);
        writeSystemLog(
          "stage_card",
          `Eine neue Präsenz betritt das Geschehen: ${npc?.name ?? "Unbekannt"}.`,
        );
        await revealNpcOnCampaignIfNeeded(sid);
      } else if (kind === "creature") {
        const currentIds = new Set((base.visible_creature_ids || []).map(String));
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_creature_ids: Array.from(currentIds) }, base);
        const creature = allCampaignCreatures.find((entry) => String(entry.id) === sid);
        const descHint = creature?.physical_description?.trim().slice(0, 220);
        const descLong = (creature?.physical_description?.trim().length ?? 0) > 220;
        writeSystemLog(
          "stage_card",
          descHint
            ? `Eine Kreatur betritt die Bühne: ${creature?.name ?? "Unbekannt"}. ${descHint}${descLong ? "…" : ""}`
            : `Eine Kreatur betritt die Bühne: ${creature?.name ?? "Unbekannt"}.`,
        );
        await revealCreatureOnCampaignIfNeeded(sid);
      } else {
        const currentIds = new Set(
          (base.visible_faction_ids || []).map(String),
        );
        if (currentIds.has(sid)) return;
        currentIds.add(sid);
        updateLiveState({ visible_faction_ids: Array.from(currentIds) }, base);
        const faction = allCampaignFactions.find((entry) => String(entry.id) === sid);
        writeSystemLog(
          "stage_card",
          `Eine neue Präsenz betritt das Geschehen: ${faction?.name ?? "Unbekannt"}.`,
        );
      }
    })();
  }

  function removeFromStage(kind: "npc" | "faction" | "scene" | "creature", id: string) {
    if (!isGM) return;
    const sid = String(id);
    const base = liveStateRef.current;
    if (!base) return;

    if (kind === "scene") {
      if (String(base.active_scene_media_id ?? "") !== sid) return;
      updateLiveState({ active_scene_media_id: null });
      const scene = allSceneMedia.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "scene_remove",
        `Die Szene „${scene?.title ?? "Unbekannt"}“ verlässt die Bühne.`,
      );
      return;
    }

    if (kind === "npc") {
      updateLiveState({
        visible_npc_ids: (base.visible_npc_ids || [])
          .map(String)
          .filter((npcId) => npcId !== sid),
      });
      const npc = allCampaignNpcs.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "stage_remove",
        `${npc?.name ?? "Ein NSC"} verlässt die Bühne.`,
      );
    } else if (kind === "creature") {
      updateLiveState({
        visible_creature_ids: (base.visible_creature_ids || [])
          .map(String)
          .filter((creatureId) => creatureId !== sid),
      });
      const creature = allCampaignCreatures.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "stage_remove",
        `${creature?.name ?? "Eine Kreatur"} verlässt die Bühne.`,
      );
    } else {
      updateLiveState({
        visible_faction_ids: (base.visible_faction_ids || [])
          .map(String)
          .filter((factionId) => factionId !== sid),
      });
      const faction = allCampaignFactions.find((entry) => String(entry.id) === sid);
      writeSystemLog(
        "stage_remove",
        `${faction?.name ?? "Eine Fraktion"} verlässt die Bühne.`,
      );
    }
  }

  function handleNpcReaction(npcId: string, amount: number) {
    if (!isGM) return;
    startTransition(async () => {
      try {
        const row = await adjustNpcReputation(campaignId, npcId, amount);
        const emoji = npcReputationSmileyFromScore(row.reputation_score);
        setNpcReputationScores((current) => ({
          ...current,
          [npcId]: row.reputation_score,
        }));
        showNpcReaction(npcId, emoji);
        await liveChannelRef.current?.send({
          type: "broadcast",
          event: "npc_reaction",
          payload: { npcId, scoreAfter: row.reputation_score },
        });
      } catch (err: any) {
        console.error("[LiveSessionBoard] adjustNpcReputation:", err);
        alert(err?.message || "NPC-Reaktion konnte nicht gesendet werden.");
      }
    });
  }

  function toggleShopForNpc(npc: CampaignNpc) {
    if (!isGM || !npc.is_merchant || !npc.shop_id) return;

    const shopIsOpen =
      liveStateRef.current?.active_shop_id === npc.shop_id &&
      liveStateRef.current?.active_merchant_npc_id === String(npc.id);

    if (shopIsOpen) {
      updateLiveState({ active_shop_id: null, active_merchant_npc_id: null });
      writeSystemLog("shop", `${npc.name} schließt den Handel.`);
      return;
    }

    updateLiveState({
      active_shop_id: npc.shop_id,
      active_merchant_npc_id: String(npc.id),
    });
    writeSystemLog("shop", `${npc.name} öffnet den Shop für die Gruppe.`);
  }

  function assignMerchantAndOpenShop(npc: CampaignNpc, shopId: string) {
    if (!isGM) return;
    const npcId = String(npc.id);
    const trimmedShopId = shopId.trim();
    if (!trimmedShopId) return;

    startShopTransition(async () => {
      try {
        const result = await updateNpcMerchantAssignment(
          campaignId,
          npcId,
          true,
          trimmedShopId,
        );
        if (!result.success) {
          alert(result.error || "Händler konnte nicht zugewiesen werden.");
          return;
        }

        setNpcMerchantOverrides((current) => ({
          ...current,
          [npcId]: { is_merchant: true, shop_id: trimmedShopId },
        }));

        updateLiveState({
          active_shop_id: trimmedShopId,
          active_merchant_npc_id: npcId,
        });
        writeSystemLog("shop", `${npc.name} öffnet den Shop für die Gruppe.`);
      } catch (err: unknown) {
        console.error("[LiveSessionBoard] assignMerchantAndOpenShop:", err);
        alert((err as Error)?.message || "Händler konnte nicht zugewiesen werden.");
      }
    });
  }

  function assignScribe(nextScribeId: string | null) {
    if (!isGM) return;
    updateLiveState({ scribe_id: nextScribeId });
  }

  function commitTemperatureValue(value = temperatureDraft) {
    const nextValue = normalizeTemperatureValue(value);
    const previousValue = normalizeTemperatureValue(liveStateRef.current?.temperature_value);
    updateLiveState({ temperature_value: nextValue });

    if (nextValue !== previousValue) {
      if (previousValue >= 0 && nextValue < 0) {
        writeSystemLog(
          "temperature_cold",
          "Eine klirrende Kälte zieht auf, die euch den Atem gefrieren lässt.",
        );
      } else if (previousValue < 35 && nextValue >= 35) {
        writeSystemLog(
          "temperature_hot",
          "Die Hitze wird drückend und flimmert über dem Boden.",
        );
      } else {
        writeSystemLog(
          "temperature",
          `Temperatur am Tisch auf ${nextValue}° gesetzt.`,
        );
      }
    }
  }

  return {
    revealNpcOnCampaignIfNeeded,
    revealCreatureOnCampaignIfNeeded,
    placeOnStage,
    removeFromStage,
    handleNpcReaction,
    toggleShopForNpc,
    assignMerchantAndOpenShop,
    assignScribe,
    commitTemperatureValue,
  };
}
