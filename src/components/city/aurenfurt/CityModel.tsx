"use client";

import { useRef } from "react";
import type { Group } from "three";
import {
  AURENFURT_DISTRICTS,
  CITY_BUILDINGS,
  sameSelection,
  type HoloSelection,
} from "./aurenfurt-districts";
import { DistrictNode } from "./DistrictNode";
import { useHoloFloat } from "./hooks/useHoloFloat";
import { HoloBuildingMarker } from "./scene/HoloBuildingMarker";
import { HoloChains } from "./scene/HoloChains";
import { HoloPlatform } from "./scene/HoloPlatform";

type Props = {
  selection: HoloSelection | null;
  hovered: HoloSelection | null;
  onSelect: (selection: HoloSelection | null) => void;
  onHover: (selection: HoloSelection | null) => void;
};

export function CityModel({ selection, hovered, onSelect, onHover }: Props) {
  const floating = useRef<Group>(null);
  useHoloFloat(floating);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]} scale={[1.85, 1, 1]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>

      <group ref={floating}>
        <HoloChains />
        <HoloPlatform onClear={() => onSelect(null)} />
        {AURENFURT_DISTRICTS.map((district) => (
          <DistrictNode
            key={district.id}
            district={district}
            selected={sameSelection(selection, { type: "district", id: district.id })}
            hovered={sameSelection(hovered, { type: "district", id: district.id })}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
        {CITY_BUILDINGS.map((building) => (
          <HoloBuildingMarker
            key={building.id}
            building={building}
            selected={sameSelection(selection, { type: "building", id: building.id })}
            onSelect={(id) => onSelect({ type: "building", id })}
            onHover={(id) => onHover(id ? { type: "building", id } : null)}
          />
        ))}
      </group>
    </>
  );
}
