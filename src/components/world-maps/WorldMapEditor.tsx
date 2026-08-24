"use client";

import { useCallback, useMemo, useRef, useState, useTransition, type SyntheticEvent } from "react";
import Image from "next/image";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  Eye,
  EyeOff,
  Grid3X3,
  Minus,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BattlemapGridOverlay } from "@/src/components/session/battlemap/BattlemapGridOverlay";
import {
  gridToPixel,
  pixelToGrid,
} from "@/src/lib/session/battlemap-grid";
import { WorldMapIcon } from "@/src/lib/world-maps/icons";
import {
  WORLD_MAP_ICON_KEYS,
  WORLD_MAP_ICON_LABELS,
  type WorldMap,
  type WorldMapIconKey,
  type WorldMapMarker,
  type WorldMapMarkerNote,
} from "@/src/lib/world-maps/types";
import { buildMarkerEntityLinks } from "@/src/lib/world-maps/normalize";
import {
  addWorldMapMarkerNote,
  deleteWorldMapMarker,
  deleteWorldMapMarkerNote,
  getWorldMapMarkerNotes,
  setWorldMapGroupToken,
  toggleWorldMapMarkerVisibility,
  updateWorldMap,
  upsertWorldMapMarker,
} from "@/src/lib/actions/world-map-actions";
import { WorldMapGroupToken } from "@/src/components/world-maps/WorldMapGroupToken";
import { WorldMapGridModal } from "@/src/components/world-maps/WorldMapGridModal";
import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";

type LinkOpt = { id: string; name: string; type?: string | null };
type QuestOpt = { id: string; title: string };

type Props = {
  map: WorldMap;
  markers: WorldMapMarker[];
  worldId: string;
  campaignId?: string | null;
  isGm: boolean;
  linkOptions: {
    lore: LinkOpt[];
    npcs: LinkOpt[];
    factions: LinkOpt[];
    creatures: LinkOpt[];
    quests: QuestOpt[];
  };
};

type DraftMarker = {
  icon: WorldMapIconKey;
  name: string;
  description: string;
  isVisibleToPlayers: boolean;
  loreId: string;
  npcId: string;
  factionId: string;
  creatureId: string;
  questId: string;
};

const emptyDraft = (): DraftMarker => ({
  icon: "marker",
  name: "",
  description: "",
  isVisibleToPlayers: false,
  loreId: "",
  npcId: "",
  factionId: "",
  creatureId: "",
  questId: "",
});

