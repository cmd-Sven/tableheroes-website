"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  EyeOff,
  Heart,
  Key,
  Move,
  Settings2,
  Swords,
  Trash2,
  Wrench,
  Hammer,
  X,
} from "lucide-react";
import type {
  SessionBattlemapToken,
  SessionBattlemapTrap,
  SessionBattlemapContainer,
} from "@/src/lib/session/battlemap-types";
import { findAdjacentDisarmableTraps } from "@/src/lib/session/battlemap-trap-geometry";
import {
  findAdjacentDisarmableContainerTraps,
  findAdjacentInteractableContainers,
} from "@/src/lib/session/battlemap-container-model";
import {
  NPC_SIZE_CELLS,
  NPC_SIZE_LABELS_DE,
  parseNpcTokenSizeCategory,
  type NpcTokenSizeCategory,
} from "@/src/lib/npcs/npc-sheet-types";

type Props = {
  token: SessionBattlemapToken;
  anchor: { x: number; y: number };
  isGm: boolean;
  /** HP max für Balken-Vorschau (Charakter/NPC) */
  hpCurrent?: number | null;
  hpMax?: number | null;
  onClose: () => void;
  onMove?: () => void;
  onToggleVisibility?: (visible: boolean) => void;
  onRemove?: () => void;
  /** SL: Token in die Initiative aufnehmen (wenn Kampfmodus, noch nicht drin) */
  onJoinCombat?: () => void;
  canJoinCombat?: boolean;
  onSaveSettings: (settings: {
    showHpBar: boolean;
    sizeCells: number;
  }) => void;
  battlemapTraps?: SessionBattlemapTrap[];
  battlemapContainers?: SessionBattlemapContainer[];
  onDisarmTrap?: (trap: SessionBattlemapTrap, characterId: string) => void;
  onDisarmContainerTrap?: (container: SessionBattlemapContainer, characterId: string) => void;
  onPickLockContainer?: (container: SessionBattlemapContainer, characterId: string) => void;
  onForceOpenContainer?: (container: SessionBattlemapContainer, characterId: string) => void;
};

