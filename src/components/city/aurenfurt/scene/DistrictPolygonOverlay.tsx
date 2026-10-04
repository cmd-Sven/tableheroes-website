"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { CityDistrictId } from "../aurenfurt-districts";
import type { UvPoint } from "../aurenfurt-district-polygons";
import { worldXZToUv } from "../aurenfurt-district-polygons";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, surfacePoint } from "./diorama-geometry";

type Props = {
  districtId: CityDistrictId;
  points: UvPoint[];
  tint: string;
  onMoveVertex: (districtId: CityDistrictId, index: number, point: UvPoint) => void;
  onCommit: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

export function DistrictPolygonOverlay({
  districtId,
  points,
  tint,
  onMoveVertex,
  onCommit,
  onOrbitLock,
  onDragActive,
}: Props) {
  const lineObject = useMemo(() => {
    const positions = new Float32Array((points.length + 1) * 3);
    for (let i = 0; i < points.length; i += 1) {
      const point = surfacePoint(points[i].u, points[i].v);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y + 0.06;
      positions[i * 3 + 2] = point.z;
    }
    const first = surfacePoint(points[0].u, points[0].v);
    const last = points.length * 3;
    positions[last] = first.x;
    positions[last + 1] = first.y + 0.06;
    positions[last + 2] = first.z;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: "#23c763",
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 4;
    return line;
  }, [points]);

  useEffect(
    () => () => {
      lineObject.geometry.dispose();
      if (Array.isArray(lineObject.material)) {
        lineObject.material.forEach((material) => material.dispose());
      } else {
        lineObject.material.dispose();
      }
    },
    [lineObject],
  );

  return (
    <group>
      <primitive object={lineObject} />
      {points.map((point, index) => (
        <DistrictVertexHandle
          key={`${districtId}-${index}`}
          districtId={districtId}
          index={index}
          point={point}
          tint={tint}
          onMoveVertex={onMoveVertex}
          onCommit={onCommit}
          onOrbitLock={onOrbitLock}
          onDragActive={onDragActive}
        />
      ))}
    </group>
  );
}

type HandleProps = {
  districtId: CityDistrictId;
  index: number;
  point: UvPoint;
  tint: string;
  onMoveVertex: (districtId: CityDistrictId, index: number, point: UvPoint) => void;
  onCommit: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

function DistrictVertexHandle({
  districtId,
  index,
  point,
  tint,
  onMoveVertex,
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
      onMoveVertex(districtId, index, worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
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
    <group position={[world.x, world.y + 0.09, world.z]}>
      <mesh
        ref={meshRef}
        renderOrder={5}
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
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshBasicMaterial color="#cab926" transparent opacity={0.95} depthTest={false} />
      </mesh>
      <mesh renderOrder={5} scale={0.55}>
        <sphereGeometry args={[0.085, 10, 10]} />
        <meshBasicMaterial color={tint} transparent opacity={0.55} depthTest={false} />
      </mesh>
    </group>
  );
}
