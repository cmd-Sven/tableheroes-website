/**
 * LiveSessionContainerRadialMenuHost — Radial am Behälter-Token.
 */
"use client";

import type { Dispatch, SetStateAction, TransitionStartFunction } from "react";
import { toast } from "sonner";
import { BattlemapContainerRadialMenu } from "@/src/components/session/battlemap/BattlemapContainerRadialMenu";
import {
  updateBattlemapContainerHp,
} from "@/src/lib/actions/battlemap-container-actions";
import type { SessionBattlemapContainer } from "@/src/lib/session/battlemap-types";
import { containerToVirtualTrap } from "@/src/lib/session/battlemap-container-model";
import type { TrapDisarmTarget } from "@/src/lib/session/battlemap-types";

export type LiveSessionContainerRadialMenuHostProps = {
  containerRadial: {
    container: SessionBattlemapContainer;
    x: number;
    y: number;
  } | null;
  setContainerRadial: Dispatch<
    SetStateAction<{
      container: SessionBattlemapContainer;
      x: number;
      y: number;
    } | null>
  >;
  isGM: boolean;
  actorCharacterId: string | null;
  sessionId: string;
  startTransition: TransitionStartFunction;
  setBattlemapContainers: Dispatch<SetStateAction<SessionBattlemapContainer[]>>;
  setTrapDisarmTarget: Dispatch<SetStateAction<TrapDisarmTarget | null>>;
  handleContainerPickLock: (containerId: string, characterId: string) => void;
  handleContainerForceOpen: (containerId: string, characterId: string) => void;
  onMarkTrapDiscovered?: (containerId: string) => void;
  onMarkContainerDiscovered?: (containerId: string) => void;
  onTriggerTrap?: (containerId: string) => void;
  onDelete?: (containerId: string) => void;
};

export function LiveSessionContainerRadialMenuHost(
  props: LiveSessionContainerRadialMenuHostProps,
) {
  const {
    containerRadial,
    setContainerRadial,
    isGM,
    actorCharacterId,
    sessionId,
    startTransition,
    setBattlemapContainers,
    setTrapDisarmTarget,
    handleContainerPickLock,
    handleContainerForceOpen,
    onMarkTrapDiscovered,
    onMarkContainerDiscovered,
    onTriggerTrap,
    onDelete,
  } = props;

  if (!containerRadial) return null;

  return (
    <BattlemapContainerRadialMenu
      container={containerRadial.container}
      anchor={{ x: containerRadial.x, y: containerRadial.y }}
      isGm={isGM}
      actorCharacterId={actorCharacterId}
      onClose={() => setContainerRadial(null)}
      onPickLock={(container, characterId) => {
        handleContainerPickLock(container.id, characterId);
        setContainerRadial(null);
      }}
      onForceOpen={(container, characterId) => {
        handleContainerForceOpen(container.id, characterId);
        setContainerRadial(null);
      }}
      onDisarmTrap={(container, characterId) => {
        const trap = containerToVirtualTrap(container);
        if (!trap) return;
        setTrapDisarmTarget({
          trap,
          characterId,
          sourceContainerId: container.id,
        });
        setContainerRadial(null);
      }}
      onMarkTrapDiscovered={isGM ? onMarkTrapDiscovered : undefined}
      onMarkContainerDiscovered={isGM ? onMarkContainerDiscovered : undefined}
      onTriggerTrap={isGM ? onTriggerTrap : undefined}
      onDelete={isGM ? onDelete : undefined}
      onSaveHp={
        isGM
          ? (hpCurrent, hpMax) => {
              startTransition(async () => {
                try {
                  const updated = await updateBattlemapContainerHp({
                    sessionId,
                    containerId: containerRadial.container.id,
                    hpCurrent,
                    hpMax,
                  });
                  setBattlemapContainers((prev) =>
                    prev.map((c) => (c.id === updated.id ? updated : c)),
                  );
                  toast.success(
                    `TP „${updated.name}”: ${updated.hp_current}/${updated.hp_max}`,
                  );
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "TP speichern fehlgeschlagen.");
                }
              });
            }
          : undefined
      }
    />
  );
}
