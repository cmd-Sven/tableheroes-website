"use client";

import { useMemo } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";
import { surfacePoint } from "./diorama-geometry";

type Props = {
  poi: AurenfurtMapPoi;
  selected: boolean;
  suppressSelect: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

/** Kleiner Gold-Ring-Pin — optisch von Gebäude-Markern unterscheidbar. */
export function HoloPoiMarker({ poi, selected, suppressSelect, onSelect, onHover }: Props) {
  const position = useMemo(() => surfacePoint(poi.u, poi.v), [poi.u, poi.v]);

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (suppressSelect) return;
    onSelect(poi.id);
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover(poi.id);
  }

  function out() {
    document.body.style.cursor = "";
    onHover(null);
  }

  return (
    <group
      position={position}
      scale={selected ? 1.2 : 1}
      onClick={suppressSelect ? undefined : select}
      onPointerOver={suppressSelect ? undefined : over}
      onPointerOut={suppressSelect ? undefined : out}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.045, 0.07]} />
        <meshBasicMaterial
          color={selected ? "#ffe7a3" : "#cab926"}
          transparent
          opacity={0.95}
          side={DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[0.028, 16]} />
        <meshBasicMaterial color={selected ? "#fff4c8" : "#f0d85a"} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.008, 0.008, selected ? 0.32 : 0.24, 6]} />
        <meshBasicMaterial color="#cab926" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, selected ? 0.4 : 0.34, 0]}>
        <octahedronGeometry args={[0.028, 0]} />
        <meshBasicMaterial color={selected ? "#fff4c8" : "#cab926"} />
      </mesh>
      <mesh visible={false} position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
