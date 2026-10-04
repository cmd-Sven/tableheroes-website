"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { worldXZToUv, type UvPoint } from "../aurenfurt-district-polygons";
import {
  WALL_MERLON_SIZE_MAX,
  WALL_MERLON_SIZE_MIN,
  WALL_TEXTURE_URL,
  sampleWallPath,
  type AurenfurtWall,
} from "../aurenfurt-walls";
import { DIORAMA_DEPTH, DIORAMA_WIDTH, surfacePoint } from "./diorama-geometry";

type Props = {
  walls: AurenfurtWall[];
  editMode: boolean;
  editingWallId: string | null;
  drawing: boolean;
  previewing: boolean;
  draftPoints: UvPoint[];
  draftCurve: number;
  previewWall: AurenfurtWall | null;
  onMovePoint: (wallId: string, index: number, point: UvPoint) => void;
  onAddDrawPoint: (point: UvPoint) => void;
  onFinishDraw: () => void;
  onSelectWall: (wallId: string | null) => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
};

const DRAFT = "#23c763";

type Frame = { pos: THREE.Vector3; side: THREE.Vector3; distance: number };

function pushQuad(
  positions: number[],
  uvs: number[],
  indices: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  au: [number, number],
  bu: [number, number],
  cu: [number, number],
  du: [number, number],
) {
  const base = positions.length / 3;
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
  uvs.push(au[0], au[1], bu[0], bu[1], cu[0], cu[1], du[0], du[1]);
  indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
}

function pathFrames(points: UvPoint[], curve: number): Frame[] {
  const path = sampleWallPath(points, curve);
  if (path.length < 2) return [];
  const worlds = path.map((point) => surfacePoint(point.u, point.v));
  const frames: Frame[] = [];
  let distance = 0;
  for (let index = 0; index < worlds.length; index += 1) {
    if (index > 0) distance += worlds[index].distanceTo(worlds[index - 1]);
    const prev = worlds[Math.max(0, index - 1)];
    const next = worlds[Math.min(worlds.length - 1, index + 1)];
    const tangent = next.clone().sub(prev);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-8) tangent.set(1, 0, 0);
    else tangent.normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent);
    if (side.lengthSq() < 1e-8) side.set(0, 0, 1);
    else side.normalize();
    frames.push({ pos: worlds[index], side, distance });
  }
  return frames;
}

function frameAt(frames: Frame[], distance: number): Frame {
  const last = frames[frames.length - 1];
  if (distance <= frames[0].distance) {
    return { pos: frames[0].pos.clone(), side: frames[0].side.clone(), distance: frames[0].distance };
  }
  if (distance >= last.distance) {
    return { pos: last.pos.clone(), side: last.side.clone(), distance: last.distance };
  }
  for (let index = 1; index < frames.length; index += 1) {
    const next = frames[index];
    if (next.distance < distance) continue;
    const prev = frames[index - 1];
    const span = next.distance - prev.distance || 1;
    const t = (distance - prev.distance) / span;
    const side = prev.side.clone().lerp(next.side, t);
    if (side.lengthSq() < 1e-8) side.copy(prev.side);
    else side.normalize();
    return { pos: prev.pos.clone().lerp(next.pos, t), side, distance };
  }
  return { pos: last.pos.clone(), side: last.side.clone(), distance: last.distance };
}

function framesBetween(source: Frame[], start: number, end: number): Frame[] {
  const span = Math.max(0.001, end - start);
  const steps = Math.max(1, Math.ceil(span / 0.04));
  const frames: Frame[] = [];
  for (let step = 0; step <= steps; step += 1) {
    frames.push(frameAt(source, start + (span * step) / steps));
  }
  return frames;
}

