"use client";

import { useEffect, useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import { motion } from "framer-motion";
import { X, Zap } from "lucide-react";
import * as THREE from "three";
import {
  districtsAffectedByCard,
  markerDistrictForCard,
  type ActiveCityCardEffect,
} from "../aurenfurt-active-city-events";
import { findDistrict, type CityDistrictId } from "../aurenfurt-districts";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import type { DistrictSector } from "../aurenfurt-sectors";
import {
  createPolygonDistrictGeometry,
  DISTRICT_SURFACE_LIFT,
  polygonAnchor,
  surfacePoint,
} from "./diorama-geometry";

type Props = {
  cards: ActiveCityCardEffect[];
  polygons: DistrictPolygons;
  sectorsByDistrict: Partial<Record<CityDistrictId, DistrictSector[]>>;
  /** Viertel, deren Einflussbereich hervorgehoben wird (Hover Rail / Auswahl Blitz). */
  highlightDistrictIds: CityDistrictId[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
};

/** Kräftige Ereignisfarben — bewusst abseits vom HUD-Gold. */
const EVENT_PALETTE = [
  "#e85d04",
  "#d00000",
  "#9b2226",
  "#ae2012",
  "#bb3e03",
  "#ca6702",
  "#bc4749",
  "#6a994e",
] as const;

function colorForCard(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return EVENT_PALETTE[hash % EVENT_PALETTE.length];
}

function matchSectorsForCard(
  card: ActiveCityCardEffect,
  sectorsByDistrict: Partial<Record<CityDistrictId, DistrictSector[]>>,
): DistrictSector[] {
  if (card.scope !== "sector" || !card.districtId || !card.sectorLabel?.trim()) return [];
  const pool = sectorsByDistrict[card.districtId] ?? [];
  if (pool.length === 0) return [];
  const wanted = new Set(
    card.sectorLabel
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  const districtName = (findDistrict(card.districtId)?.name ?? "").toLowerCase();
  return pool.filter((sector) => {
    const address = sector.address.toLowerCase();
    const label = sector.label.toLowerCase();
    return (
      wanted.has(address) ||
      wanted.has(label) ||
      wanted.has(`${districtName} ${label}`.trim())
    );
  });
}

function cardWorldPosition(
  card: ActiveCityCardEffect,
  polygons: DistrictPolygons,
  matchedSectors: DistrictSector[],
): THREE.Vector3 | null {
  if (matchedSectors.length > 0) {
    let x = 0;
    let y = 0;
    let z = 0;
    let count = 0;
    for (const sector of matchedSectors) {
      const c = sector.centroid;
      if (!c || !Number.isFinite(c.u) || !Number.isFinite(c.v)) continue;
      const world = surfacePoint(c.u, c.v);
      x += world.x;
      y += world.y;
      z += world.z;
      count += 1;
    }
    if (count > 0) return new THREE.Vector3(x / count, y / count, z / count);
  }

  const districtId = markerDistrictForCard(card);
  if (!districtId) return null;
  const points = polygons[districtId]?.points ?? [];
  if (points.length < 3) return null;
  return polygonAnchor(points);
}

/**
 * Marker + farbiger Einflussbereich für aktive Stadt-Ereigniskarten.
 * Viertel-Events füllen das Viertel; Sektor-Events zeigen die Felder bei Auswahl.
 */
export function ActiveCityEventLayer({
  cards,
  polygons,
  sectorsByDistrict,
  highlightDistrictIds,
  selectedCardId,
  onSelectCard,
}: Props) {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const markers = useMemo(() => {
    return cards
      .map((card) => {
        const matched = matchSectorsForCard(card, sectorsByDistrict);
        const position = cardWorldPosition(card, polygons, matched);
        if (!position) return null;
        return {
          card,
          position,
          color: colorForCard(card.id),
          matchedSectors: matched,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  }, [cards, polygons, sectorsByDistrict]);

  const focusCardId = selectedCardId ?? hoveredCardId;
  const focusCard = cards.find((card) => card.id === focusCardId) ?? null;
  const focusColor = focusCard ? colorForCard(focusCard.id) : "#e85d04";
  // Sektoren schon beim Hover über den Blitz — Auswahl hält sie sichtbar.
  const showSectorsForCardId =
    focusCard?.scope === "sector" ? focusCard.id : null;

  const reachDistrictIds = useMemo(() => {
    const ids = new Set<CityDistrictId>(highlightDistrictIds);
    const addDistrictFill = (card: ActiveCityCardEffect) => {
      // Sektor-Events: kein Viertel-Flood — nur Marker + Sektor-Highlight.
      if (card.scope !== "district") return;
      for (const id of districtsAffectedByCard(card)) ids.add(id);
    };
    if (focusCard) addDistrictFill(focusCard);
    else for (const card of cards) addDistrictFill(card);
    return [...ids];
  }, [cards, focusCard, highlightDistrictIds]);

  const districtColorById = useMemo(() => {
    const map = new Map<CityDistrictId, string>();
    const paint = (card: ActiveCityCardEffect) => {
      if (card.scope !== "district") return;
      const color = colorForCard(card.id);
      for (const id of districtsAffectedByCard(card)) {
        if (!map.has(id)) map.set(id, color);
      }
    };
    if (focusCard) {
      paint(focusCard);
      return map;
    }
    for (const card of cards) paint(card);
    return map;
  }, [cards, focusCard]);

  const reachMeshes = useMemo(() => {
    return reachDistrictIds
      .map((districtId) => {
        const points = polygons[districtId]?.points ?? [];
        if (points.length < 3) return null;
        return {
          id: districtId,
          geometry: createPolygonDistrictGeometry(points),
          color: districtColorById.get(districtId) ?? focusColor,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  }, [districtColorById, focusColor, polygons, reachDistrictIds]);

  const sectorReveal = useMemo(() => {
    if (!showSectorsForCardId) return [] as Array<{ id: string; geometry: THREE.BufferGeometry; color: string }>;
    const marker = markers.find((entry) => entry.card.id === showSectorsForCardId);
    if (!marker || marker.matchedSectors.length === 0) return [];
    return marker.matchedSectors
      .map((sector) => {
        if (!Array.isArray(sector.polygon) || sector.polygon.length < 3) return null;
        return {
          id: sector.id,
          geometry: createPolygonDistrictGeometry(sector.polygon),
          color: marker.color,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);
  }, [markers, showSectorsForCardId]);

  useEffect(
    () => () => {
      for (const mesh of reachMeshes) mesh.geometry.dispose();
      for (const mesh of sectorReveal) mesh.geometry.dispose();
    },
    [reachMeshes, sectorReveal],
  );

  const selected = cards.find((card) => card.id === selectedCardId) ?? null;
  const selectedMarker = markers.find((entry) => entry.card.id === selectedCardId) ?? null;

  return (
    <group>
      {reachMeshes.map((mesh) => (
        <mesh key={mesh.id} geometry={mesh.geometry} renderOrder={5} raycast={() => undefined}>
          <meshBasicMaterial
            color={mesh.color}
            transparent
            opacity={focusCard ? 0.34 : 0.2}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {sectorReveal.map((mesh) => (
        <mesh key={mesh.id} geometry={mesh.geometry} position={[0, 0.02, 0]} renderOrder={7} raycast={() => undefined}>
          <meshBasicMaterial
            color={mesh.color}
            transparent
            opacity={0.55}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {markers.map(({ card, position, color }) => (
        <group key={card.id} position={[position.x, position.y + DISTRICT_SURFACE_LIFT + 0.08, position.z]}>
          <Html center zIndexRange={[110, 0]} style={{ pointerEvents: "auto" }}>
            <ZapMarkerButton
              title={card.title}
              color={color}
              active={selectedCardId === card.id}
              onClick={() => onSelectCard(selectedCardId === card.id ? null : card.id)}
              onHoverChange={(hot) => setHoveredCardId(hot ? card.id : null)}
            />
          </Html>
        </group>
      ))}

      {selected && selectedMarker ? (
        <Html
          center
          position={[
            selectedMarker.position.x,
            selectedMarker.position.y + DISTRICT_SURFACE_LIFT + 0.42,
            selectedMarker.position.z,
          ]}
          zIndexRange={[130, 0]}
          style={{ pointerEvents: "auto" }}
        >
          <ActiveCardInfoPopup
            card={selected}
            color={selectedMarker.color}
            onClose={() => onSelectCard(null)}
          />
        </Html>
      ) : null}
    </group>
  );
}

function ZapMarkerButton({
  title,
  color,
  active,
  onClick,
  onHoverChange,
}: {
  title: string;
  color: string;
  active: boolean;
  onClick: () => void;
  onHoverChange?: (hot: boolean) => void;
}) {
  const [hot, setHot] = useState(false);

  function setHover(next: boolean) {
    setHot(next);
    onHoverChange?.(next);
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={`Aktives Stadtereignis: ${title}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg transition-transform duration-200"
      style={{
        borderColor: color,
        backgroundColor: active || hot ? color : "rgba(10, 31, 16, 0.92)",
        color: active || hot ? "#0a1f10" : color,
        transform: active || hot ? "scale(1.12)" : "scale(1)",
      }}
    >
      <Zap className="h-4 w-4" fill="currentColor" aria-hidden />
    </button>
  );
}

function ActiveCardInfoPopup({
  card,
  color,
  onClose,
}: {
  card: ActiveCityCardEffect;
  color: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-[min(14rem,55vw)] rounded border-2 bg-background-card/95 px-2.5 py-2 shadow-2xl"
      style={{ borderColor: color }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-cinzel text-sm font-bold leading-snug" style={{ color }}>
          {card.title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-gray-400 hover:text-white"
          aria-label="Info schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.imageUrl}
          alt=""
          className="mt-1.5 aspect-[5/3] w-full rounded border border-hero-dark/70 object-cover"
          draggable={false}
        />
      ) : null}
      {card.body ? (
        <p className="mt-1 max-h-16 overflow-y-auto font-libre text-[11px] leading-snug text-gray-200">
          {card.body}
        </p>
      ) : null}
    </motion.div>
  );
}
