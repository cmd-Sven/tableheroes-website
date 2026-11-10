"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide } from "three";
import { Users } from "lucide-react";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, DISTRICT_SURFACE_LIFT, surfacePoint } from "./diorama-geometry";

type Props = {
  id: string;
  label: string;
  imageUrl?: string | null;
  u: number;
  v: number;
  /** Gruppen-Token etwas größer. */
  isGroup?: boolean;
  canDrag?: boolean;
  onMove?: (id: string, point: UvPoint) => void;
  onCommit?: (id: string) => void;
  onOrbitLock?: (locked: boolean) => void;
  onDragActive?: (active: boolean) => void;
};

const GOLD = "#cab926";
const DARK = "#0a1f10";

/** Flacher Party-/Gruppen-Token mit Portrait und Drag auf der Stadtkarte. */
export function HoloPartyTokenMarker({
  id,
  label,
  imageUrl = null,
  u,
  v,
  isGroup = false,
  canDrag = true,
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
  const position = useMemo(() => surfacePoint(u, v), [u, v]);
  const lift = DISTRICT_SURFACE_LIFT + 0.03;
  const radius = isGroup ? 0.11 : 0.09;

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
    if (!canDrag || !onMove || !onCommit) return;
    event.stopPropagation();
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
      onMove(id, worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      listenersRef.current = null;
      draggingRef.current = false;
      onOrbitLock?.(false);
      onDragActive?.(false);
      document.body.style.cursor = "";
      onCommit(id);
    };

    listenersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <group position={[position.x, position.y + lift, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={8} raycast={() => undefined}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial
          color={DARK}
          transparent
          opacity={0.96}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.0015, 0]}
        renderOrder={9}
        raycast={() => undefined}
      >
        <ringGeometry args={[radius * 0.78, radius, 32]} />
        <meshBasicMaterial
          color={GOLD}
          transparent
          opacity={hot || draggingRef.current ? 1 : 0.9}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, 0.16, 0]}
        visible={false}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = canDrag ? "grab" : "pointer";
          setHot(true);
        }}
        onPointerOut={() => {
          if (draggingRef.current) return;
          document.body.style.cursor = "";
          setHot(false);
        }}
      >
        <cylinderGeometry args={[radius * 1.4, radius * 1.4, 0.34, 16]} />
        <meshBasicMaterial />
      </mesh>

      <Html center position={[0, 0.08, 0]} zIndexRange={[120, 0]} style={{ pointerEvents: "none" }}>
        <div
          className={`overflow-hidden rounded-full border-2 border-accent-gold bg-background-dark shadow-lg ${
            isGroup ? "h-11 w-11" : "h-9 w-9"
          }`}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : isGroup ? (
            <span className="grid h-full w-full place-items-center text-accent-gold">
              <Users className="h-5 w-5" aria-hidden />
            </span>
          ) : (
            <span className="grid h-full w-full place-items-center font-barlow text-xs font-bold text-accent-gold">
              {label[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
      </Html>

      {hot || draggingRef.current ? (
        <Html center position={[0, 0.28, 0]} zIndexRange={[121, 0]} style={{ pointerEvents: "none" }}>
          <div className="-translate-y-full whitespace-nowrap rounded border border-accent-gold/40 bg-background-card/95 px-2 py-1 shadow-lg">
            <p className="font-cinzel text-xs font-bold text-accent-gold">{label}</p>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
