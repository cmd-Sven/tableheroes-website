/**
 * BattlemapContainerRadialMenu — Interaktionen am Behälter-Token
 * (Schloss knacken / gewaltsam öffnen / entschärfen / SL-Verwaltung).
 */
"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  Hammer,
  Heart,
  Key,
  Trash2,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { SessionBattlemapContainer } from "@/src/lib/session/battlemap-types";
import {
  CONTAINER_TYPE_LABELS,
  containerTrapActive,
} from "@/src/lib/session/battlemap-container-model";

type Props = {
  container: SessionBattlemapContainer;
  anchor: { x: number; y: number };
  isGm: boolean;
  /** Charakter für Spieler-Aktionen (benachbart / eigener Token). */
  actorCharacterId: string | null;
  onClose: () => void;
  onPickLock?: (container: SessionBattlemapContainer, characterId: string) => void;
  onForceOpen?: (container: SessionBattlemapContainer, characterId: string) => void;
  onDisarmTrap?: (container: SessionBattlemapContainer, characterId: string) => void;
  onMarkTrapDiscovered?: (containerId: string) => void;
  onMarkContainerDiscovered?: (containerId: string) => void;
  onTriggerTrap?: (containerId: string) => void;
  onDelete?: (containerId: string) => void;
  onSaveHp?: (hpCurrent: number, hpMax: number) => void;
};

export function BattlemapContainerRadialMenu({
  container,
  anchor,
  isGm,
  actorCharacterId,
  onClose,
  onPickLock,
  onForceOpen,
  onDisarmTrap,
  onMarkTrapDiscovered,
  onMarkContainerDiscovered,
  onTriggerTrap,
  onDelete,
  onSaveHp,
}: Props) {
  const [hpPanelOpen, setHpPanelOpen] = useState(false);
  const [hpCurrent, setHpCurrent] = useState(container.hp_current);
  const [hpMax, setHpMax] = useState(container.hp_max);

  const hasTrap = container.has_trap;
  const trapActive = containerTrapActive(container);
  const trapDetected = container.is_trap_detected;
  const trapDisarmed = container.is_trap_disarmed;
  const trapTriggered = container.is_trap_triggered;
  const hiddenUndiscovered = container.is_hidden && !container.is_discovered;
  const canAct = Boolean(actorCharacterId) && !container.is_open;
  const canDisarm =
    canAct &&
    hasTrap &&
    trapDetected &&
    !trapTriggered &&
    !trapDisarmed &&
    Boolean(onDisarmTrap);

  const items = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      Icon: typeof Key;
      onClick: () => void;
      danger?: boolean;
    }> = [];

    if (canAct && container.is_locked && onPickLock && actorCharacterId) {
      list.push({
        id: "pick_lock",
        label: "Schloss knacken",
        Icon: Key,
        onClick: () => {
          onPickLock(container, actorCharacterId);
          onClose();
        },
      });
    }

    if (canAct && onForceOpen && actorCharacterId) {
      list.push({
        id: "force_open",
        label: `Gewaltsam öffnen (SG ${container.force_open_dc})`,
        Icon: Hammer,
        onClick: () => {
          onForceOpen(container, actorCharacterId);
          onClose();
        },
      });
    }

    if (canDisarm && actorCharacterId && onDisarmTrap) {
      list.push({
        id: "disarm",
        label: "Entschärfen",
        Icon: Wrench,
        onClick: () => {
          onDisarmTrap(container, actorCharacterId);
          onClose();
        },
      });
    }

    if (isGm && onSaveHp) {
      list.push({
        id: "hp",
        label: `TP ${container.hp_current}/${container.hp_max}`,
        Icon: Heart,
        onClick: () => setHpPanelOpen(true),
      });
    }

    if (isGm && hiddenUndiscovered && onMarkContainerDiscovered) {
      list.push({
        id: "discover",
        label: "Behälter entdeckt",
        Icon: Eye,
        onClick: () => {
          onMarkContainerDiscovered(container.id);
          onClose();
        },
      });
    }

    if (isGm && hasTrap && !trapDetected && onMarkTrapDiscovered) {
      list.push({
        id: "trap_detect",
        label: "Falle entdeckt",
        Icon: Eye,
        onClick: () => {
          onMarkTrapDiscovered(container.id);
          onClose();
        },
      });
    }

    if (isGm && hasTrap && trapActive && onTriggerTrap) {
      list.push({
        id: "trap_trigger",
        label: "Falle auslösen",
        Icon: Zap,
        onClick: () => {
          onTriggerTrap(container.id);
          onClose();
        },
        danger: true,
      });
    }

    if (isGm && onDelete) {
      list.push({
        id: "delete",
        label: "Löschen",
        Icon: Trash2,
        danger: true,
        onClick: () => {
          onDelete(container.id);
          onClose();
        },
      });
    }

    return list;
  }, [
    actorCharacterId,
    canAct,
    canDisarm,
    container,
    hasTrap,
    hiddenUndiscovered,
    isGm,
    onClose,
    onDelete,
    onDisarmTrap,
    onForceOpen,
    onMarkContainerDiscovered,
    onMarkTrapDiscovered,
    onPickLock,
    onSaveHp,
    onTriggerTrap,
    trapActive,
    trapDetected,
  ]);

  const radius = 72;
  const typeLabel = CONTAINER_TYPE_LABELS[container.container_type] ?? "Behälter";

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/40"
        aria-label="Menü schließen"
        onClick={onClose}
      />
      <div
        className="pointer-events-none absolute"
        style={{ left: anchor.x, top: anchor.y }}
      >
        {!hpPanelOpen ? (
          <div className="pointer-events-auto relative h-0 w-0">
            {items.map((item, index) => {
              const angle =
                (-90 + (360 / Math.max(items.length, 1)) * index) * (Math.PI / 180);
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={item.onClick}
                  className={`absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border shadow-lg ${
                    item.danger
                      ? "border-red-700/70 bg-red-950/90 text-red-300 hover:border-red-500"
                      : "border-hero-border/70 bg-background-card/95 text-gray-200 hover:border-accent-gold hover:text-accent-gold"
                  }`}
                  style={{ left: x, top: y }}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={onClose}
              className="absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-hero-border bg-background-dark text-gray-300"
              style={{ left: 0, top: 0 }}
              aria-label="Schließen"
              title={`${typeLabel}: ${container.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hero-border bg-background-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
                Trefferpunkte
              </h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 truncate font-cinzel text-sm text-white">{container.name}</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                  Aktuell
                </span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={hpCurrent}
                  onChange={(e) => setHpCurrent(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                  Maximum
                </span>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={hpMax}
                  onChange={(e) => setHpMax(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
                />
              </label>
            </div>
            <p className="mb-3 font-libre text-[10px] text-gray-500">
              Gewaltsam öffnen: SG {container.force_open_dc} — TP manuell abziehen.
            </p>
            <button
              type="button"
              onClick={() => {
                const max = Math.max(1, Math.min(9999, Math.round(hpMax)));
                const cur = Math.max(0, Math.min(max, Math.round(hpCurrent)));
                onSaveHp?.(cur, max);
                onClose();
              }}
              className="w-full rounded border border-hero-vibrant bg-hero-vibrant/15 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant"
            >
              Speichern
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
