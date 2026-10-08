"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { CityDistrict, CityDistrictId, HoloSelection } from "./aurenfurt-districts";
import type { UvPoint } from "./aurenfurt-district-polygons";
import { DistrictPolygonOverlay } from "./scene/DistrictPolygonOverlay";
import { createPolygonDistrictGeometry } from "./scene/diorama-geometry";

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
      ? 0.2
      : hovered
        ? Math.max(0.08, Math.min(0.18, hoverOpacity * 0.55))
        : 0.03;

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
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
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
