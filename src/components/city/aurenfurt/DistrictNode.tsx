"use client";

import { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { CityDistrict, HoloSelection } from "./aurenfurt-districts";
import { createDistrictGeometry } from "./scene/diorama-geometry";

type Props = {
  district: CityDistrict;
  selected: boolean;
  hovered: boolean;
  onSelect: (selection: HoloSelection) => void;
  onHover: (selection: HoloSelection | null) => void;
};

export function DistrictNode({ district, selected, hovered, onSelect, onHover }: Props) {
  const geometry = useMemo(
    () => createDistrictGeometry(district.start, district.end, district.inner, district.outer),
    [district.end, district.inner, district.outer, district.start],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  const opacity = selected ? 0.2 : hovered ? 0.11 : 0.03;

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect({ type: "district", id: district.id });
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover({ type: "district", id: district.id });
  }

  function out() {
    document.body.style.cursor = "";
    onHover(null);
  }

  return (
    <mesh
      geometry={geometry}
      renderOrder={2}
      onClick={select}
      onPointerOver={over}
      onPointerOut={out}
    >
      <meshBasicMaterial
        color={district.tint}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
