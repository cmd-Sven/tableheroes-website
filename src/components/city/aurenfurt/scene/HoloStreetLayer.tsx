"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import {
  STREET_CATEGORY_META,
  effectiveStreet,
  type AurenfurtStreet,
  type EffectiveStreet,
  type StreetCategory,
  type StreetLinePattern,
} from "../aurenfurt-streets";
import type { DayWeather } from "../aurenfurt-weather";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, surfacePoint } from "./diorama-geometry";

type Props = {
  streets: AurenfurtStreet[];
  dayWeather: DayWeather;
  viewedDay: string;
  editMode: boolean;
  editingStreetId: string | null;
  drawing: boolean;
  draftPoints: UvPoint[];
  /** Hauptansicht-Schalter: Layer ein/aus (Editor erzwingt sichtbar von außen). */
  layerVisible?: boolean;
  onMoveStreetPoint: (streetId: string, index: number, point: UvPoint) => void;
  onCommitStreets: () => void;
  onAddDrawPoint: (point: UvPoint) => void;
  onFinishDraw: () => void;
  onSelectStreet: (streetId: string | null) => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

const LIFT = 0.07;
const DETOUR_LIFT = 0.065;
/** Weltbreite pro Width-Einheit — unter Windows sichtbar anders als lineWidth. */
const WIDTH_UNIT = 0.018;
const STREET_OPACITY = 0.62;
const DRAFT_COLOR = "#23c763";

function widthToWorld(width: number): number {
  return Math.max(1, width) * WIDTH_UNIT;
}

type WorldSample = { position: THREE.Vector3; tangent: THREE.Vector3 };

function samplePolyline(points: UvPoint[], lift: number): WorldSample[] {
  const samples: WorldSample[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const position = surfacePoint(points[i].u, points[i].v);
    position.y += lift;
    let tangent: THREE.Vector3;
    if (i === 0) {
      const next = surfacePoint(points[Math.min(1, points.length - 1)].u, points[Math.min(1, points.length - 1)].v);
      tangent = next.clone().sub(position);
    } else if (i === points.length - 1) {
      const prev = surfacePoint(points[i - 1].u, points[i - 1].v);
      prev.y += lift;
      tangent = position.clone().sub(prev);
    } else {
      const prev = surfacePoint(points[i - 1].u, points[i - 1].v);
      const next = surfacePoint(points[i + 1].u, points[i + 1].v);
      prev.y += lift;
      next.y += lift;
      tangent = next.clone().sub(prev);
    }
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    else tangent.normalize();
    samples.push({ position, tangent });
  }
  return samples;
}

function offsetPoint(sample: WorldSample, halfWidth: number, side: number): THREE.Vector3 {
  const up = new THREE.Vector3(0, 1, 0);
  const sideDir = new THREE.Vector3().crossVectors(up, sample.tangent);
  if (sideDir.lengthSq() < 1e-8) sideDir.set(1, 0, 0);
  else sideDir.normalize();
  return sample.position.clone().addScaledVector(sideDir, side * halfWidth);
}

function appendRibbonQuad(
  positions: number[],
  indices: number[],
  aLeft: THREE.Vector3,
  aRight: THREE.Vector3,
  bLeft: THREE.Vector3,
  bRight: THREE.Vector3,
) {
  const base = positions.length / 3;
  positions.push(aLeft.x, aLeft.y, aLeft.z, aRight.x, aRight.y, aRight.z, bLeft.x, bLeft.y, bLeft.z, bRight.x, bRight.y, bRight.z);
  indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}

/**
 * Baut ein flaches Band entlang der Polyline.
 * Gestrichelt/gepunktet = Lücken im Band (nicht lineWidth — unter Windows ohnehin oft 1px).
 */
function buildRibbonGeometry(
  points: UvPoint[],
  worldWidth: number,
  lift: number,
  pattern: StreetLinePattern,
): THREE.BufferGeometry | null {
  if (points.length < 2) return null;
  const samples = samplePolyline(points, lift);
  const half = worldWidth * 0.5;
  const positions: number[] = [];
  const indices: number[] = [];

  const dashOn = pattern === "dotted" ? 0.06 : pattern === "dashed" ? 0.16 : Infinity;
  const dashOff = pattern === "dotted" ? 0.1 : pattern === "dashed" ? 0.1 : 0;

  let distanceAlong = 0;
  let drawing = true;
  let segmentStart = 0;

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const segLen = a.position.distanceTo(b.position);
    if (segLen < 1e-6) continue;

    if (pattern === "solid") {
      appendRibbonQuad(
        positions,
        indices,
        offsetPoint(a, half, -1),
        offsetPoint(a, half, 1),
        offsetPoint(b, half, -1),
        offsetPoint(b, half, 1),
      );
      continue;
    }

    let localT = 0;
    while (localT < 1 - 1e-6) {
      const remaining = (drawing ? dashOn : dashOff) - segmentStart;
      const remainingT = remaining / segLen;
      const nextT = Math.min(1, localT + remainingT);
      const consumed = (nextT - localT) * segLen;

      if (drawing && nextT > localT + 1e-5) {
        const ta = localT;
        const tb = nextT;
        const pa: WorldSample = {
          position: a.position.clone().lerp(b.position, ta),
          tangent: a.tangent.clone().lerp(b.tangent, ta).normalize(),
        };
        const pb: WorldSample = {
          position: a.position.clone().lerp(b.position, tb),
          tangent: a.tangent.clone().lerp(b.tangent, tb).normalize(),
        };
        appendRibbonQuad(
          positions,
          indices,
          offsetPoint(pa, half, -1),
          offsetPoint(pa, half, 1),
          offsetPoint(pb, half, -1),
          offsetPoint(pb, half, 1),
        );
      }

      segmentStart += consumed;
      const limit = drawing ? dashOn : dashOff;
      if (segmentStart >= limit - 1e-6) {
        segmentStart = 0;
        drawing = !drawing;
      }
      localT = nextT;
      distanceAlong += consumed;
    }
  }

  void distanceAlong;

  if (positions.length < 9) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function StreetRibbon({
  points,
  color,
  width,
  pattern,
  lift = LIFT,
  opacity = STREET_OPACITY,
}: {
  points: UvPoint[];
  color: string;
  width: number;
  pattern: StreetLinePattern;
  lift?: number;
  opacity?: number;
}) {
  const meshObject = useMemo(() => {
    const geometry = buildRibbonGeometry(points, widthToWorld(width), lift, pattern);
    if (!geometry) return null;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 3;
    return mesh;
  }, [points, color, width, pattern, lift, opacity]);

  useEffect(
    () => () => {
      if (!meshObject) return;
      meshObject.geometry.dispose();
      if (Array.isArray(meshObject.material)) {
        meshObject.material.forEach((m) => m.dispose());
      } else {
        meshObject.material.dispose();
      }
    },
    [meshObject],
  );

  if (!meshObject || points.length < 2) return null;
  return <primitive object={meshObject} />;
}

function StreetPointHandle({
  streetId,
  index,
  point,
  onMoveStreetPoint,
  onCommitStreets,
  onOrbitLock,
  onDragActive,
}: {
  streetId: string;
  index: number;
  point: UvPoint;
  onMoveStreetPoint: (streetId: string, index: number, point: UvPoint) => void;
  onCommitStreets: () => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
}) {
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
      onMoveStreetPoint(streetId, index, worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH));
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      listenersRef.current = null;
      onOrbitLock(false);
      onDragActive(false);
      onCommitStreets();
    };

    listenersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <group position={[world.x, world.y + 0.1, world.z]}>
      <mesh
        ref={meshRef}
        renderOrder={6}
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
        <sphereGeometry args={[0.078, 12, 12]} />
        <meshBasicMaterial color="#cab926" transparent opacity={0.95} depthTest={false} />
      </mesh>
    </group>
  );
}

