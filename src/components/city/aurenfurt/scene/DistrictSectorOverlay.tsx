"use client";

import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { DistrictSector } from "../aurenfurt-sectors";
import {
  createPolygonDistrictGeometry,
  DISTRICT_OUTLINE_LIFT,
  surfacePoint,
} from "./diorama-geometry";

type Props = {
  sectors: DistrictSector[];
  /** Vorschau vor dem Speichern: dezentere Linien, keine Labels. */
  preview?: boolean;
  /** Klickbare Flächen, z. B. im Stadtereignis-Assistenten. */
  pickable?: boolean;
  selectedIds?: string[];
  onPick?: (sector: DistrictSector) => void;
};

function SectorLabel({ sector, emphasize }: { sector: DistrictSector; emphasize?: boolean }) {
  const centroid = sector.centroid;
  if (!centroid || !Number.isFinite(centroid.u) || !Number.isFinite(centroid.v)) {
    return null;
  }
  const world = surfacePoint(centroid.u, centroid.v);
  return (
    <Html
      position={[world.x, world.y + DISTRICT_OUTLINE_LIFT + 0.05, world.z]}
      center
      sprite
      distanceFactor={emphasize ? 5.5 : 8}
      style={{ pointerEvents: "none", userSelect: "none" }}
      zIndexRange={[160, 120]}
    >
      <span
        className={`whitespace-nowrap rounded px-1.5 py-0.5 font-barlow font-bold uppercase tracking-wide text-accent-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ${
          emphasize
            ? "border border-accent-gold/70 bg-background-dark/90 text-[11px]"
            : "bg-background-dark/80 text-[9px]"
        }`}
        aria-hidden
      >
        {sector.label}
      </span>
    </Html>
  );
}

function SectorHit({
  sector,
  selected,
  onPick,
}: {
  sector: DistrictSector;
  selected: boolean;
  onPick: (sector: DistrictSector) => void;
}) {
  const geometry = useMemo(() => createPolygonDistrictGeometry(sector.polygon), [sector.polygon]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  function pick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onPick(sector);
  }

  return (
    <group>
      <mesh
        geometry={geometry}
        position={[0, 0.02, 0]}
        renderOrder={8}
        onClick={pick}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <meshBasicMaterial
          color={selected ? "#cab926" : "#379806"}
          transparent
          opacity={selected ? 0.5 : 0.22}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {selected ? <SectorLabel sector={sector} emphasize /> : null}
    </group>
  );
}

/**
 * Sektorgrenzen und Bezeichnungen nur für das gewählte Viertel.
 * Im Editor ohne Klicks, im Stadtereignis-Assistenten mit treffbaren Flächen.
 */
export function DistrictSectorOverlay({
  sectors,
  preview = false,
  pickable = false,
  selectedIds = [],
  onPick,
}: Props) {
  const lineObject = useMemo(() => {
    const positions: number[] = [];
    for (const sector of sectors) {
      const pts = sector.polygon;
      if (!Array.isArray(pts) || pts.length < 2) continue;
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (
          !a ||
          !b ||
          !Number.isFinite(a.u) ||
          !Number.isFinite(a.v) ||
          !Number.isFinite(b.u) ||
          !Number.isFinite(b.v)
        ) {
          continue;
        }
        const wa = surfacePoint(a.u, a.v);
        const wb = surfacePoint(b.u, b.v);
        positions.push(
          wa.x,
          wa.y + DISTRICT_OUTLINE_LIFT,
          wa.z,
          wb.x,
          wb.y + DISTRICT_OUTLINE_LIFT,
          wb.z,
        );
      }
    }

    if (positions.length < 6) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: preview ? "#8a9a6a" : "#cab926",
      transparent: true,
      opacity: preview ? 0.38 : 0.72,
      depthTest: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.renderOrder = 3;
    lines.raycast = () => undefined;
    return lines;
  }, [preview, sectors]);

  useEffect(
    () => () => {
      if (!lineObject) return;
      lineObject.geometry.dispose();
      if (Array.isArray(lineObject.material)) {
        lineObject.material.forEach((m) => m.dispose());
      } else {
        lineObject.material.dispose();
      }
    },
    [lineObject],
  );

  const editorLabels = useMemo(() => {
    if (preview || pickable) return [] as DistrictSector[];
    if (sectors.length > 48) return [] as DistrictSector[];
    return sectors;
  }, [pickable, preview, sectors]);

  if (sectors.length === 0) return null;

  return (
    <group>
      {pickable && onPick
        ? sectors.map((sector) =>
            Array.isArray(sector.polygon) && sector.polygon.length >= 3 ? (
              <SectorHit
                key={sector.id}
                sector={sector}
                selected={selectedIds.includes(sector.id)}
                onPick={onPick}
              />
            ) : null,
          )
        : null}
      {lineObject ? <primitive object={lineObject} /> : null}
      {editorLabels.map((sector) => (
        <SectorLabel key={sector.id} sector={sector} />
      ))}
    </group>
  );
}