function addSpan(
  frames: Frame[],
  y0: number,
  y1: number,
  half: number,
  textureScale: number,
  positions: number[],
  uvs: number[],
  indices: number[],
) {
  if (frames.length < 2) return;
  const rings = frames.map((frame) => {
    const left = frame.pos.clone().addScaledVector(frame.side, -half);
    const right = frame.pos.clone().addScaledVector(frame.side, half);
    const bl = left.clone();
    const br = right.clone();
    const tl = left.clone();
    const tr = right.clone();
    bl.y += y0;
    br.y += y0;
    tl.y += y1;
    tr.y += y1;
    return { bl, br, tl, tr, distance: frame.distance };
  });
  const v0 = y0 / textureScale;
  const v1 = y1 / textureScale;
  const vAcross = (half * 2) / textureScale;
  for (let index = 0; index < rings.length - 1; index += 1) {
    const a = rings[index];
    const b = rings[index + 1];
    const u0 = a.distance / textureScale;
    const u1 = b.distance / textureScale;
    pushQuad(positions, uvs, indices, a.br, b.br, a.tr, b.tr, [u0, v0], [u1, v0], [u0, v1], [u1, v1]);
    pushQuad(positions, uvs, indices, b.bl, a.bl, b.tl, a.tl, [u1, v0], [u0, v0], [u1, v1], [u0, v1]);
    pushQuad(positions, uvs, indices, a.tl, b.tl, a.tr, b.tr, [u0, 0], [u1, 0], [u0, vAcross], [u1, vAcross]);
  }
  const first = rings[0];
  const end = rings[rings.length - 1];
  pushQuad(
    positions,
    uvs,
    indices,
    first.bl,
    first.br,
    first.tl,
    first.tr,
    [0, v0],
    [vAcross, v0],
    [0, v1],
    [vAcross, v1],
  );
  pushQuad(
    positions,
    uvs,
    indices,
    end.br,
    end.bl,
    end.tr,
    end.tl,
    [0, v0],
    [vAcross, v0],
    [0, v1],
    [vAcross, v1],
  );
}

