"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide } from "three";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, DISTRICT_SURFACE_LIFT, surfacePoint } from "./diorama-geometry";

type Props = {
  poi: AurenfurtMapPoi;
  worldId: string;
  campaignId?: string | null;
  selected: boolean;
  suppressSelect: boolean;
  /** Im Orte-Editor: Token frei ziehen, ohne Sektor-Raster. */
  editable?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onMove?: (poiId: string, point: UvPoint) => void;
  onCommit?: (poiId: string) => void;
  onOrbitLock?: (locked: boolean) => void;
  onDragActive?: (active: boolean) => void;
};

const TOKEN_R = 0.085;
const GOLD = "#cab926";
const DARK = "#0a1f10";
const LIT = "#1a4a28";

/** Flacher Token: Hover zeigt nur den Namen, Klick öffnet das Seitenfenster. */
export function HoloPoiMarker({
  poi,
  selected,
  suppressSelect,
  editable = false,
  onSelect,
  onHover,
  onMove,
  onCommit,
  onOrbitLock,
  onDragActive,
}: Props) {
  const { camera, gl } = useThree();
  const [hot, setHot] = useState(false);
  const draggingRef = useRef(false);
  const listenersRef = useRef<{ move: (ev: PointerEvent) => void; up: () => void } | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const position = useMemo(() => surfacePoint(poi.u, poi.v), [poi.u, poi.v]);
  const lift = DISTRICT_SURFACE_LIFT + 0.02;
  const lit = selected || hot || draggingRef.current;

  const fillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: lit ? LIT : DARK,
        transparent: true,
        opacity: 0.97,
        depthWrite: false,
        side: DoubleSide,
      }),
    [lit],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: lit ? 1 : 0.92,
        depthWrite: false,
        side: DoubleSide,
      }),
    [lit],
  );

  useEffect(
    () => () => {
      fillMat.dispose();
      ringMat.dispose();
    },
    [fillMat, ringMat],
  );

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

  function over(event: ThreeEvent<PointerEvent>) {
    if (suppressSelect && !editable) return;
    event.stopPropagation();
    document.body.style.cursor = editable ? "grab" : "pointer";
    setHot(true);
    onHover(poi.id);
  }

  function out() {
    if (draggingRef.current) return;
    if (suppressSelect && !editable) return;
    document.body.style.cursor = "";
    setHot(false);
    onHover(null);
  }

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (draggingRef.current) return;
    if (suppressSelect && !editable) return;
    onSelect(poi.id);
  }

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!editable || !onMove || !onCommit) {
      return;
    }
    event.stopPropagation();
    onSelect(poi.id);
    draggingRef.current = true;
    onOrbitLock?.(true);
    onDragActive?.(true);
    document.body.style.cursor = "grabbing";

    const move = (ev: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -(((ev.clientY - rect.top) / rect.height) * 2) + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      plane.set(new THREE.Vector3(0, 1, 0), -(position.y + lift));
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      onMove(poi.id, worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      listenersRef.current = null;
      draggingRef.current = false;
      onOrbitLock?.(false);
      onDragActive?.(false);
      document.body.style.cursor = "";
      onCommit(poi.id);
    };

    listenersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <group position={[position.x, position.y + lift, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={5} material={fillMat} raycast={() => undefined}>
        <circleGeometry args={[TOKEN_R, 32]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.0015, 0]}
        renderOrder={6}
        material={ringMat}
        raycast={() => undefined}
      >
        <ringGeometry args={[TOKEN_R * 0.72, TOKEN_R, 32]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.002, 0]}
        renderOrder={6}
        raycast={() => undefined}
      >
        <circleGeometry args={[TOKEN_R * 0.22, 20]} />
        <meshBasicMaterial
          color={GOLD}
          transparent
          opacity={lit ? 1 : 0.85}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, 0.14, 0]}
        visible={false}
        onClick={suppressSelect && !editable ? undefined : select}
        onPointerDown={editable ? onPointerDown : undefined}
        onPointerOver={suppressSelect && !editable ? undefined : over}
        onPointerOut={suppressSelect && !editable ? undefined : out}
      >
        <cylinderGeometry args={[TOKEN_R * 1.35, TOKEN_R * 1.35, 0.32, 16]} />
        <meshBasicMaterial />
      </mesh>

      {hot && !selected && !editable ? (
        <Html center position={[0, 0.22, 0]} zIndexRange={[100, 0]} style={{ pointerEvents: "none" }}>
          <div className="-translate-y-full whitespace-nowrap rounded border border-accent-gold/40 bg-background-card/95 px-2 py-1 shadow-lg">
            <p className="font-cinzel text-xs font-bold text-accent-gold">{poi.name}</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