function StreetDrawSurface({
  active,
  onAddDrawPoint,
  onFinishDraw,
  onOrbitLock,
}: {
  active: boolean;
  onAddDrawPoint: (point: UvPoint) => void;
  onFinishDraw: () => void;
  onOrbitLock: (locked: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastClickRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    onOrbitLock(true);
    return () => onOrbitLock(false);
  }, [active, onOrbitLock]);

  if (!active) return null;

  function pickUv(clientX: number, clientY: number): UvPoint | null {
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2) + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    // Bodenebene der Stadtscheibe — unabhängig von Viertel-Meshes.
    plane.set(new THREE.Vector3(0, 1, 0), 0);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH);
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const now = performance.now();
    const uv = pickUv(event.nativeEvent.clientX, event.nativeEvent.clientY);
    if (!uv) return;
    if (now - lastClickRef.current < 320) {
      onFinishDraw();
      lastClickRef.current = 0;
      return;
    }
    lastClickRef.current = now;
    onAddDrawPoint(uv);
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.55, 0]}
      renderOrder={8}
      onPointerDown={handlePointerDown}
      onClick={(event) => event.stopPropagation()}
      onPointerOver={() => {
        document.body.style.cursor = "crosshair";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <planeGeometry args={[DIORAMA_WIDTH * 1.05, DIORAMA_DEPTH * 1.05]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

function StreetDetourLine({ effective }: { effective: EffectiveStreet }) {
  const works = effective.street.works;
  if (works.kind !== "full_closure_detour" || !effective.closureActive) return null;
  if (!works.detourPoints || works.detourPoints.length < 2) return null;
  return (
    <StreetRibbon
      points={works.detourPoints}
      color="#38bdf8"
      width={3}
      pattern="dashed"
      lift={DETOUR_LIFT}
      opacity={0.55}
    />
  );
}

function categoryStyle(category: StreetCategory) {
  return STREET_CATEGORY_META[category];
}

export function HoloStreetLayer({
  streets,
  dayWeather,
  viewedDay,
  editMode,
  editingStreetId,
  drawing,
  draftPoints,
  layerVisible = true,
  onMoveStreetPoint,
  onCommitStreets,
  onAddDrawPoint,
  onFinishDraw,
  onSelectStreet,
  onOrbitLock,
  onDragActive,
}: Props) {
  // Straßen bleiben immer gemountet — unabhängig vom Editor.
  const effectives = useMemo(
    () => streets.map((street) => effectiveStreet(street, dayWeather, viewedDay)),
    [streets, dayWeather, viewedDay],
  );

  return (
    <group visible={layerVisible}>
      {effectives.map((entry) => {
        const selected = editMode && editingStreetId === entry.street.id;
        const meta = categoryStyle(entry.street.category);
        return (
          <group key={entry.street.id}>
            <StreetRibbon
              points={entry.street.points}
              color={meta.color}
              width={entry.street.width}
              pattern={meta.pattern}
              opacity={selected ? 0.85 : STREET_OPACITY}
            />
            <StreetDetourLine effective={entry} />
            {/* Unsichtbare Hit-Fläche zum Auswählen nur im Editor */}
            {editMode && !drawing && entry.street.points.length >= 2 ? (
              <StreetHitRibbon
                points={entry.street.points}
                hitWidth={widthToWorld(entry.street.width) + 0.04}
                onSelect={() => onSelectStreet(entry.street.id)}
              />
            ) : null}
            {selected
              ? entry.street.points.map((point, index) => (
                  <StreetPointHandle
                    key={`${entry.street.id}-${index}`}
                    streetId={entry.street.id}
                    index={index}
                    point={point}
                    onMoveStreetPoint={onMoveStreetPoint}
                    onCommitStreets={onCommitStreets}
                    onOrbitLock={onOrbitLock}
                    onDragActive={onDragActive}
                  />
                ))
              : null}
          </group>
        );
      })}

      {drawing && draftPoints.length >= 1 ? (
        <StreetRibbon
          points={draftPoints.length === 1 ? [...draftPoints, draftPoints[0]] : draftPoints}
          color={DRAFT_COLOR}
          width={STREET_CATEGORY_META.main.defaultWidth}
          pattern="solid"
          opacity={0.8}
        />
      ) : null}
      {drawing
        ? draftPoints.map((point, index) => {
            const world = surfacePoint(point.u, point.v);
            return (
              <mesh key={`draft-${index}`} position={[world.x, world.y + 0.1, world.z]} renderOrder={6}>
                <sphereGeometry args={[0.06, 10, 10]} />
                <meshBasicMaterial color={DRAFT_COLOR} transparent opacity={0.9} depthTest={false} />
              </mesh>
            );
          })
        : null}

      <StreetDrawSurface
        active={drawing}
        onAddDrawPoint={onAddDrawPoint}
        onFinishDraw={onFinishDraw}
        onOrbitLock={onOrbitLock}
      />
    </group>
  );
}

function StreetHitRibbon({
  points,
  hitWidth,
  onSelect,
}: {
  points: UvPoint[];
  hitWidth: number;
  onSelect: () => void;
}) {
  return (
    <group>
      {points.slice(0, -1).map((a, index) => {
        const b = points[index + 1];
        const wa = surfacePoint(a.u, a.v);
        const wb = surfacePoint(b.u, b.v);
        const mid = wa.clone().lerp(wb, 0.5);
        mid.y += LIFT;
        const dx = wb.x - wa.x;
        const dz = wb.z - wa.z;
        const length = Math.sqrt(dx * dx + dz * dz) || 0.01;
        const angle = Math.atan2(dx, dz);
        return (
          <mesh
            key={`hit-${index}`}
            position={[mid.x, mid.y, mid.z]}
            rotation={[0, angle, 0]}
            renderOrder={3}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <boxGeometry args={[hitWidth, 0.04, length]} />
            <meshBasicMaterial transparent opacity={0.01} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
