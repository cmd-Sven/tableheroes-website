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
    <mesh geometry={geometry} renderOrder={5} onClick={pick}>
      <meshBasicMaterial
        color={selected ? "#cab926" : "#379806"}
        transparent
        opacity={selected ? 0.5 : 0.18}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
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
      {!preview
        ? sectors.map((sector) => {
            const centroid = sector.centroid;
            if (
              !centroid ||
              !Number.isFinite(centroid.u) ||
              !Number.isFinite(centroid.v)
            ) {
              return null;
            }
            const world = surfacePoint(centroid.u, centroid.v);
            return (
              <Html
                key={sector.id}
                position={[world.x, world.y + DISTRICT_OUTLINE_LIFT + 0.02, world.z]}
                center
                distanceFactor={7.5}
                style={{ pointerEvents: "none", userSelect: "none" }}
                zIndexRange={[100, 0]}
              >
                <span
                  className="whitespace-nowrap font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                  aria-hidden
                >
                  {sector.label}
                </span>
              </Html>
            );
          })
        : null}
    </group>
  );
}