export function BattlemapTokenRadialMenu({
  token,
  anchor,
  isGm,
  hpCurrent,
  hpMax,
  onClose,
  onMove,
  onToggleVisibility,
  onRemove,
  onJoinCombat,
  canJoinCombat = false,
  onSaveSettings,
  battlemapTraps = [],
  battlemapContainers = [],
  onDisarmTrap,
  onDisarmContainerTrap,
  onPickLockContainer,
  onForceOpenContainer,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [disarmPickerOpen, setDisarmPickerOpen] = useState(false);
  const [containerPickerOpen, setContainerPickerOpen] = useState(false);
  const [containerAction, setContainerAction] = useState<"pick" | "force" | "disarm" | null>(
    null,
  );
  const [showHpBar, setShowHpBar] = useState(token.show_hp_bar === true);
  const [sizeCategory, setSizeCategory] = useState<NpcTokenSizeCategory>(() => {
    const fromCells = (Object.entries(NPC_SIZE_CELLS) as [NpcTokenSizeCategory, number][])
      .find(([, cells]) => cells === token.size_cells)?.[0];
    return fromCells ?? "medium";
  });

  const isCharacter = Boolean(token.character_id);
  const adjacentDisarmableTraps = useMemo(
    () =>
      token.character_id
        ? findAdjacentDisarmableTraps(battlemapTraps, token.grid_x, token.grid_y)
        : [],
    [battlemapTraps, token.character_id, token.grid_x, token.grid_y],
  );
  const adjacentContainers = useMemo(
    () =>
      token.character_id
        ? findAdjacentInteractableContainers(battlemapContainers, token.grid_x, token.grid_y)
        : [],
    [battlemapContainers, token.character_id, token.grid_x, token.grid_y],
  );
  const adjacentDisarmableContainerTraps = useMemo(
    () =>
      token.character_id
        ? findAdjacentDisarmableContainerTraps(battlemapContainers, token.grid_x, token.grid_y)
        : [],
    [battlemapContainers, token.character_id, token.grid_x, token.grid_y],
  );
  const items = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      Icon: typeof Move;
      onClick: () => void;
      danger?: boolean;
    }> = [];

    if (isGm && onMove) {
      list.push({
        id: "move",
        label: "Verschieben",
        Icon: Move,
        onClick: () => {
          onMove();
          onClose();
        },
      });
    }

    if (isGm && canJoinCombat && onJoinCombat) {
      list.push({
        id: "join_combat",
        label: "Am Kampf teilnehmen",
        Icon: Swords,
        onClick: () => {
          onJoinCombat();
          onClose();
        },
      });
    }

    if (token.character_id && adjacentDisarmableContainerTraps.length > 0 && onDisarmContainerTrap) {
      list.push({
        id: "disarm_container_trap",
        label: "Falle entschärfen",
        Icon: Wrench,
        onClick: () => {
          if (adjacentDisarmableContainerTraps.length === 1) {
            onDisarmContainerTrap(adjacentDisarmableContainerTraps[0]!, token.character_id!);
            onClose();
            return;
          }
          setContainerAction("disarm");
          setContainerPickerOpen(true);
        },
      });
    }

    if (token.character_id && adjacentContainers.length > 0) {
      const locked = adjacentContainers.filter((c) => c.is_locked);
      if (locked.length > 0 && onPickLockContainer) {
        list.push({
          id: "pick_lock",
          label: "Schloss knacken",
          Icon: Key,
          onClick: () => {
            if (locked.length === 1) {
              onPickLockContainer(locked[0]!, token.character_id!);
              onClose();
              return;
            }
            setContainerAction("pick");
            setContainerPickerOpen(true);
          },
        });
      }
      if (onForceOpenContainer) {
        list.push({
          id: "force_open",
          label: "Gewaltsam öffnen",
          Icon: Hammer,
          onClick: () => {
            if (adjacentContainers.length === 1) {
              onForceOpenContainer(adjacentContainers[0]!, token.character_id!);
              onClose();
              return;
            }
            setContainerAction("force");
            setContainerPickerOpen(true);
          },
        });
      }
    }

    if (token.character_id && adjacentDisarmableTraps.length > 0 && onDisarmTrap) {
      list.push({
        id: "disarm_trap",
        label: "Falle entschärfen",
        Icon: Wrench,
        onClick: () => {
          if (adjacentDisarmableTraps.length === 1) {
            onDisarmTrap(adjacentDisarmableTraps[0]!, token.character_id!);
            onClose();
            return;
          }
          setDisarmPickerOpen(true);
        },
      });
    }

    list.push({
      id: "settings",
      label: "Token-Einstellungen",
      Icon: Settings2,
      onClick: () => setSettingsOpen(true),
    });

    if (isGm && onToggleVisibility) {
      list.push({
        id: "vis",
        label: token.is_visible_to_players ? "Verbergen" : "Sichtbar",
        Icon: token.is_visible_to_players ? EyeOff : Eye,
        onClick: () => {
          onToggleVisibility(!token.is_visible_to_players);
          onClose();
        },
      });
    }

    if (isGm && onRemove) {
      list.push({
        id: "remove",
        label: "Entfernen",
        Icon: Trash2,
        danger: true,
        onClick: () => {
          onRemove();
          onClose();
        },
      });
    }

    return list;
  }, [
    adjacentDisarmableContainerTraps,
    adjacentContainers,
    adjacentDisarmableTraps,
    canJoinCombat,
    isGm,
    onClose,
    onDisarmTrap,
    onDisarmContainerTrap,
    onPickLockContainer,
    onForceOpenContainer,
    onJoinCombat,
    onMove,
    onRemove,
    onToggleVisibility,
    token.character_id,
    token.is_visible_to_players,
  ]);

  const radius = 72;

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
        {!settingsOpen && !disarmPickerOpen && !containerPickerOpen ? (
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
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : containerPickerOpen ? (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hero-border bg-background-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
                {containerAction === "pick"
                  ? "Schloss knacken"
                  : containerAction === "force"
                    ? "Gewaltsam öffnen"
                    : "Falle entschärfen"}
              </h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {(containerAction === "disarm"
                ? adjacentDisarmableContainerTraps
                : containerAction === "pick"
                  ? adjacentContainers.filter((c) => c.is_locked)
                  : adjacentContainers).map((container) => (
                <li key={container.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!token.character_id) return;
                      if (containerAction === "pick") {
                        onPickLockContainer?.(container, token.character_id);
                      } else if (containerAction === "force") {
                        onForceOpenContainer?.(container, token.character_id);
                      } else {
                        onDisarmContainerTrap?.(container, token.character_id);
                      }
                      onClose();
                    }}
                    className="w-full rounded border border-hero-dark px-3 py-2 text-left font-libre text-sm text-gray-200 hover:border-hero-vibrant hover:text-accent-gold"
                  >
                    {container.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : disarmPickerOpen ? (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hero-border bg-background-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
                Falle entschärfen
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {adjacentDisarmableTraps.map((trap) => (
                <li key={trap.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onDisarmTrap?.(trap, token.character_id!);
                      onClose();
                    }}
                    className="w-full rounded border border-hero-dark px-3 py-2 text-left font-libre text-sm text-gray-200 hover:border-hero-vibrant hover:text-accent-gold"
                  >
                    {trap.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hero-border bg-background-card p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
                Token-Einstellungen
              </h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 truncate font-cinzel text-sm text-white">
              {token.label ?? (isCharacter ? "Spieler" : "Token")}
            </p>

            <label className="mb-3 flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={showHpBar}
                onChange={(e) => setShowHpBar(e.target.checked)}
              />
              <Heart className="h-3.5 w-3.5 text-red-400" />
              Lebensbalken am Token
            </label>
            {showHpBar && hpMax != null ? (
              <p className="mb-3 font-libre text-[10px] text-gray-500">
                Aktuell: {hpCurrent ?? "—"} / {hpMax} TP
              </p>
            ) : null}

            {(isGm || isCharacter) && (
              <label className="mb-4 block">
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                  Größe (D&amp;D 5e)
                </span>
                <select
                  value={sizeCategory}
                  onChange={(e) =>
                    setSizeCategory(parseNpcTokenSizeCategory(e.target.value))
                  }
                  className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
                >
                  {(Object.keys(NPC_SIZE_LABELS_DE) as NpcTokenSizeCategory[]).map(
                    (k) => (
                      <option key={k} value={k}>
                        {NPC_SIZE_LABELS_DE[k]} ({NPC_SIZE_CELLS[k]} Feld
                        {NPC_SIZE_CELLS[k] > 1 ? "er" : ""})
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={() => {
                onSaveSettings({
                  showHpBar,
                  sizeCells: NPC_SIZE_CELLS[sizeCategory],
                });
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
