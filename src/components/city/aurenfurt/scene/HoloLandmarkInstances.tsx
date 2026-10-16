"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  Matrix4,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
import type { LandmarkModel } from "../aurenfurt-districts";
import { BUILDING_SELECTED_SCALE } from "./HoloBuildingMarker";
import {
  LANDMARK_URL,
  LANDMARK_WIDTH,
  measureLandmarkBounds,
  type LandmarkBounds,
} from "./HoloLandmarkMesh";
import { disposeCloneKeepSource } from "./dispose-cloned-gltf";
import { HeavyGlbSlot } from "./HeavyGlbSlot";
import { surfacePoint } from "./diorama-geometry";

export type LandmarkInstanceItem = {
  id: string;
  u: number;
  v: number;
  scaleMultiplier: number;
  rotationDegrees: number;
  selected: boolean;
};

type Props = {
  model: LandmarkModel;
  items: LandmarkInstanceItem[];
  suppressSelect: boolean;
  editable: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

type MeshPart = {
  geometry: BufferGeometry;
  material: Material;
  local: Matrix4;
};

function collectParts(scene: Object3D): { bounds: LandmarkBounds; parts: MeshPart[] } | null {
  const bounds = measureLandmarkBounds(scene);
  if (!bounds) return null;
  scene.updateWorldMatrix(true, true);
  const inv = new Matrix4().copy(scene.matrixWorld).invert();
  const parts: MeshPart[] = [];
  let blocked = false;
  scene.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const skinned = (mesh as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh;
    if (skinned || !mesh.geometry || Array.isArray(mesh.material)) {
      blocked = true;
      return;
    }
    mesh.updateWorldMatrix(true, false);
    parts.push({
      geometry: mesh.geometry,
      material: mesh.material,
      local: new Matrix4().multiplyMatrices(inv, mesh.matrixWorld),
    });
  });
  if (blocked || parts.length === 0) return null;
  return { bounds, parts };
}

function writeInstanceMatrix(
  target: Matrix4,
  item: LandmarkInstanceItem,
  bounds: LandmarkBounds,
  local: Matrix4,
  scratch: { t: Matrix4; s: Matrix4; r: Matrix4 },
) {
  const pos = surfacePoint(item.u, item.v);
  const selected = item.selected ? BUILDING_SELECTED_SCALE : 1;
  const fit = (LANDMARK_WIDTH * item.scaleMultiplier) / bounds.span;
  scratch.t.makeTranslation(pos.x, pos.y, pos.z);
  scratch.s.makeScale(selected, selected, selected);
  scratch.r.makeRotationY((item.rotationDegrees * Math.PI) / 180);
  target.identity().multiply(scratch.t).multiply(scratch.s).multiply(scratch.r);
  scratch.t.makeTranslation(-bounds.centerX * fit, -bounds.minY * fit, -bounds.centerZ * fit);
  scratch.s.makeScale(fit, fit, fit);
  target.multiply(scratch.t).multiply(scratch.s).multiply(local);
}

function InstancePart({
  geometry,
  material,
  local,
  items,
  bounds,
  suppressSelect,
  editable,
  onSelect,
  onHover,
}: MeshPart & {
  items: LandmarkInstanceItem[];
  bounds: LandmarkBounds;
  suppressSelect: boolean;
  editable: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const ref = useRef<InstancedMesh>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const target = new Matrix4();
    const scratch = { t: new Matrix4(), s: new Matrix4(), r: new Matrix4() };
    for (let index = 0; index < items.length; index += 1) {
      writeInstanceMatrix(target, items[index], bounds, local, scratch);
      mesh.setMatrixAt(index, target);
    }
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [bounds, items, local]);

  function idAt(instanceId: number | undefined): string | null {
    if (instanceId == null || instanceId < 0) return null;
    return itemsRef.current[instanceId]?.id ?? null;
  }

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    const id = idAt(event.instanceId);
    if (!id) return;
    onSelect(id);
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const id = idAt(event.instanceId);
    if (!id) return;
    document.body.style.cursor = editable ? "default" : "pointer";
    onHover(id);
  }

  function out() {
    document.body.style.cursor = "";
    onHover(null);
  }

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      key={items.length}
      castShadow={false}
      receiveShadow={false}
      onClick={suppressSelect ? undefined : select}
      onPointerOver={suppressSelect ? undefined : over}
      onPointerOut={suppressSelect ? undefined : out}
    />
  );
}

function ClonedLandmark({
  scene,
  item,
  suppressSelect,
  editable,
  onSelect,
  onHover,
}: {
  scene: Object3D;
  item: LandmarkInstanceItem;
  suppressSelect: boolean;
  editable: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const object = useMemo(() => scene.clone(true), [scene]);
  const position = useMemo(() => surfacePoint(item.u, item.v), [item.u, item.v]);

  useLayoutEffect(() => {
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
    const bounds = measureLandmarkBounds(object);
    if (!bounds) return;
    const scale = (LANDMARK_WIDTH * item.scaleMultiplier) / bounds.span;
    object.scale.setScalar(scale);
    object.position.set(-bounds.centerX * scale, -bounds.minY * scale, -bounds.centerZ * scale);
  }, [item.scaleMultiplier, object]);

  useLayoutEffect(() => () => disposeCloneKeepSource(object, scene), [object, scene]);

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(item.id);
  }

  function over(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    document.body.style.cursor = editable ? "default" : "pointer";
    onHover(item.id);
  }

  function out() {
    document.body.style.cursor = "";
    onHover(null);
  }

  return (
    <group
      position={position}
      scale={item.selected ? BUILDING_SELECTED_SCALE : 1}
      onClick={suppressSelect ? undefined : select}
      onPointerOver={suppressSelect ? undefined : over}
      onPointerOut={suppressSelect ? undefined : out}
    >
      <group rotation={[0, (item.rotationDegrees * Math.PI) / 180, 0]}>
        <primitive object={object} />
      </group>
    </group>
  );
}

function InstancesBody({
  url,
  items,
  suppressSelect,
  editable,
  onSelect,
  onHover,
}: Omit<Props, "model"> & { url: string }) {
  const { scene } = useGLTF(url);
  const prepared = useMemo(() => collectParts(scene), [scene]);

  if (!prepared) {
    return (
      <>
        {items.map((item) => (
          <ClonedLandmark
            key={item.id}
            scene={scene}
            item={item}
            suppressSelect={suppressSelect}
            editable={editable}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {prepared.parts.map((part, index) => (
        <InstancePart
          key={`${index}-${items.length}`}
          geometry={part.geometry}
          material={part.material}
          local={part.local}
          items={items}
          bounds={prepared.bounds}
          suppressSelect={suppressSelect}
          editable={editable}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </>
  );
}

/** Gleiche GLBs als ein Draw Call pro Mesh. Klick, Auswahl und Drehung bleiben am Exemplar. */
export function HoloLandmarkInstances({ model, items, ...rest }: Props) {
  if (items.length < 2) return null;
  const url = LANDMARK_URL[model];
  return (
    <HeavyGlbSlot url={url}>
      <InstancesBody url={url} items={items} {...rest} />
    </HeavyGlbSlot>
  );
}
