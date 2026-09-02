/**
 * useLiveSessionBattlemapToolHandlers — Fog, effect, marker, trap, and prop tool handlers.
 */
"use client";

import { useCallback, type TransitionStartFunction } from "react";
import { toast } from "sonner";
import {
  clearBattlemapEffectTemplates,
  clearBattlemapFogShapes,
  clearBattlemapMarkers,
  createBattlemapProp,
  removeBattlemapEffectTemplate,
  removeBattlemapFogShape,
  removeBattlemapMarker,
  updateBattlemapProp,
} from "@/src/lib/actions/battlemap-actions";
import {
  clearBattlemapTraps,
  listBattlemapTraps,
  markBattlemapTrapDiscovered,
  removeBattlemapTrap,
  triggerBattlemapTrapManually,
} from "@/src/lib/actions/battlemap-trap-actions";
import {
  clearBattlemapContainers,
  listBattlemapContainers,
  markContainerTrapDiscovered,
  removeBattlemapContainer,
  triggerContainerTrapManually,
} from "@/src/lib/actions/battlemap-container-actions";
import type { GmPropPlacementDraft } from "@/src/lib/session/battlemap-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type NotifyFns = {
  notifyBattlemapFogChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    shape?: import("@/src/lib/session/battlemap-types").SessionBattlemapFogShape | null;
    shapeId?: string | null;
  }) => void;
  notifyBattlemapEffectChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    template?: import("@/src/lib/session/battlemap-types").SessionBattlemapEffectTemplate | null;
    templateId?: string | null;
  }) => void;
};

type Params = {
  sessionId: string;
  isGM: boolean;
  bm: LiveSessionBattlemapState;
  notify: NotifyFns;
  startTransition: TransitionStartFunction;
};

