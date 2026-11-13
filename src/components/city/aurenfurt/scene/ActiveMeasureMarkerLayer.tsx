"use client";

/**
 * Gelbe Ausrufezeichen für aktive Automatismen / Gegenreaktionen / NPC-Karten.
 * Stadt-/Kaiser-Ereignisse bleiben beim Blitz (ActiveCityEventLayer).
 */

import { useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import { X } from "lucide-react";
import * as THREE from "three";
import {
  activeMeasureKindLabel,
  type ActiveMeasureMapMarker,
} from "../aurenfurt-active-measures";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import { DISTRICT_SURFACE_LIFT, polygonAnchor } from "./diorama-geometry";

type Props = {
  markers: ActiveMeasureMapMarker[];
  polygons: DistrictPolygons;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const MARKER_GOLD = "#cab926";

function markerWorldPosition(
  districtId: ActiveMeasureMapMarker["districtId"],
  polygons: DistrictPolygons,
  slot: number,
  slotsInDistrict: number,
): THREE.Vector3 | null {
  const points = polygons[districtId]?.points ?? [];
  if (points.length < 3) return null;
  const base = polygonAnchor(points);
  if (slotsInDistrict <= 1) return base;
  const angle = (slot / slotsInDistrict) * Math.PI * 2;
  const radius = 0.42;
  return new THREE.Vector3(
    base.x + Math.cos(angle) * radius,
    base.y,
    base.z + Math.sin(angle) * radius,
  );
}

export function ActiveMeasureMarkerLayer({
  markers,
  polygons,
  selectedId,
  onSelect,
}: Props) {
  const placed = useMemo(() => {
    const byDistrict = new Map<string, ActiveMeasureMapMarker[]>();
    for (const marker of markers) {
      const list = byDistrict.get(marker.districtId) ?? [];
      list.push(marker);
      byDistrict.set(marker.districtId, list);
    }

    const out: Array<{
      marker: ActiveMeasureMapMarker;
      position: THREE.Vector3;
    }> = [];

    for (const [, group] of byDistrict) {
      group.forEach((marker, slot) => {
        const position = markerWorldPosition(
          marker.districtId,
          polygons,
          slot,
          group.length,
        );
        if (!position) return;
        out.push({ marker, position });
      });
    }
    return out;
  }, [markers, polygons]);

  const selected = placed.find((entry) => entry.marker.id === selectedId) ?? null;

  return (
    <group>
      {placed.map(({ marker, position }) => (
        <group
          key={marker.id}
          position={[position.x, position.y + DISTRICT_SURFACE_LIFT + 0.1, position.z]}
        >
          <Html center zIndexRange={[16, 0]} style={{ pointerEvents: "auto" }}>
            <MeasureBangButton
              title={marker.title}
              active={selectedId === marker.id}
              onClick={() => onSelect(selectedId === marker.id ? null : marker.id)}
            />
          </Html>
        </group>
      ))}

      {selected ? (
        <Html
          center
          position={[
            selected.position.x,
            selected.position.y + DISTRICT_SURFACE_LIFT + 0.48,
            selected.position.z,
          ]}
          zIndexRange={[21, 0]}
          style={{ pointerEvents: "auto" }}
        >
          <MeasureInfoPopup marker={selected.marker} onClose={() => onSelect(null)} />
        </Html>
      ) : null}
    </group>
  );
}

function MeasureBangButton({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hot, setHot] = useState(false);
  const lit = active || hot;

  return (
    <button
      type="button"
      title={title}
      aria-label={`Aktive Maßnahme: ${title}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      className="flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-transform duration-200"
      style={{
        borderColor: MARKER_GOLD,
        backgroundColor: lit ? MARKER_GOLD : "rgba(10, 31, 16, 0.92)",
        color: lit ? "#0a1f10" : MARKER_GOLD,
        transform: lit ? "scale(1.1)" : "scale(1)",
      }}
    >
      <span className="font-barlow text-base font-extrabold leading-none" aria-hidden>
        !
      </span>
    </button>
  );
}

function MeasureInfoPopup({
  marker,
  onClose,
}: {
  marker: ActiveMeasureMapMarker;
  onClose: () => void;
}) {
  return (
    <div
      className="w-[min(16rem,70vw)] rounded-md border-2 bg-background-card/95 p-2.5 shadow-2xl backdrop-blur-sm"
      style={{ borderColor: MARKER_GOLD }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
            {activeMeasureKindLabel(marker.kind)}
          </p>
          <p className="mt-0.5 font-cinzel text-sm font-bold leading-snug text-white">
            {marker.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <p className="mt-2 font-libre text-[11px] leading-relaxed text-gray-200">
        {marker.detail}
      </p>
      {marker.effectsLabel ? (
        <p className="mt-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
          {marker.effectsLabel}
        </p>
      ) : null}
    </div>
  );
}
