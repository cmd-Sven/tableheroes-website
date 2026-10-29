"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, DISTRICT_SURFACE_LIFT, surfacePoint } from "./diorama-geometry";

type Props = {
  active: boolean;
  /** Vorschau-Marke unter dem Cursor (frei, ohne Raster). */
  showPreview?: boolean;
  onPlace: (point: UvPoint) => void;
  onHoverUv?: (point: UvPoint | null) => void;
  onOrbitLock: (locked: boolean) => void;
};

/**
 * Freie Kartenplatzierung: Klick setzt UV exakt, ohne Sektor- oder Straßen-Raster.
 * Die Vorschau folgt dem Cursor; betroffene Sektoren werden separat aus der UV berechnet.
 */
export function FreeMapPlaceSurface({
  active,
  showPreview = true,
  onPlace,
  onHoverUv,
  onOrbitLock,
}: Props) {
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const [preview, setPreview] = useState<UvPoint | null>(null);

  useEffect(() => {
    if (!active) {
      setPreview(null);
      onHoverUv?.(null);
      return;
    }
    onOrbitLock(true);
    return () => {
      onOrbitLock(false);
      onHoverUv?.(null);
    };
  }, [active, onHoverUv, onOrbitLock]);

  if (!active) return null;

  function pickUv(clientX: number, clientY: number): UvPoint | null {
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2) + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    // Ebene auf Kuppelhöhe mittig — freier Treffer, kein Sektor-Snap.
    plane.set(new THREE.Vector3(0, 1, 0), -DISTRICT_SURFACE_LIFT);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH);
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const uv = pickUv(event.nativeEvent.clientX, event.nativeEvent.clientY);
    setPreview(uv);
    onHoverUv?.(uv);
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const uv = pickUv(event.nativeEvent.clientX, event.nativeEvent.clientY);
    if (!uv) return;
    onPlace(uv);
  }

  const previewWorld = preview ? surfacePoint(preview.u, preview.v) : null;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, DISTRICT_SURFACE_LIFT + 0.02, 0]}
        renderOrder={9}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={() => {
          setPreview(null);
          onHoverUv?.(null);
          document.body.style.cursor = "";
        }}
        onPointerOver={() => {
          document.body.style.cursor = "crosshair";
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <planeGeometry args={[DIORAMA_WIDTH * 1.05, DIORAMA_DEPTH * 1.05]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} depthTest={false} />
      </mesh>
      {showPreview && previewWorld ? (
        <mesh
          position={[previewWorld.x, previewWorld.y + DISTRICT_SURFACE_LIFT + 0.04, previewWorld.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={10}
          raycast={() => undefined}
        >
          <ringGeometry args={[0.06, 0.1, 28]} />
          <meshBasicMaterial color="#cab926" transparent opacity={0.9} depthTest={false} />
        </mesh>
      ) : null}
    </group>
  );
}
