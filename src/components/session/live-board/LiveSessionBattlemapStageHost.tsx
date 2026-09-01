/**
 * LiveSessionBattlemapStageHost — Der Spielleiter hält den Faden der Schlachtkarte.
 * Verdrahtet Tokens, Fog, Effekte, Marker und den Zeichenstift mit der Live-Bühne —
 * hier entscheidet sich, was die Helden sehen und wohin die Figuren ziehen.
 */
"use client";

import { useEffect, useState } from "react";
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
import { dispatchOpenCharacterRadial } from "@/src/lib/session/character-radial-bridge";
import type { LiveSessionBattlemapPaneProps } from "./LiveSessionBattlemapPane.types";
import { useBattlemapDrawSync } from "./useBattlemapDrawSync";

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
    handleTrapDelete,
    handleTrapMarkDiscovered,
    handleTrapTrigger,
    setTrapDisarmTarget,
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

  const [playerMoveMaxCells, setPlayerMoveMaxCells] = useState<number | null>(null);
  const { drawStrokes, handleDrawStroke } = useBattlemapDrawSync({
    sessionId,
    activeBattlemapId,
    activeWorldMapId,
    isGM,
    drawColor,
    drawWidth,
    drawUndoReq,
    drawClearReq,
    setDrawStrokeCount,
    startTransition,
  });

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
      onDrawStroke={handleDrawStroke}
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
      onTrapDelete={handleTrapDelete}
      onTrapMarkDiscovered={handleTrapMarkDiscovered}
      onTrapTrigger={handleTrapTrigger}
      onTrapDisarm={(trapId) => {
        const trap = battlemapTraps.find((t) => t.id === trapId) ?? null;
        if (!trap || !currentPlayerCharacterId) return;
        setTrapDisarmTarget({ trap, characterId: currentPlayerCharacterId });
      }}
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
        if (token.character_id && !isGM) {
          dispatchOpenCharacterRadial({
            characterId: token.character_id,
            clientX: x,
            clientY: y,
            battlemapToken: {
              tokenId: token.id,
              showHpBar: token.show_hp_bar === true,
              sizeCells: token.size_cells,
            },
          });
          return;
        }
        setTokenRadial({ token, x, y });
      }}
    />
  );
}
