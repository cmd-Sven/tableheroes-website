/**
 * LiveSessionBattlemapStageHost — BattlemapStage wiring and GM tool callbacks for the live board.
 */
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { toast } from "sonner";
import { BattlemapStage } from "@/src/components/session/battlemap/BattlemapStage";
import {
  createBattlemapEffectTemplate,
  createBattlemapFogShape,
  createBattlemapMarker,
  getCharacterMovementRange,
  removeBattlemapProp,
  removeBattlemapToken,
  toggleBattlemapTokenVisibility,
  updateBattlemapEffectTemplate,
  updateBattlemapFogShape,
  updateBattlemapMarker,
  updateBattlemapProp,
} from "@/src/lib/actions/battlemap-actions";
import {
  clearMapDrawStrokes,
  createMapDrawStroke,
  listMapDrawStrokes,
  undoLastMapDrawStroke,
} from "@/src/lib/actions/map-draw-actions";
import { dispatchOpenCharacterRadial } from "@/src/lib/session/character-radial-bridge";
import type { SessionMapDrawStroke } from "@/src/lib/session/map-draw-types";
import type { LiveSessionBattlemapPaneProps } from "./LiveSessionBattlemapPane.types";

export function LiveSessionBattlemapStageHost(props: LiveSessionBattlemapPaneProps) {
  const {
    activeBattlemap,
    visibleBattlemapTokens,
    visibleBattlemapProps,
    battlemapFogShapes,
    battlemapEffectTemplates,
    battlemapMarkers,
    battlemapTraps,
    battlemapTokens,
    isGM,
    tokenPlacement,
    setTokenPlacement,
    gmTokenPlacement,
    setGmTokenPlacement,
    gmMoveTokenId,
    setGmMoveTokenId,
    selectedBattlemapTokenId,
    setSelectedBattlemapTokenId,
    selectedBattlemapPropId,
    setSelectedBattlemapPropId,
    selectedFogShapeId,
    setSelectedFogShapeId,
    fogTool,
    setFogTool,
    effectTool,
    setEffectTool,
    markerTool,
    setMarkerTool,
    trapTool,
    setTrapTool,
    trapWizardCell,
    setTrapWizardCell,
    selectedEffectTemplateId,
    setSelectedEffectTemplateId,
    selectedMarkerId,
    setSelectedMarkerId,
    selectedTrapId,
    setSelectedTrapId,
    activeBattlemapId,
    activeWorldMapId,
    sessionId,
    startTransition,
    setBattlemapFogShapes,
    setBattlemapEffectTemplates,
    setBattlemapMarkers,
    setBattlemapTokens,
    notifyBattlemapFogChanged,
    notifyBattlemapEffectChanged,
    notifyBattlemapTokensChanged,
    handleFogShapeDelete,
    handleEffectTemplateDelete,
    handleMarkerDelete,
    handleBattlemapCellClick,
    handleBattlemapTokenMove,
    handleBattlemapPropDrop,
    handleBattlemapPropResize,
    battlemapTokenHpByRef,
    activeTurnHighlight,
    currentPlayerCharacterId,
    characterDisplayUrlById,
    characterConditionsById,
    setTokenRadial,
    drawTool,
    drawColor,
    drawWidth,
    setDrawStrokeCount,
    drawUndoReq,
    drawClearReq,
  } = props;

  const [drawStrokes, setDrawStrokes] = useState<SessionMapDrawStroke[]>([]);
  const [, localStart] = useTransition();
  const [playerMoveMaxCells, setPlayerMoveMaxCells] = useState<number | null>(null);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    if (!currentPlayerCharacterId) {
      setPlayerMoveMaxCells(null);
      return;
    }
    let cancelled = false;
    void getCharacterMovementRange(currentPlayerCharacterId)
      .then((range) => {
        if (!cancelled) setPlayerMoveMaxCells(range.maxCells);
      })
      .catch(() => {
        if (!cancelled) setPlayerMoveMaxCells(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPlayerCharacterId]);

  const reloadDraw = useCallback(async () => {
    if (!activeBattlemapId) {
      setDrawStrokes([]);
      if (!activeWorldMapId) setDrawStrokeCount(0);
      return;
    }
    try {
      const list = await listMapDrawStrokes({
        sessionId,
        battlemapId: activeBattlemapId,
      });
      setDrawStrokes(list);
      if (!activeWorldMapId) setDrawStrokeCount(list.length);
    } catch {
      setDrawStrokes([]);
    }
  }, [activeBattlemapId, activeWorldMapId, sessionId, setDrawStrokeCount]);

  useEffect(() => {
    void reloadDraw();
  }, [reloadDraw]);

  useEffect(() => {
    if (!activeBattlemapId || activeWorldMapId) return;

    const channel = supabase
      .channel(`session_battlemap_draw_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_map_draw_strokes",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        () => {
          void reloadDraw();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, activeWorldMapId, supabase, reloadDraw]);

  useEffect(() => {
    if (!isGM || activeWorldMapId || drawUndoReq <= 0 || !activeBattlemapId) return;
    localStart(async () => {
      try {
        const id = await undoLastMapDrawStroke({
          sessionId,
          battlemapId: activeBattlemapId,
        });
        if (!id) {
          toast.message("Keine Zeichnung zum Rückgängigmachen.");
          return;
        }
        setDrawStrokes((prev) => {
          const next = prev.filter((s) => s.id !== id);
          queueMicrotask(() => setDrawStrokeCount(next.length));
          return next;
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rückgängig fehlgeschlagen.");
      }
    });
  }, [
    drawUndoReq,
    isGM,
    activeWorldMapId,
    activeBattlemapId,
    sessionId,
    setDrawStrokeCount,
  ]);

  useEffect(() => {
    if (!isGM || activeWorldMapId || drawClearReq <= 0 || !activeBattlemapId) return;
    localStart(async () => {
      try {
        await clearMapDrawStrokes({ sessionId, battlemapId: activeBattlemapId });
        setDrawStrokes([]);
        setDrawStrokeCount(0);
        toast.success("Alle Zeichnungen gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [
    drawClearReq,
    isGM,
    activeWorldMapId,
    activeBattlemapId,
    sessionId,
    setDrawStrokeCount,
  ]);

  if (!activeBattlemap) return null;

  return (
    <BattlemapStage
      battlemap={activeBattlemap}
      tokens={visibleBattlemapTokens}
      props={visibleBattlemapProps}
      fogShapes={battlemapFogShapes}
      effectTemplates={battlemapEffectTemplates}
      markers={battlemapMarkers}
      traps={battlemapTraps}
      isGm={isGM}
      characterPlacement={tokenPlacement}
      gmTokenPlacement={gmTokenPlacement}
      gmMoveTokenId={gmMoveTokenId}
      selectedTokenId={selectedBattlemapTokenId}
      selectedPropId={selectedBattlemapPropId}
      selectedFogShapeId={selectedFogShapeId}
      fogTool={isGM ? fogTool : null}
      effectTool={isGM ? effectTool : null}
      markerTool={isGM ? markerTool : null}
      trapTool={isGM ? trapTool : null}
      drawTool={isGM ? drawTool : null}
      drawColor={drawColor}
      drawWidth={drawWidth}
      drawStrokes={drawStrokes}
      onDrawStroke={(points) => {
        if (!activeBattlemapId || !isGM) return;
        startTransition(async () => {
          try {
            const created = await createMapDrawStroke({
              sessionId,
              battlemapId: activeBattlemapId,
              color: drawColor,
              strokeWidth: drawWidth,
              points,
            });
            setDrawStrokes((prev) => [...prev, created]);
            setDrawStrokeCount((n) => n + 1);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Zeichnen fehlgeschlagen.");
          }
        });
      }}
      disableSpacePan={Boolean(trapWizardCell)}
      selectedEffectTemplateId={selectedEffectTemplateId}
      selectedMarkerId={selectedMarkerId}
      selectedTrapId={selectedTrapId}
      onCancelPlacement={() => {
        setTokenPlacement(null);
        setGmTokenPlacement(null);
        setGmMoveTokenId(null);
      }}
      onToggleDash={() => {
        setTokenPlacement((prev) => (prev ? { ...prev, useDash: !prev.useDash } : prev));
      }}
      onCellClick={handleBattlemapCellClick}
      onSelectToken={(id) => {
        setSelectedBattlemapTokenId(id);
        setSelectedBattlemapPropId(null);
        setSelectedFogShapeId(null);
        setSelectedEffectTemplateId(null);
        setSelectedMarkerId(null);
        setSelectedTrapId(null);
        if (id && isGM) {
          const token = battlemapTokens.find((t) => t.id === id);
          if (token && !token.character_id) {
            setGmMoveTokenId(id);
            setGmTokenPlacement(null);
            setTokenPlacement(null);
          }
        } else {
          setGmMoveTokenId(null);
        }
      }}
      onSelectProp={(id) => {
        setSelectedBattlemapPropId(id);
        setSelectedBattlemapTokenId(null);
        setSelectedFogShapeId(null);
        setSelectedEffectTemplateId(null);
        setSelectedMarkerId(null);
        setSelectedTrapId(null);
        setGmMoveTokenId(null);
        setGmTokenPlacement(null);
      }}
      onSelectFogShape={(id) => {
        setSelectedFogShapeId(id);
        setSelectedBattlemapTokenId(null);
        setSelectedBattlemapPropId(null);
        setSelectedEffectTemplateId(null);
        setSelectedMarkerId(null);
        setSelectedTrapId(null);
        setGmMoveTokenId(null);
      }}
      onSelectEffectTemplate={(id) => {
        setSelectedEffectTemplateId(id);
        setSelectedBattlemapTokenId(null);
        setSelectedBattlemapPropId(null);
        setSelectedFogShapeId(null);
        setSelectedMarkerId(null);
        setSelectedTrapId(null);
        setGmMoveTokenId(null);
      }}
      onSelectMarker={(id) => {
        setSelectedMarkerId(id);
        setSelectedBattlemapTokenId(null);
        setSelectedBattlemapPropId(null);
        setSelectedFogShapeId(null);
        setSelectedEffectTemplateId(null);
        setSelectedTrapId(null);
        setGmMoveTokenId(null);
      }}
      onFogShapeCreate={(input) => {
        if (!activeBattlemapId || !isGM) return;
        startTransition(async () => {
          try {
            const created = await createBattlemapFogShape({
              sessionId,
              battlemapId: activeBattlemapId,
              ...input,
            });
            setBattlemapFogShapes((prev) => [...prev, created]);
            notifyBattlemapFogChanged({ op: "upsert", shape: created });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Fog fehlgeschlagen.");
          }
        });
      }}
      onFogShapeMove={(shapeId, gridX, gridY) => {
        if (!isGM) return;
        startTransition(async () => {
          try {
            const updated = await updateBattlemapFogShape({
              shapeId,
              sessionId,
              gridX,
              gridY,
            });
            setBattlemapFogShapes((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            );
            notifyBattlemapFogChanged({ op: "upsert", shape: updated });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Fog-Verschieben fehlgeschlagen.");
          }
        });
      }}
      onFogShapeDelete={handleFogShapeDelete}
      onFogToolCancel={() => setFogTool(null)}
      onEffectTemplateCreate={(input) => {
        if (!activeBattlemapId || !isGM) return;
        startTransition(async () => {
          try {
            const created = await createBattlemapEffectTemplate({
              sessionId,
              battlemapId: activeBattlemapId,
              ...input,
            });
            setBattlemapEffectTemplates((prev) => [...prev, created]);
            notifyBattlemapEffectChanged({ op: "upsert", template: created });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Effekt fehlgeschlagen.");
          }
        });
      }}
      onEffectTemplateMove={(templateId, gridX, gridY) => {
        if (!isGM) return;
        startTransition(async () => {
          try {
            const updated = await updateBattlemapEffectTemplate({
              templateId,
              sessionId,
              gridX,
              gridY,
            });
            setBattlemapEffectTemplates((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            );
            notifyBattlemapEffectChanged({ op: "upsert", template: updated });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Effekt-Verschieben fehlgeschlagen.");
          }
        });
      }}
      onEffectTemplateDelete={handleEffectTemplateDelete}
      onEffectToolCancel={() => setEffectTool(null)}
      onMarkerCreate={(input) => {
        if (!activeBattlemapId || !isGM) return;
        startTransition(async () => {
          try {
            const created = await createBattlemapMarker({
              sessionId,
              battlemapId: activeBattlemapId,
              ...input,
            });
            setBattlemapMarkers((prev) => [...prev, created]);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Marker fehlgeschlagen.");
          }
        });
      }}
      onMarkerMove={(markerId, gridX, gridY) => {
        if (!isGM) return;
        startTransition(async () => {
          try {
            const updated = await updateBattlemapMarker({
              markerId,
              sessionId,
              gridX,
              gridY,
            });
            setBattlemapMarkers((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m)),
            );
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Marker-Verschieben fehlgeschlagen.");
          }
        });
      }}
      onMarkerDelete={handleMarkerDelete}
      onMarkerToolCancel={() => setMarkerTool(null)}
      onSelectTrap={(id) => {
        setSelectedTrapId(id);
        setSelectedBattlemapTokenId(null);
        setSelectedBattlemapPropId(null);
        setSelectedFogShapeId(null);
        setSelectedEffectTemplateId(null);
        setSelectedMarkerId(null);
        setGmMoveTokenId(null);
      }}
      onTrapPlaceCell={(gridX, gridY) => {
        setTrapWizardCell({ gridX, gridY });
        setTrapTool(null);
      }}
      onTrapToolCancel={() => setTrapTool(null)}
      onTokenMove={handleBattlemapTokenMove}
      onPropDrop={handleBattlemapPropDrop}
      onPropResize={handleBattlemapPropResize}
      onToggleTokenVisibility={(tokenId, visible) => {
        startTransition(async () => {
          try {
            const updated = await toggleBattlemapTokenVisibility(tokenId, sessionId, visible);
            setBattlemapTokens((prev) =>
              prev.map((t) =>
                t.id === tokenId ? { ...t, ...updated } : t,
              ),
            );
            notifyBattlemapTokensChanged({ op: "upsert", token: updated });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Sichtbarkeit fehlgeschlagen.");
          }
        });
      }}
      onTogglePropVisibility={(propId, visible) => {
        startTransition(async () => {
          try {
            await updateBattlemapProp({ propId, sessionId, isVisibleToPlayers: visible });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Sichtbarkeit fehlgeschlagen.");
          }
        });
      }}
      onRemoveToken={(tokenId) => {
        startTransition(async () => {
          try {
            await removeBattlemapToken(tokenId, sessionId);
            setBattlemapTokens((prev) => prev.filter((t) => t.id !== tokenId));
            notifyBattlemapTokensChanged({ op: "delete", tokenId });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Token entfernen fehlgeschlagen.");
          }
        });
      }}
      onRemoveProp={(propId) => {
        startTransition(async () => {
          try {
            await removeBattlemapProp(propId, sessionId);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Prop entfernen fehlgeschlagen.");
          }
        });
      }}
      hpByRef={battlemapTokenHpByRef}
      activeTurnHighlight={activeTurnHighlight}
      ownCharacterId={currentPlayerCharacterId}
      playerMoveMaxCells={playerMoveMaxCells}
      characterDisplayUrlById={characterDisplayUrlById}
      characterConditionsById={characterConditionsById}
      onTokenContextMenu={(token, x, y) => {
        setTokenRadial({ token, x, y });
        if (token.character_id) {
          dispatchOpenCharacterRadial({
            characterId: token.character_id,
            clientX: x,
            clientY: y,
          });
        }
      }}
    />
  );
}