export function useLiveSessionBattlemapToolHandlers({
  sessionId,
  isGM,
  bm,
  notify,
  startTransition,
}: Params) {
  const { notifyBattlemapFogChanged, notifyBattlemapEffectChanged } = notify;
  const {
    activeBattlemapId,
    battlemapProps,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
    setBattlemapMarkers,
    setSelectedMarkerId,
    setBattlemapTraps,
    setSelectedTrapId,
    setBattlemapContainers,
    setSelectedContainerId,
    setTrapTriggerEvent,
    battlemapFogShapes,
    battlemapEffectTemplates,
    battlemapMarkers,
    battlemapTraps,
    battlemapContainers,
  } = bm;

  const handleFogShapeDelete = useCallback(
    (shapeId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapFogShape(shapeId, sessionId);
          setBattlemapFogShapes((prev) => prev.filter((s) => s.id !== shapeId));
          setSelectedFogShapeId((prev) => (prev === shapeId ? null : prev));
          notifyBattlemapFogChanged({ op: "delete", shapeId });
          toast.success("Fog-Fläche entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Fog-Fläche konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [notifyBattlemapFogChanged, sessionId, startTransition, setBattlemapFogShapes, setSelectedFogShapeId],
  );

  const handleEffectTemplateDelete = useCallback(
    (templateId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapEffectTemplate(templateId, sessionId);
          setBattlemapEffectTemplates((prev) => prev.filter((t) => t.id !== templateId));
          setSelectedEffectTemplateId((prev) => (prev === templateId ? null : prev));
          notifyBattlemapEffectChanged({ op: "delete", templateId });
          toast.success("Effekt-Schablone entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Effekt-Schablone konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [
      notifyBattlemapEffectChanged,
      sessionId,
      startTransition,
      setBattlemapEffectTemplates,
      setSelectedEffectTemplateId,
    ],
  );

  const handleMarkerDelete = useCallback(
    (markerId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapMarker(markerId, sessionId);
          setBattlemapMarkers((prev) => prev.filter((m) => m.id !== markerId));
          setSelectedMarkerId((prev) => (prev === markerId ? null : prev));
          toast.success("Spezialeffekt entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Marker konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [sessionId, startTransition, setBattlemapMarkers, setSelectedMarkerId],
  );

  const handleFogClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapFogShapes.length === 0) {
      toast.message("Keine Fog-Flächen zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapFogShapes(activeBattlemapId, sessionId);
        setBattlemapFogShapes([]);
        setSelectedFogShapeId(null);
        notifyBattlemapFogChanged({ op: "refresh" });
        toast.success("Alle Fog-Flächen entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Fog-Flächen konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapFogShapes.length,
    isGM,
    notifyBattlemapFogChanged,
    sessionId,
    startTransition,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
  ]);

  const handleEffectClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapEffectTemplates.length === 0) {
      toast.message("Keine Effekt-Schablonen zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapEffectTemplates(activeBattlemapId, sessionId);
        setBattlemapEffectTemplates([]);
        setSelectedEffectTemplateId(null);
        notifyBattlemapEffectChanged({ op: "refresh" });
        toast.success("Alle Effekt-Schablonen entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Effekt-Schablonen konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapEffectTemplates.length,
    isGM,
    notifyBattlemapEffectChanged,
    sessionId,
    startTransition,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
  ]);

  const handleMarkerClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapMarkers.length === 0) {
      toast.message("Keine Spezialeffekte zum Löschen.");
      return;
    }
    startTransition(async () => {
      try {
        await clearBattlemapMarkers(activeBattlemapId, sessionId);
        setBattlemapMarkers([]);
        setSelectedMarkerId(null);
        toast.success("Alle Spezialeffekte entfernt.");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Marker konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapMarkers.length,
    isGM,
    sessionId,
    startTransition,
    setBattlemapMarkers,
    setSelectedMarkerId,
  ]);

  const handleTrapDelete = useCallback(
    (trapId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapTrap(trapId, sessionId);
          setBattlemapTraps((prev) => prev.filter((t) => t.id !== trapId));
          setSelectedTrapId((prev) => (prev === trapId ? null : prev));
          toast.success("Falle entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Falle konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [sessionId, startTransition, setBattlemapTraps, setSelectedTrapId],
  );

  const handleTrapClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapTraps.length === 0) {
      toast.message("Keine Fallen zum Löschen.");
      return;
    }
    const mapId = activeBattlemapId;
    startTransition(async () => {
      try {
        await clearBattlemapTraps(mapId, sessionId);
        const remaining = await listBattlemapTraps(mapId, sessionId);
        setBattlemapTraps(remaining);
        setSelectedTrapId(null);
        if (remaining.length === 0) {
          toast.success("Alle Fallen entfernt.");
        } else {
          toast.error(`${remaining.length} Falle(n) konnten nicht gelöscht werden.`);
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Fallen konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapTraps.length,
    isGM,
    sessionId,
    startTransition,
    setBattlemapTraps,
    setSelectedTrapId,
  ]);

  const handleTrapMarkDiscovered = useCallback(
    (trapId: string) => {
      startTransition(async () => {
        try {
          const updated = await markBattlemapTrapDiscovered({
            sessionId,
            trapId,
          });
          setBattlemapTraps((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t)),
          );
          toast.success(`„${updated.name}“ als entdeckt markiert.`);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Falle konnte nicht markiert werden.",
          );
        }
      });
    },
    [sessionId, startTransition, setBattlemapTraps],
  );

  const handleTrapTrigger = useCallback(
    (trapId: string) => {
      if (!isGM) return;
      startTransition(async () => {
        try {
          const result = await triggerBattlemapTrapManually({
            sessionId,
            trapId,
          });
          setBattlemapTraps((prev) =>
            prev.map((t) => (t.id === result.trap.id ? result.trap : t)),
          );
          setTrapTriggerEvent({
            trap: result.trap,
            characterName: result.characterName,
            characterId: result.characterId,
            passivePerception: result.passivePerception,
          });
          toast.error(`Falle „${result.trap.name}“ ausgelöst!`);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Falle konnte nicht ausgelöst werden.",
          );
        }
      });
    },
    [isGM, sessionId, setBattlemapTraps, setTrapTriggerEvent, startTransition],
  );

  const handleContainerDelete = useCallback(
    (containerId: string) => {
      startTransition(async () => {
        try {
          await removeBattlemapContainer(containerId, sessionId);
          setBattlemapContainers((prev) => prev.filter((c) => c.id !== containerId));
          setSelectedContainerId((prev) => (prev === containerId ? null : prev));
          toast.success("Behälter entfernt.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Behälter konnte nicht gelöscht werden.",
          );
        }
      });
    },
    [sessionId, setBattlemapContainers, setSelectedContainerId, startTransition],
  );

  const handleContainerClearAll = useCallback(() => {
    if (!activeBattlemapId || !isGM) return;
    if (battlemapContainers.length === 0) {
      toast.message("Keine Behälter zum Löschen.");
      return;
    }
    const mapId = activeBattlemapId;
    startTransition(async () => {
      try {
        await clearBattlemapContainers(mapId, sessionId);
        const remaining = await listBattlemapContainers(mapId, sessionId);
        setBattlemapContainers(remaining);
        setSelectedContainerId(null);
        if (remaining.length === 0) {
          toast.success("Alle Behälter entfernt.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Behälter konnten nicht gelöscht werden.",
        );
      }
    });
  }, [
    activeBattlemapId,
    battlemapContainers.length,
    isGM,
    sessionId,
    setBattlemapContainers,
    setSelectedContainerId,
    startTransition,
  ]);

  const handleContainerTrapMarkDiscovered = useCallback(
    (containerId: string) => {
      startTransition(async () => {
        try {
          const updated = await markContainerTrapDiscovered({
            sessionId,
            containerId,
          });
          setBattlemapContainers((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
          toast.success(`Falle in „${updated.name}" als entdeckt markiert.`);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Falle konnte nicht markiert werden.",
          );
        }
      });
    },
    [sessionId, setBattlemapContainers, startTransition],
  );

  const handleContainerTrapTrigger = useCallback(
    (containerId: string) => {
      if (!isGM) return;
      startTransition(async () => {
        try {
          const result = await triggerContainerTrapManually({
            sessionId,
            containerId,
          });
          setBattlemapContainers((prev) =>
            prev.map((c) => (c.id === result.container.id ? result.container : c)),
          );
          setTrapTriggerEvent({
            trap: result.trap,
            characterName: result.characterName,
            characterId: result.characterId,
            passivePerception: result.passivePerception,
            sourceContainerId: result.container.id,
          });
          toast.error(`Falle in „${result.container.name}" ausgelöst!`);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Falle konnte nicht ausgelöst werden.",
          );
        }
      });
    },
    [isGM, sessionId, setBattlemapContainers, setTrapTriggerEvent, startTransition],
  );

  const handleBattlemapPropDrop = useCallback(
    (draft: GmPropPlacementDraft, posX: number, posY: number) => {
      if (!isGM || !activeBattlemapId) return;
      startTransition(async () => {
        try {
          await createBattlemapProp({
            sessionId,
            battlemapId: activeBattlemapId,
            kind: draft.kind,
            npcId: draft.npcId ?? null,
            sceneMediaId: draft.sceneMediaId ?? null,
            imageUrl: draft.imageUrl,
            posX,
            posY,
            width: draft.width,
            height: draft.height,
          });
          toast.success(`${draft.label} auf die Map gelegt.`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Prop konnte nicht erstellt werden.");
        }
      });
    },
    [activeBattlemapId, isGM, sessionId, startTransition],
  );

  const handleBattlemapPropResize = useCallback(
    (propId: string, delta: number) => {
      if (!isGM) return;
      const prop = battlemapProps.find((p) => p.id === propId);
      if (!prop) return;
      startTransition(async () => {
        try {
          await updateBattlemapProp({
            propId,
            sessionId,
            width: Math.max(0.04, Math.min(0.6, prop.width + delta)),
            height: Math.max(0.04, Math.min(0.6, prop.height + delta)),
          });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Größe konnte nicht geändert werden.");
        }
      });
    },
    [battlemapProps, isGM, sessionId, startTransition],
  );

  return {
    handleFogShapeDelete,
    handleEffectTemplateDelete,
    handleMarkerDelete,
    handleFogClearAll,
    handleEffectClearAll,
    handleMarkerClearAll,
    handleTrapDelete,
    handleTrapClearAll,
    handleTrapMarkDiscovered,
    handleTrapTrigger,
    handleContainerDelete,
    handleContainerClearAll,
    handleContainerTrapMarkDiscovered,
    handleContainerTrapTrigger,
    handleBattlemapPropDrop,
    handleBattlemapPropResize,
  };
}
