"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide } from "three";
import type { BuildingKind, CityBuilding } from "../aurenfurt-districts";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, surfacePoint } from "./diorama-geometry";
import { LANDMARK_SCALE_DEFAULT } from "../aurenfurt-landmark-scales";
import { HoloLandmarkMesh } from "./HoloLandmarkMesh";

type Props = {
  building: CityBuilding;
  /** Effektive UV (Code-Default oder Override). */
  u: number;
  v: number;
  selected: boolean;
  suppressSelect: boolean;
  /** Drag-Anfasser nur für das gewählte Editor-Viertel. */
  editable: boolean;
  /** Liegt außerhalb des aktuellen Viertel-Polygons. */
  outside: boolean;
  /** Multiplikator für 3D-Landmark auf der Karte. */
  landmarkScale?: number;
  /** Drehung der 3D-Landmark um die Hochachse, in Grad. */
  landmarkRotation?: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onMove: (id: string, point: UvPoint) => void;
  onCommit: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

export function HoloBuildingMarker({
  building,
  u,
  v,
  selected,
  suppressSelect,
  editable,
  outside,
  landmarkScale = LANDMARK_SCALE_DEFAULT,
  landmarkRotation = 0,
  onSelect,
  onHover,
  onMove,
  onCommit,
  onOrbitLock,
  onDragActive,
}: Props) {
  const suppressRef = useRef(suppressSelect);
  suppressRef.current = suppressSelect;

  const position = useMemo(() => surfacePoint(u, v), [u, v]);

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (suppressRef.current) return;
    onSelect(building.id);
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    document.body.style.cursor = editable ? "default" : "pointer";
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
      onClick={suppressSelect ? undefined : select}
      onPointerOver={suppressSelect ? undefined : over}
      onPointerOut={suppressSelect ? undefined : out}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={building.landmark ? [0.18, 0.24] : [0.07, 0.11]} />
        <meshBasicMaterial
          color={selected ? "#ffe7a3" : outside ? "#ef4444" : "#9af6ff"}
          transparent
          opacity={0.9}
          side={DoubleSide}
        />
      </mesh>
      {building.landmark ? (
        <HoloLandmarkMesh
          model={building.landmark}
          scaleMultiplier={landmarkScale}
          rotationDegrees={landmarkRotation}
        />
      ) : (
        <>
          <BuildingShape kind={building.kind} selected={selected} />
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.012, 0.012, selected ? 0.58 : 0.4, 6]} />
            <meshBasicMaterial
              color={selected ? "#ffe7a3" : outside ? "#ef4444" : "#9af6ff"}
              transparent
              opacity={0.92}
            />
          </mesh>
          <mesh position={[0, selected ? 0.66 : 0.56, 0]}>
            <sphereGeometry args={[0.034, 10, 10]} />
            <meshBasicMaterial color={selected ? "#fff4c8" : outside ? "#fecaca" : "#e9fdff"} />
          </mesh>
        </>
      )}
      {outside ? (
        <group position={[0, building.landmark ? 0.55 : 0.82, 0]} renderOrder={6}>
          <mesh>
            <octahedronGeometry args={[0.055, 0]} />
            <meshBasicMaterial color="#ef4444" depthTest={false} />
          </mesh>
          <mesh scale={1.35}>
            <octahedronGeometry args={[0.055, 0]} />
            <meshBasicMaterial color="#7f1d1d" transparent opacity={0.45} depthTest={false} />
          </mesh>
        </group>
      ) : null}
      {editable ? (
        <BuildingDragHandle
          buildingId={building.id}
          point={{ u, v }}
          onMove={onMove}
          onCommit={onCommit}
          onOrbitLock={onOrbitLock}
          onDragActive={onDragActive}
        />
      ) : null}
      <mesh visible={false} position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.36, 10, 10]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

type HandleProps = {
  buildingId: string;
  point: UvPoint;
  onMove: (id: string, point: UvPoint) => void;
  onCommit: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

function BuildingDragHandle({
  buildingId,
  point,
  onMove,
  onCommit,
  onOrbitLock,
  onDragActive,
}: HandleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const worldScratch = useMemo(() => new THREE.Vector3(), []);
  const listenersRef = useRef<{ move: (ev: PointerEvent) => void; up: (ev: PointerEvent) => void } | null>(
    null,
  );

  const world = surfacePoint(point.u, point.v);

  useEffect(
    () => () => {
      const listeners = listenersRef.current;
      if (!listeners) return;
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.up);
      listenersRef.current = null;
    },
    [],
  );

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onOrbitLock(true);
    onDragActive(true);

    const move = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -(((ev.clientY - rect.top) / rect.height) * 2) + 1,
      );
      raycaster.setFromCamera(ndc, camera);

      const planeY = meshRef.current ? meshRef.current.getWorldPosition(worldScratch).y : world.y;
      plane.set(new THREE.Vector3(0, 1, 0), -planeY);

      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      onMove(buildingId, worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      listenersRef.current = null;
      onOrbitLock(false);
      onDragActive(false);
      onCommit();
    };

    listenersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <group position={[0, 0.95, 0]}>
      <mesh
        ref={meshRef}
        renderOrder={7}
        onPointerDown={onPointerDown}
        onClick={(event) => event.stopPropagation()}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[0.11, 0.11, 0.11]} />
        <meshBasicMaterial color="#cab926" transparent opacity={0.98} depthTest={false} />
      </mesh>
      <mesh renderOrder={7} position={[0, 0.09, 0]}>
        <coneGeometry args={[0.05, 0.09, 4]} />
        <meshBasicMaterial color="#23c763" transparent opacity={0.9} depthTest={false} />
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