function buildWallGeometry(wall: AurenfurtWall) {
  const frames = pathFrames(wall.points, wall.curve);
  if (frames.length < 2) return null;
  const total = frames[frames.length - 1].distance;
  if (total < 0.01) return null;
  const half = Math.max(0.01, wall.thickness) * 0.5;
  const textureScale = Math.max(0.04, wall.textureScale);
  const y0 = 0.012;
  const y1 = y0 + wall.height;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  addSpan(frames, y0, y1, half, textureScale, positions, uvs, indices);

  if (wall.merlonCount > 0) {
    const sizeSpan = WALL_MERLON_SIZE_MAX - WALL_MERLON_SIZE_MIN;
    const sizeT = Math.min(1, Math.max(0, (wall.merlonSize - WALL_MERLON_SIZE_MIN) / sizeSpan));
    const occupy = 0.22 + 0.68 * sizeT;
    const merlonHeight = Math.max(0.018, wall.height * (0.16 + 0.46 * sizeT));
    const slot = total / wall.merlonCount;
    const width = Math.max(0.012, slot * occupy);
    const merlonBase = y1 + 0.004;
    for (let index = 0; index < wall.merlonCount; index += 1) {
      const center = (index + 0.5) * slot;
      const start = Math.max(0, center - width / 2);
      const end = Math.min(total, center + width / 2);
      if (end - start < 0.008) continue;
      addSpan(
        framesBetween(frames, start, end),
        merlonBase,
        merlonBase + merlonHeight,
        half * 0.98,
        textureScale,
        positions,
        uvs,
        indices,
      );
    }
  }

  if (positions.length < 12) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function WallMesh({
  wall,
  selected,
  texture,
  onSelect,
  selectable,
}: {
  wall: AurenfurtWall;
  selected: boolean;
  texture: THREE.Texture;
  onSelect: () => void;
  selectable: boolean;
}) {
  const geometry = useMemo(
    () => buildWallGeometry(wall),
    [wall],
  );
  useEffect(() => {
    return () => geometry?.dispose();
  }, [geometry]);
  const tint = useMemo(() => {
    const color = new THREE.Color(wall.brightness, wall.brightness, wall.brightness);
    if (selected) color.multiplyScalar(1.08);
    return color;
  }, [selected, wall.brightness]);
  if (!geometry) return null;
  return (
    <mesh
      geometry={geometry}
      renderOrder={4}
      onClick={(event) => {
        if (!selectable) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      <meshStandardMaterial
        map={texture}
        color={tint}
        roughness={0.94}
        metalness={0.02}
        side={THREE.DoubleSide}
        emissive={selected ? "#cab926" : "#000000"}
        emissiveIntensity={selected ? 0.14 : 0}
      />
    </mesh>
  );
}

function WallPointHandle({
  wallId,
  index,
  point,
  onMovePoint,
  onOrbitLock,
  onDragActive,
}: {
  wallId: string;
  index: number;
  point: UvPoint;
  onMovePoint: (wallId: string, index: number, point: UvPoint) => void;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const world = surfacePoint(point.u, point.v);
  const listenersRef = useRef<{ move: (event: PointerEvent) => void; up: (event: PointerEvent) => void } | null>(
    null,
  );
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    return () => {
      const listeners = listenersRef.current;
      if (!listeners) return;
      window.removeEventListener("pointermove", listeners.move);
      window.removeEventListener("pointerup", listeners.up);
    };
  }, []);

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onOrbitLock(true);
    onDragActive(true);
    const move = (native: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((native.clientX - rect.left) / rect.width) * 2 - 1, -((native.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      plane.set(new THREE.Vector3(0, 1, 0), 0);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const uv = worldXZToUv(hit.x, hit.z, DIORAMA_WIDTH, DIORAMA_DEPTH);
      if (uv) onMovePoint(wallId, index, uv);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      listenersRef.current = null;
      onDragActive(false);
      onOrbitLock(false);
    };
    listenersRef.current = { move, up };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <mesh position={[world.x, world.y + 0.12, world.z]} renderOrder={7} onPointerDown={onPointerDown}>
      <sphereGeometry args={[0.07, 12, 12]} />
      <meshBasicMaterial color="#cab926" transparent opacity={0.95} depthTest={false} />
    </mesh>
  );
}

function WallDrawSurface({
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
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
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
    >
      <planeGeometry args={[DIORAMA_WIDTH * 1.05, DIORAMA_DEPTH * 1.05]} />
      <meshBasicMaterial transparent opacity={0.001} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

function DraftLine({ points, curve }: { points: UvPoint[]; curve: number }) {
  const geometry = useMemo(
    () =>
      buildWallGeometry({
        id: "draft",
        name: "Entwurf",
        points,
        curve,
        height: 0.025,
        thickness: 0.02,
        textureScale: 0.1,
        brightness: 1,
        merlonCount: 0,
        merlonSize: 1,
      }),
    [points, curve],
  );
  useEffect(() => {
    return () => geometry?.dispose();
  }, [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} renderOrder={5}>
      <meshBasicMaterial color={DRAFT} transparent opacity={0.9} depthTest={false} />
    </mesh>
  );
}

export function HoloWallLayer({
  walls,
  editMode,
  editingWallId,
  drawing,
  previewing,
  draftPoints,
  draftCurve,
  previewWall,
  onMovePoint,
  onAddDrawPoint,
  onFinishDraw,
  onSelectWall,
  onOrbitLock,
  onDragActive,
}: Props) {
  const texture = useTexture(WALL_TEXTURE_URL);
  const gl = useThree((state) => state.gl);
  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
  }, [gl, texture]);

  return (
    <group>
      {walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          texture={texture}
          selected={editMode && editingWallId === wall.id}
          selectable={editMode && !drawing}
          onSelect={() => onSelectWall(wall.id)}
        />
      ))}
      {editMode && editingWallId
        ? walls
            .find((wall) => wall.id === editingWallId)
            ?.points.map((point, index) => (
              <WallPointHandle
                key={`${editingWallId}-${index}`}
                wallId={editingWallId}
                index={index}
                point={point}
                onMovePoint={onMovePoint}
                onOrbitLock={onOrbitLock}
                onDragActive={onDragActive}
              />
            ))
        : null}
      {previewWall ? (
        <WallMesh
          wall={previewWall}
          texture={texture}
          selected={false}
          selectable={false}
          onSelect={() => undefined}
        />
      ) : null}
      {previewing && !previewWall && draftPoints.length >= 2 ? (
        <DraftLine points={draftPoints} curve={draftCurve} />
      ) : null}
      {previewing
        ? draftPoints.map((point, index) => {
            const world = surfacePoint(point.u, point.v);
            return (
              <mesh key={`wall-draft-${index}`} position={[world.x, world.y + 0.1, world.z]} renderOrder={6}>
                <sphereGeometry args={[0.055, 10, 10]} />
                <meshBasicMaterial color={DRAFT} depthTest={false} />
              </mesh>
            );
          })
        : null}
      <WallDrawSurface
        active={drawing}
        onAddDrawPoint={onAddDrawPoint}
        onFinishDraw={onFinishDraw}
        onOrbitLock={onOrbitLock}
      />
    </group>
  );
}
