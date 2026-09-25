"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { BuildingKind, CityBuilding } from "../aurenfurt-districts";
import { surfacePoint } from "./diorama-geometry";

type Props = {
  building: CityBuilding;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

export function HoloBuildingMarker({ building, selected, onSelect, onHover }: Props) {
  const position = useMemo(
    () => surfacePoint(building.u, building.v),
    [building.u, building.v],
  );

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(building.id);
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover(building.id);
  }

  function out() {
    document.body.style.cursor = "";
    onHover(null);
  }

  return (
    <group
      position={position}
      scale={selected ? 1.18 : 1}
      onClick={select}
      onPointerOver={over}
      onPointerOut={out}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.07, 0.11, 20]} />
        <meshBasicMaterial
          color={selected ? "#ffe7a3" : "#9af6ff"}
          transparent
          opacity={0.9}
          side={DoubleSide}
        />
      </mesh>
      <BuildingShape kind={building.kind} selected={selected} />
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.012, 0.012, selected ? 0.58 : 0.4, 6]} />
        <meshBasicMaterial color={selected ? "#ffe7a3" : "#9af6ff"} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, selected ? 0.66 : 0.56, 0]}>
        <sphereGeometry args={[0.034, 10, 10]} />
        <meshBasicMaterial color={selected ? "#fff4c8" : "#e9fdff"} />
      </mesh>
      <mesh visible={false} position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.36, 10, 10]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

function Solid({
  color,
  selected,
  metalness = 0.25,
}: {
  color: string;
  selected: boolean;
  metalness?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.4}
      metalness={metalness}
      emissive={selected ? "#ffe7a0" : color}
      emissiveIntensity={selected ? 0.4 : 0.12}
    />
  );
}

function BuildingShape({ kind, selected }: { kind: BuildingKind; selected: boolean }) {
  if (kind === "palace") {
    return (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.08, 8]} />
          <Solid color="#d9d3c4" selected={selected} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.11, 18, 14]} />
          <Solid color="#f0d15a" selected={selected} metalness={0.7} />
        </mesh>
      </group>
    );
  }

  if (kind === "temple") {
    return (
      <group>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.06, 8]} />
          <Solid color="#efe6cf" selected={selected} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <sphereGeometry args={[0.075, 16, 12]} />
          <Solid color="#e6c14a" selected={selected} metalness={0.65} />
        </mesh>
      </group>
    );
  }

  if (kind === "gate") {
    return (
      <group>
        <mesh position={[-0.07, 0.08, 0]}>
          <boxGeometry args={[0.045, 0.16, 0.05]} />
          <Solid color="#d5dbe3" selected={selected} metalness={0.15} />
        </mesh>
        <mesh position={[0.07, 0.08, 0]}>
          <boxGeometry args={[0.045, 0.16, 0.05]} />
          <Solid color="#d5dbe3" selected={selected} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.2, 0.04, 0.06]} />
          <Solid color="#d5dbe3" selected={selected} metalness={0.15} />
        </mesh>
      </group>
    );
  }

  if (kind === "smithy") {
    return (
      <group>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.16, 0.12, 0.12]} />
          <Solid color="#8d5a3c" selected={selected} />
        </mesh>
        <mesh position={[0.05, 0.16, 0]}>
          <cylinderGeometry args={[0.025, 0.03, 0.12, 8]} />
          <meshStandardMaterial color="#5c4034" emissive="#ff6a2a" emissiveIntensity={0.85} />
        </mesh>
      </group>
    );
  }

  if (kind === "tavern") {
    return (
      <group>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.14, 0.1, 0.12]} />
          <Solid color="#e7d3b0" selected={selected} />
        </mesh>
        <mesh position={[0, 0.13, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.12, 0.09, 4]} />
          <Solid color="#8c3a32" selected={selected} metalness={0.1} />
        </mesh>
      </group>
    );
  }

  if (kind === "market") {
    return (
      <group>
        {[-0.06, 0, 0.06].map((x, index) => (
          <mesh key={x} position={[x, 0.05, 0]}>
            <coneGeometry args={[0.045, 0.08, 4]} />
            <Solid color={index === 1 ? "#d98a4a" : "#c4553a"} selected={selected} metalness={0.05} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "garden") {
    return (
      <mesh position={[0, 0.04, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.09, 14, 10]} />
        <Solid color="#7dbe6a" selected={selected} metalness={0.05} />
      </mesh>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.12, 0.14, 0.1]} />
        <Solid color="#8eb4e8" selected={selected} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <coneGeometry args={[0.09, 0.07, 4]} />
        <Solid color="#4d6e99" selected={selected} />
      </mesh>
    </group>
  );
}
