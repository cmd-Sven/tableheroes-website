"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide } from "three";
import type { CityDistrict, CityDistrictId, HoloSelection } from "./aurenfurt-districts";
import type { UvPoint } from "./aurenfurt-district-polygons";
import { DistrictPolygonOverlay } from "./scene/DistrictPolygonOverlay";
import {
  createPolygonDistrictGeometry,
  DISTRICT_OUTLINE_LIFT,
  surfacePoint,
} from "./scene/diorama-geometry";

type Props = {
  district: CityDistrict;
  points: UvPoint[];
  color: string;
  hoverOpacity: number;
  selected: boolean;
  hovered: boolean;
  /** Editor offen und dieses Viertel aktiv zum Ziehen gewählt. */
  showHandles: boolean;
  /** Editor offen – gewählte Fläche bleibt sichtbar eingefärbt. */
  editingActive: boolean;
  /** Ort-Schritt: Viertel bleiben sichtbar, damit der Klick trifft. */
  highlight?: boolean;
  suppressSelect: boolean;
  onSelect: (selection: HoloSelection) => void;
  onHover: (selection: HoloSelection | null) => void;
  onMoveVertex: (districtId: CityDistrictId, index: number, point: UvPoint) => void;
  onCommit: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

export function DistrictNode({
  district,
  points,
  color,
  hoverOpacity,
  selected,
  hovered,
  showHandles,
  editingActive,
  highlight = false,
  suppressSelect,
  onSelect,
  onHover,
  onMoveVertex,
  onCommit,
  onOrbitLock,
  onDragActive,
}: Props) {
  const suppressRef = useRef(suppressSelect);
  suppressRef.current = suppressSelect;

  const geometry = useMemo(() => createPolygonDistrictGeometry(points), [points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const opacity = editingActive
    ? hovered
      ? hoverOpacity
      : 0.28
    : highlight
      ? hovered
        ? 0.42
        : 0.24
    : selected
      ? 0.42
      : hovered
        ? Math.max(0.08, Math.min(0.18, hoverOpacity * 0.55))
        : 0.03;

  const selectionOutline = useMemo(() => {
    if (!selected || showHandles || points.length < 2) return null;
    const positions: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
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
    if (positions.length < 6) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: "#cab926",
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.renderOrder = 6;
    lines.raycast = () => undefined;
    return lines;
  }, [points, selected, showHandles]);

  useEffect(
    () => () => {
      if (!selectionOutline) return;
      selectionOutline.geometry.dispose();
      if (Array.isArray(selectionOutline.material)) {
        selectionOutline.material.forEach((material) => material.dispose());
      } else {
        selectionOutline.material.dispose();
      }
    },
    [selectionOutline],
  );

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (suppressRef.current) return;
    onSelect({ type: "district", id: district.id });
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    document.body.style.cursor = showHandles ? "default" : "pointer";
    onHover({ type: "district", id: district.id });
  }

  function out() {
    document.body.style.cursor = "";
    onHover(null);
  }

  return (
    <group>
      <mesh
        geometry={geometry}
        renderOrder={2}
        // Während Zeichnen/Drag: keine Handler → Ray fällt zur Zeichenfläche durch.
        onClick={suppressSelect ? undefined : select}
        onPointerOver={suppressSelect ? undefined : over}
        onPointerOut={suppressSelect ? undefined : out}
      >
        <meshBasicMaterial
          color={selected && !editingActive ? "#cab926" : color}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      {selectionOutline ? <primitive object={selectionOutline} /> : null}
      {showHandles ? (
        <DistrictPolygonOverlay
          districtId={district.id}
          points={points}
          tint={color}
          onMoveVertex={onMoveVertex}
          onCommit={onCommit}
          onOrbitLock={onOrbitLock}
          onDragActive={onDragActive}
        />
      ) : null}
    </group>
  );
}
