"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import { DECO_CATALOG, decoModelByKey, type CityMapDecoration } from "../aurenfurt-deco-catalog";
import { useAurenfurtDeco } from "../AurenfurtDecoProvider";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, surfacePoint } from "./diorama-geometry";
import { HoloDecorationMesh } from "./HoloDecorationMesh";

type SlotProps = {
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

type BoundaryProps = { children: ReactNode; onFail: () => void };
type BoundaryState = { failed: boolean };

class DecorationErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function HoloDecorationSlot({ onOrbitLock, onDragActive }: SlotProps) {
  const deco = useAurenfurtDeco();
  return (
    <DecorationErrorBoundary onFail={() => deco.reportModelError("Das Deko-Modell konnte nicht geladen werden.")}>
      <Suspense fallback={null}>
        <HoloDecorationLayer onOrbitLock={onOrbitLock} onDragActive={onDragActive} />
      </Suspense>
    </DecorationErrorBoundary>
  );
}

function HoloDecorationLayer({ onOrbitLock, onDragActive }: SlotProps) {
  const deco = useAurenfurtDeco();
  const interactive = deco.isGm && deco.panelOpen && deco.placingKey === null;

  useEffect(() => {
    if (!deco.panelOpen && deco.items.length === 0) return;
    for (const model of DECO_CATALOG) useGLTF.preload(model.url);
  }, [deco.items.length, deco.panelOpen]);

  return (
    <>
      {deco.items.map((item) => {
        const model = decoModelByKey(item.modelKey);
        if (!model) return null;
        return (
          <DecorationInstance
            key={item.id}
            item={item}
            url={model.url}
            selected={item.id === deco.selectedId}
            interactive={interactive}
            onSelect={() => deco.select(item.id)}
            onMove={(point) => deco.move(item.id, point)}
            onCommit={() => deco.commitMove(item.id)}
            onOrbitLock={onOrbitLock}
            onDragActive={onDragActive}
          />
        );
      })}
      <DecorationPlacePlane
        active={deco.isGm && deco.placingKey !== null}
        onPlace={deco.placeAt}
        onOrbitLock={onOrbitLock}
      />
    </>
  );
}

function DecorationInstance({
  item,
  url,
  selected,
  interactive,
  onSelect,
  onMove,
  onCommit,
  onOrbitLock,
  onDragActive,
}: {
  item: CityMapDecoration;
  url: string;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onMove: (point: UvPoint) => void;
  onCommit: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
}) {
  const position = useMemo(() => surfacePoint(item.u, item.v), [item.u, item.v]);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const worldScratch = useMemo(() => new THREE.Vector3(), []);
  const listenersRef = useRef<{ move: (event: PointerEvent) => void; up: (event: PointerEvent) => void } | null>(
    null,
  );

  useEffect(
    () => () => {
      const listeners = listenersRef.current;
      if (!listeners) return;
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.up);
    },
    [],
  );

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    if (!selected || !interactive) return;
    event.stopPropagation();
    onOrbitLock(true);
    onDragActive(true);
    const move = (native: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((native.clientX - rect.left) / rect.width) * 2 - 1, -((native.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const planeY = meshRef.current ? meshRef.current.getWorldPosition(worldScratch).y : position.y;
      plane.set(new THREE.Vector3(0, 1, 0), -planeY);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      onMove(worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      listenersRef.current = null;
      onDragActive(false);
      onOrbitLock(false);
      onCommit();
    };
    listenersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <group
      position={position}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect();
            }
          : undefined
      }
      onPointerDown={selected && interactive ? onPointerDown : undefined}
    >
      <HoloDecorationMesh
        url={url}
        scaleMultiplier={item.scale}
        rotationDegrees={item.rotation}
        interactive={interactive}
      />
      {interactive ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.03, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          <ringGeometry args={[0.16, 0.22, 24]} />
          <meshBasicMaterial color={selected ? "#cab926" : "#217d42"} transparent opacity={0.9} />
        </mesh>
      ) : null}
      {selected && interactive ? (
        <mesh ref={meshRef} position={[0, 0.2, 0]} renderOrder={9} raycast={() => undefined}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#cab926" transparent opacity={0.95} depthTest={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function DecorationPlacePlane({
  active,
  onPlace,
  onOrbitLock,
}: {
  active: boolean;
  onPlace: (point: UvPoint) => void;
  onOrbitLock: (locked: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    if (!active) return;
    onOrbitLock(true);
    return () => onOrbitLock(false);
  }, [active, onOrbitLock]);

  if (!active) return null;

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const rect = gl.domElement.getBoundingClientRect();
    const native = event.nativeEvent;
    ndc.set(((native.clientX - rect.left) / rect.width) * 2 - 1, -((native.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    plane.set(new THREE.Vector3(0, 1, 0), 0);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    onPlace(worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.62, 0]}
      renderOrder={12}
      onPointerDown={handlePointerDown}
      onClick={(event) => event.stopPropagation()}
    >
      <planeGeometry args={[DIORAMA_WIDTH * 1.05, DIORAMA_DEPTH * 1.05]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} depthTest={false} />
    </mesh>
  );
}
