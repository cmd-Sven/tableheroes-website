/**
 * LiveSessionBattlemapPane — BattlemapStage, world-map overlay, and GM token tray for the live board.
 */
"use client";

import { toast } from "sonner";
import { BattlemapTokenTray } from "@/src/components/session/battlemap/BattlemapTokenTray";
import { LiveWorldMapOverlay } from "@/src/components/world-maps/LiveWorldMapOverlay";
import { LiveAurenfurtCityOverlay } from "@/src/components/session/LiveAurenfurtCityOverlay";
import { setActiveWorldMap } from "@/src/lib/actions/world-map-actions";
import { setActiveAurenfurtCity } from "@/src/lib/actions/aurenfurt-session-actions";
import { createBattlemapProp } from "@/src/lib/actions/battlemap-actions";
import {
  resolveSessionDayPhase,
  sessionDayPhaseLabel,
} from "@/src/lib/session-day-phase";
import { normalizeLiveRow } from "./live-session-normalize";
import { LiveSessionBattlemapStageHost } from "./LiveSessionBattlemapStageHost";
import type { LiveSessionBattlemapPaneProps } from "./LiveSessionBattlemapPane.types";

export type { LiveSessionBattlemapPaneProps } from "./LiveSessionBattlemapPane.types";

export function LiveSessionBattlemapPane(props: LiveSessionBattlemapPaneProps) {
  const {
    isGM,
    worldId,
    activeWorldMapId,
    activeAurenfurtCity = false,
    isPrepMode = false,
    liveState = null,
    partyCharacters = [],
    currentPlayerCharacterId = null,
    updateLiveState,
    campaignId,
    sessionId,
    startTransition,
    setLiveState,
    liveStateRef,
    battlemapActive,
    battlemapTrayScenes,
    activeBattlemapId,
    fogTool,
    effectTool,
    markerTool,
    drawTool,
    drawColor,
    drawWidth,
    poiTool,
    selectedPoiId,
    setSelectedPoiId,
    setWorldMapFogCount,
    setWorldMapEffectCount,
    setWorldMapMarkerCount,
    setWorldMapPoiCount,
    setDrawStrokeCount,
    worldMapFogClearReq,
    worldMapEffectClearReq,
    worldMapMarkerClearReq,
    worldMapPoiClearReq,
    worldMapPoiDeleteReq,
    drawUndoReq,
    drawClearReq,
    weatherVisual,
    temperatureValue,
  } = props;

  return (
    <>
      <LiveSessionBattlemapStageHost {...props} />
      {activeWorldMapId && worldId && !activeAurenfurtCity ? (
        <LiveWorldMapOverlay
          worldMapId={activeWorldMapId}
          worldId={worldId}
          campaignId={campaignId}
          sessionId={sessionId}
          isGm={isGM}
          weatherVisual={weatherVisual}
          temperatureValue={temperatureValue}
          fogTool={null}
          effectTool={null}
          markerTool={null}
          drawTool={drawTool}
          drawColor={drawColor}
          drawWidth={drawWidth}
          poiTool={isGM ? poiTool : null}
          selectedPoiId={selectedPoiId}
          onSelectedPoiIdChange={setSelectedPoiId}
          onFogCountChange={setWorldMapFogCount}
          onEffectCountChange={setWorldMapEffectCount}
          onMarkerCountChange={setWorldMapMarkerCount}
          onPoiCountChange={setWorldMapPoiCount}
          onDrawCountChange={setDrawStrokeCount}
          fogClearRequest={worldMapFogClearReq}
          effectClearRequest={worldMapEffectClearReq}
          markerClearRequest={worldMapMarkerClearReq}
          poiClearRequest={worldMapPoiClearReq}
          poiDeleteRequest={worldMapPoiDeleteReq}
          drawUndoRequest={drawUndoReq}
          drawClearRequest={drawClearReq}
          onClose={
            isGM
              ? () => {
                  startTransition(async () => {
                    try {
                      await setActiveWorldMap(sessionId, null);
                      setLiveState((prev) => {
                        if (!prev) return prev;
                        const next = normalizeLiveRow({
                          ...prev,
                          active_world_map_id: null,
                        });
                        liveStateRef.current = next;
                        return next;
                      });
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Weltkarte konnte nicht geschlossen werden.",
                      );
                    }
                  });
                }
              : undefined
          }
        />
      ) : null}
      {activeAurenfurtCity ? (
        <LiveAurenfurtCityOverlay
          worldId={worldId ?? null}
          campaignId={campaignId}
          sessionId={sessionId}
          isGm={isGM}
          isPrepMode={isPrepMode}
          opticalWeatherPreset={liveState?.weather_preset ?? null}
          opticalWeatherIntensity={liveState?.weather_intensity ?? null}
          sessionDayPhase={resolveSessionDayPhase(liveState?.current_time)}
          onSessionNightChange={
            isGM && updateLiveState
              ? (night) =>
                  updateLiveState({
                    current_time: sessionDayPhaseLabel(night ? "night" : "day"),
                  })
              : undefined
          }
          activeShopId={liveState?.active_shop_id ?? null}
          activeMerchantNpcId={liveState?.active_merchant_npc_id ?? null}
          shopSellingUnlocked={Boolean(liveState?.shop_selling_unlocked)}
          characterId={currentPlayerCharacterId}
          partyCharacters={partyCharacters.map((pc) => ({
            id: pc.id,
            name: pc.name,
            playerUserId: pc.playerUserId ?? null,
            avatarUrl: pc.avatar_url ?? null,
          }))}
          onOpenShop={
            isGM && updateLiveState
              ? (shopId, merchantNpcId) => {
                  updateLiveState({
                    active_shop_id: shopId,
                    active_merchant_npc_id: merchantNpcId,
                    shop_selling_unlocked: false,
                  });
                }
              : undefined
          }
          onCloseShop={
            isGM && updateLiveState
              ? () =>
                  updateLiveState({
                    active_shop_id: null,
                    active_merchant_npc_id: null,
                    shop_selling_unlocked: false,
                  })
              : undefined
          }
          onToggleShopSelling={
            isGM && updateLiveState
              ? (unlocked) => updateLiveState({ shop_selling_unlocked: unlocked })
              : undefined
          }
          onClose={
            isGM
              ? () => {
                  startTransition(async () => {
                    try {
                      await setActiveAurenfurtCity(sessionId, false);
                      setLiveState((prev) => {
                        if (!prev) return prev;
                        const next = normalizeLiveRow({
                          ...prev,
                          active_aurenfurt_city: false,
                        });
                        liveStateRef.current = next;
                        return next;
                      });
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Stadtkarte konnte nicht geschlossen werden.",
                      );
                    }
                  });
                }
              : undefined
          }
        />
      ) : null}
      {isGM && battlemapActive ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[35] max-w-[min(100%-1.5rem,28rem)]">
          <BattlemapTokenTray
            npcs={[]}
            creatures={[]}
            scenes={battlemapTrayScenes}
            onStartTokenPlacement={() => undefined}
            onStartPropDrag={(draft) => {
              if (!activeBattlemapId) return;
              startTransition(async () => {
                try {
                  await createBattlemapProp({
                    sessionId,
                    battlemapId: activeBattlemapId,
                    kind: draft.kind,
                    npcId: draft.npcId ?? null,
                    sceneMediaId: draft.sceneMediaId ?? null,
                    imageUrl: draft.imageUrl,
                    posX: 0.35,
                    posY: 0.35,
                    width: draft.width,
                    height: draft.height,
                  });
                  toast.success(`${draft.label} auf die Map gelegt.`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Prop konnte nicht erstellt werden.");
                }
              });
            }}
          />
        </div>
      ) : null}
    </>
  );
}
