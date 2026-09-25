"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { CITY_BUILDINGS } from "../aurenfurt-districts";
import { HoloBuildingMarker } from "./HoloBuildingMarker";
import { HoloChains } from "./HoloChains";
import { HoloPlatform } from "./HoloPlatform";

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
};

export function HoloCityScene({ selectedId, onSelect, onHover }: Props) {
  const floating = useRef<Group>(null);

  useFrame((state) => {
    if (!floating.current) return;
    floating.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.055;
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]} scale={[1.85, 1, 1]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>

      <group ref={floating}>
        <HoloChains />
        <HoloPlatform onClear={() => onSelect(null)} />
        {CITY_BUILDINGS.map((building) => (
          <HoloBuildingMarker
            key={building.id}
            building={building}
            selected={building.id === selectedId}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </group>
    </>
  );
}