export function WorldMapEditor({
  map: initialMap,
  markers: initialMarkers,
  worldId,
  campaignId,
  isGm,
  linkOptions,
}: Props) {
  const [map, setMap] = useState(initialMap);
  const [markers, setMarkers] = useState(initialMarkers);
  const [pending, startTransition] = useTransition();
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState({ width: 1200, height: 800 });

  const [placeMode, setPlaceMode] = useState<"marker" | "group" | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<WorldMapIconKey>("marker");
  const [editingMarker, setEditingMarker] = useState<WorldMapMarker | null>(null);
  const [draft, setDraft] = useState<DraftMarker>(emptyDraft());
  const [pendingCell, setPendingCell] = useState<{ x: number; y: number } | null>(null);
  const [hoverMarkerId, setHoverMarkerId] = useState<string | null>(null);
  const [modalMarker, setModalMarker] = useState<WorldMapMarker | null>(null);
  const [notes, setNotes] = useState<WorldMapMarkerNote[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [gridModalOpen, setGridModalOpen] = useState(false);

  const config = map.grid_config;
  const visibleMarkers = useMemo(
    () => (isGm ? markers : markers.filter((m) => m.is_visible_to_players)),
    [isGm, markers],
  );

  const onImgLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setMapSize({
        width: img.naturalWidth || 1200,
        height: img.naturalHeight || 800,
      });
    },
    [],
  );

  function openEdit(marker: WorldMapMarker) {
    setEditingMarker(marker);
    setPendingCell({ x: marker.grid_x, y: marker.grid_y });
    setDraft({
      icon: marker.icon,
      name: marker.name,
      description: marker.description ?? "",
      isVisibleToPlayers: marker.is_visible_to_players,
      loreId: marker.lore_id ?? "",
      npcId: marker.npc_id ?? "",
      factionId: marker.faction_id ?? "",
      creatureId: marker.creature_id ?? "",
      questId: marker.quest_id ?? "",
    });
    setPlaceMode(null);
  }

  function openModal(marker: WorldMapMarker) {
    setModalMarker(marker);
    setNoteBody("");
    startTransition(async () => {
      try {
        const list = await getWorldMapMarkerNotes(marker.id);
        setNotes(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Notizen laden fehlgeschlagen.");
      }
    });
  }

  function handleCellClick(clientX: number, clientY: number) {
    if (!mapRef.current || (!isGm && placeMode !== null)) return;
    if (!isGm) return;

    const rect = mapRef.current.getBoundingClientRect();
    const scale = mapSize.width / Math.max(1, rect.width);
    const px = (clientX - rect.left) * scale;
    const py = (clientY - rect.top) * scale;
    const cell = pixelToGrid(px, py, config);
    if (!cell) return;

    if (placeMode === "group") {
      startTransition(async () => {
        try {
          const updated = await setWorldMapGroupToken({
            mapId: map.id,
            worldId,
            gridX: cell.gridX,
            gridY: cell.gridY,
            visible: true,
          });
          setMap(updated);
          setPlaceMode(null);
          toast.success("Gruppentoken gesetzt.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Gruppentoken fehlgeschlagen.");
        }
      });
      return;
    }

    if (placeMode === "marker") {
      setPendingCell({ x: cell.gridX, y: cell.gridY });
      setEditingMarker(null);
      setDraft({ ...emptyDraft(), icon: selectedIcon });
      return;
    }
  }

  function saveMarker() {
    if (!pendingCell && !editingMarker) {
      toast.error("Zuerst eine Zelle wählen.");
      return;
    }
    const gridX = pendingCell?.x ?? editingMarker!.grid_x;
    const gridY = pendingCell?.y ?? editingMarker!.grid_y;

    startTransition(async () => {
      try {
        const saved = await upsertWorldMapMarker({
          worldId,
          mapId: map.id,
          markerId: editingMarker?.id,
          icon: draft.icon,
          name: draft.name,
          description: draft.description,
          gridX,
          gridY,
          isVisibleToPlayers: draft.isVisibleToPlayers,
          loreId: draft.loreId || null,
          npcId: draft.npcId || null,
          factionId: draft.factionId || null,
          creatureId: draft.creatureId || null,
          questId: draft.questId || null,
        });
        setMarkers((prev) => {
          const idx = prev.findIndex((m) => m.id === saved.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
        setEditingMarker(null);
        setPendingCell(null);
        setDraft(emptyDraft());
        setPlaceMode(null);
        toast.success(editingMarker ? "Markierung aktualisiert." : "Markierung gesetzt.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const groupPixel =
    map.group_token_grid_x != null && map.group_token_grid_y != null
      ? gridToPixel(map.group_token_grid_x, map.group_token_grid_y, config)
      : null;

  return (
    <div className="space-y-4">
      {isGm && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-hero-border/40 bg-background-card p-3">
          <button
            type="button"
            onClick={() => {
              setPlaceMode((m) => (m === "marker" ? null : "marker"));
              setEditingMarker(null);
              setPendingCell(null);
            }}
            className={`rounded px-3 py-1.5 font-barlow text-xs font-bold uppercase ${
              placeMode === "marker"
                ? "bg-hero-vibrant text-black"
                : "border border-hero-border text-gray-300 hover:border-hero-vibrant"
            }`}
          >
            Markierung setzen
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaceMode((m) => (m === "group" ? null : "group"));
              setEditingMarker(null);
              setPendingCell(null);
            }}
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 font-barlow text-xs font-bold uppercase ${
              placeMode === "group"
                ? "bg-hero-vibrant text-black"
                : "border border-hero-border text-gray-300 hover:border-hero-vibrant"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Gruppentoken
          </button>
          <button
            type="button"
            onClick={() => setGridModalOpen(true)}
            className="inline-flex items-center gap-1 rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-300 hover:border-accent-gold hover:text-accent-gold"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Raster
          </button>
          {placeMode === "marker" && (
            <div className="flex flex-wrap gap-1">
              {WORLD_MAP_ICON_KEYS.filter((k) => k !== "marker").map((key) => {
                const active = selectedIcon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={WORLD_MAP_ICON_LABELS[key]}
                    onClick={() => setSelectedIcon(key)}
                    className={`rounded p-1.5 ${
                      active
                        ? "bg-hero-vibrant text-black"
                        : "border border-hero-border/50 text-gray-400 hover:text-white"
                    }`}
                  >
                    <WorldMapIcon icon={key} className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          )}
          <span className="ml-auto text-xs text-gray-500 font-libre">
            {placeMode === "marker"
              ? "Zelle klicken → Formular"
              : placeMode === "group"
                ? "Zelle für Gruppenposition wählen"
                : "Pan/Zoom: Mausrad / Ziehen · Spieler: nur Ansicht"}
          </span>
        </div>
      )}

      <div className="relative overflow-hidden rounded border border-hero-border bg-black">
        <div className="absolute right-2 top-2 z-20 flex gap-1">
          <button
            type="button"
            className="rounded bg-black/70 p-1.5 text-white"
            onClick={() => transformRef.current?.zoomIn()}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded bg-black/70 p-1.5 text-white"
            onClick={() => transformRef.current?.zoomOut()}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <TransformWrapper
          ref={transformRef}
          initialScale={0.6}
          minScale={0.2}
          maxScale={4}
          limitToBounds={false}
          doubleClick={{ disabled: true }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "min(70vh, 720px)" }}
            contentStyle={{ width: mapSize.width, height: mapSize.height }}
          >
            <div
              ref={mapRef}
              className="relative"
              style={{ width: mapSize.width, height: mapSize.height }}
              onClick={(e) => {
                if (placeMode) handleCellClick(e.clientX, e.clientY);
              }}
            >
              <Image
                src={map.image_url}
                alt={map.title}
                width={mapSize.width}
                height={mapSize.height}
                unoptimized
                className="pointer-events-none select-none"
                onLoad={onImgLoad}
              />
              {config.showGrid && (
                <BattlemapGridOverlay config={config} mapWidth={mapSize.width} mapHeight={mapSize.height} />
              )}

              {visibleMarkers.map((m) => {
                const pos = gridToPixel(m.grid_x, m.grid_y, config);
                const hidden = !m.is_visible_to_players;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow ${
                      hidden
                        ? "border-dashed border-amber-400/80 bg-black/70 text-amber-300"
                        : "border-hero-vibrant bg-hero-dark text-hero-vibrant"
                    }`}
                    style={{
                      left: pos.x + config.cellSizePx / 2,
                      top: pos.y + config.cellSizePx / 2,
                    }}
                    onMouseEnter={() => setHoverMarkerId(m.id)}
                    onMouseLeave={() => setHoverMarkerId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isGm && e.shiftKey) {
                        openEdit(m);
                        return;
                      }
                      openModal(m);
                    }}
                    title={m.name}
                  >
                    <WorldMapIcon icon={m.icon} className="h-4 w-4" />
                  </button>
                );
              })}

              {groupPixel && (isGm || map.group_token_visible) && (
                <WorldMapGroupToken
                  left={groupPixel.x + config.cellSizePx / 2}
                  top={groupPixel.y + config.cellSizePx / 2}
                  cellSize={config.cellSizePx}
                  isCamping={map.group_token_is_camping}
                  isGm={isGm}
                  onToggleCamping={(next) => {
                    startTransition(async () => {
                      try {
                        const updated = await setWorldMapGroupToken({
                          mapId: map.id,
                          worldId,
                          gridX: map.group_token_grid_x,
                          gridY: map.group_token_grid_y,
                          visible: map.group_token_visible,
                          isCamping: next,
                        });
                        setMap(updated);
                        toast.success(
                          next ? "Gruppe kampiert." : "Gruppe ist wieder unterwegs.",
                        );
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Camping konnte nicht gesetzt werden.",
                        );
                      }
                    });
                  }}
                  onMoveToPixel={(clientX, clientY) => {
                    if (!mapRef.current) return;
                    const rect = mapRef.current.getBoundingClientRect();
                    const scaleX = mapSize.width / Math.max(1, rect.width);
                    const scaleY = mapSize.height / Math.max(1, rect.height);
                    const px = (clientX - rect.left) * scaleX;
                    const py = (clientY - rect.top) * scaleY;
                    const cell = pixelToGrid(px, py, config);
                    if (!cell) return;
                    startTransition(async () => {
                      try {
                        const updated = await setWorldMapGroupToken({
                          mapId: map.id,
                          worldId,
                          gridX: cell.gridX,
                          gridY: cell.gridY,
                          visible: true,
                          isCamping: map.group_token_is_camping,
                        });
                        setMap(updated);
                      } catch {
                        /* drag jitter — ignore transient errors */
                      }
                    });
                  }}
                />
              )}

              {pendingCell && (
                <div
                  className="pointer-events-none absolute z-10 border-2 border-hero-vibrant bg-hero-vibrant/20"
                  style={{
                    left: gridToPixel(pendingCell.x, pendingCell.y, config).x,
                    top: gridToPixel(pendingCell.x, pendingCell.y, config).y,
                    width: config.cellSizePx,
                    height: config.cellSizePx,
                  }}
                />
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>

        {hoverMarkerId &&
          (() => {
            const m = visibleMarkers.find((x) => x.id === hoverMarkerId);
            if (!m) return null;
            return (
              <div className="pointer-events-none absolute bottom-3 left-3 z-30 max-w-xs rounded border border-hero-border bg-black/90 px-3 py-2 text-sm text-white">
                <div className="font-barlow font-bold uppercase text-hero-vibrant">
                  {m.name}
                </div>
                {m.description && (
                  <p className="mt-1 line-clamp-3 font-libre text-gray-300 text-xs">
                    {m.description}
                  </p>
                )}
                {!m.is_visible_to_players && isGm && (
                  <p className="mt-1 text-[10px] uppercase text-amber-400">Versteckt</p>
                )}
              </div>
            );
          })()}
      </div>

      {(editingMarker || pendingCell) && isGm && (
        <div className="rounded border border-hero-border bg-background-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-barlow font-bold uppercase text-hero-vibrant">
              {editingMarker ? "Markierung bearbeiten" : "Neue Markierung"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingMarker(null);
                setPendingCell(null);
                setDraft(emptyDraft());
              }}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-barlow text-xs uppercase text-gray-400">Name</span>
              <input
                className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-barlow text-xs uppercase text-gray-400">Icon</span>
              <select
                className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2"
                value={draft.icon}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    icon: e.target.value as WorldMapIconKey,
                  }))
                }
              >
                {WORLD_MAP_ICON_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {WORLD_MAP_ICON_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-barlow text-xs uppercase text-gray-400">
                Beschreibung
              </span>
              <textarea
                rows={3}
                className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2"
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.isVisibleToPlayers}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, isVisibleToPlayers: e.target.checked }))
                }
              />
              <span>Für Spieler sichtbar (enthüllt)</span>
            </label>
            <EntitySelect
              label="Lore"
              value={draft.loreId}
              options={linkOptions.lore}
              onChange={(v) => setDraft((d) => ({ ...d, loreId: v }))}
            />
            <EntitySelect
              label="NPC"
              value={draft.npcId}
              options={linkOptions.npcs}
              onChange={(v) => setDraft((d) => ({ ...d, npcId: v }))}
            />
            <EntitySelect
              label="Fraktion"
              value={draft.factionId}
              options={linkOptions.factions}
              onChange={(v) => setDraft((d) => ({ ...d, factionId: v }))}
            />
            <EntitySelect
              label="Bestarium"
              value={draft.creatureId}
              options={linkOptions.creatures}
              onChange={(v) => setDraft((d) => ({ ...d, creatureId: v }))}
            />
            {campaignId && (
              <label className="block text-sm sm:col-span-2">
                <span className="font-barlow text-xs uppercase text-gray-400">Quest</span>
                <select
                  className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2"
                  value={draft.questId}
                  onChange={(e) => setDraft((d) => ({ ...d, questId: e.target.value }))}
                >
                  <option value="">—</option>
                  {linkOptions.quests.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={saveMarker}
              className="rounded bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-black disabled:opacity-50"
            >
              Speichern
            </button>
            {editingMarker && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        const next = !editingMarker.is_visible_to_players;
                        const saved = await toggleWorldMapMarkerVisibility(
                          editingMarker.id,
                          map.id,
                          worldId,
                          next,
                        );
                        setMarkers((prev) =>
                          prev.map((m) => (m.id === saved.id ? saved : m)),
                        );
                        setEditingMarker(saved);
                        setDraft((d) => ({ ...d, isVisibleToPlayers: next }));
                        toast.success(next ? "Enthüllt." : "Versteckt.");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Fehler.");
                      }
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded border border-hero-border px-3 py-2 text-sm"
                >
                  {editingMarker.is_visible_to_players ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {editingMarker.is_visible_to_players ? "Verstecken" : "Enthüllen"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Markierung löschen?")) return;
                    startTransition(async () => {
                      try {
                        await deleteWorldMapMarker(editingMarker.id, map.id, worldId);
                        setMarkers((prev) =>
                          prev.filter((m) => m.id !== editingMarker.id),
                        );
                        setEditingMarker(null);
                        setPendingCell(null);
                        toast.success("Gelöscht.");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
                      }
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded border border-red-500/50 px-3 py-2 text-sm text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 font-libre">
            Tipp: Shift+Klick auf eine Markierung öffnet die Bearbeitung.
          </p>
        </div>
      )}

      {modalMarker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalMarker(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border border-hero-border bg-background-card p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <WorldMapIcon icon={modalMarker.icon} className="h-6 w-6 text-hero-vibrant" />
                <h3 className="font-barlow text-xl font-bold uppercase text-hero-vibrant">
                  {modalMarker.name}
                </h3>
              </div>
              <button type="button" onClick={() => setModalMarker(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {modalMarker.description && (
              <p className="font-libre text-gray-300 whitespace-pre-wrap">
                {modalMarker.description}
              </p>
            )}
            {(() => {
              const links = buildMarkerEntityLinks(modalMarker, {
                worldId,
                campaignId,
              });
              if (links.length === 0) return null;
              return (
                <div className="space-y-1">
                  <div className="font-barlow text-xs uppercase text-gray-400">Verweise</div>
                  <div className="flex flex-wrap gap-2">
                    {links.map((l) => (
                      <a
                        key={`${l.type}-${l.id}`}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-hero-border px-2 py-1 text-sm text-hero-vibrant hover:border-hero-vibrant"
                      >
                        {l.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2 border-t border-hero-border/40 pt-3">
              <div className="font-barlow text-xs uppercase text-gray-400">
                Spieler-Notizen (für alle sichtbar)
              </div>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {notes.length === 0 && (
                  <li className="text-sm text-gray-500 font-libre">Noch keine Notizen.</li>
                )}
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded border border-hero-border/30 bg-background-dark px-3 py-2 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-barlow text-xs text-hero-vibrant">
                        {n.author_display_name || "Mitglied"}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-red-400"
                        onClick={() => {
                          startTransition(async () => {
                            try {
                              await deleteWorldMapMarkerNote(n.id, worldId);
                              setNotes((prev) => prev.filter((x) => x.id !== n.id));
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Löschen fehlgeschlagen.",
                              );
                            }
                          });
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                    <p className="mt-1 font-libre text-gray-300 whitespace-pre-wrap">{n.body}</p>
                  </li>
                ))}
              </ul>
              <textarea
                rows={2}
                className="w-full rounded border border-hero-border bg-background-dark px-3 py-2 text-sm"
                placeholder="Notiz hinzufügen…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <button
                type="button"
                disabled={pending || !noteBody.trim()}
                className="rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-xs font-bold uppercase text-black disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const note = await addWorldMapMarkerNote({
                        markerId: modalMarker.id,
                        body: noteBody,
                        worldId,
                      });
                      setNotes((prev) => [note, ...prev]);
                      setNoteBody("");
                      toast.success("Notiz gespeichert.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
                    }
                  });
                }}
              >
                Notiz speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <WorldMapGridModal
        open={gridModalOpen}
        title={map.title}
        imageUrl={map.image_url}
        initialGrid={map.grid_config}
        pending={pending}
        onCancel={() => setGridModalOpen(false)}
        onConfirm={(grid: BattlemapGridConfig) => {
          startTransition(async () => {
            try {
              const updated = await updateWorldMap(map.id, worldId, {
                gridConfig: grid,
              });
              setMap(updated);
              setGridModalOpen(false);
              toast.success("Raster gespeichert.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
            }
          });
        }}
      />
    </div>
  );
}

function EntitySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: LinkOpt[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-barlow text-xs uppercase text-gray-400">{label}</span>
      <select
        className="mt-1 w-full rounded border border-hero-border bg-background-dark px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.type ? ` (${o.type})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
