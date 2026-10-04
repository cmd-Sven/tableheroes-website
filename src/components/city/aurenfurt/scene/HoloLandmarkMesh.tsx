"use client";

import { useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Matrix4, Vector3, type Mesh, type Object3D } from "three";
import type { LandmarkModel } from "../aurenfurt-districts";
import { LANDMARK_SCALE_DEFAULT } from "../aurenfurt-landmark-scales";

export const LANDMARK_URL: Record<LandmarkModel, string> = {
  wirtshaus: "/models/aurenfurt/wirtshaus.glb",
  kraemer: "/models/aurenfurt/kraemer.glb",
  nordtor: "/models/aurenfurt/nordtor.glb",
  suedtor: "/models/aurenfurt/suedtor.glb",
  wachturm: "/models/aurenfurt/wachturm.glb",
  palais: "/models/aurenfurt/palais.glb",
  kapelle: "/models/aurenfurt/kapelle.glb",
  hofkanzlei: "/models/aurenfurt/hofkanzlei.glb",
  observatorium: "/models/aurenfurt/observatorium.glb",
};

/** Fußabdruck auf der Tafel, in Welteinheiten. Die Stadt selbst ist etwa vier Einheiten breit. */
export const LANDMARK_WIDTH = 0.3;

/** Hüllbox im lokalen Raum des Modells, ohne Kartenposition und ohne Drehgruppe. */
function boundsInObjectSpace(root: Object3D): Box3 {
  root.updateWorldMatrix(true, true);
  const rootInv = new Matrix4().copy(root.matrixWorld).invert();
  const box = new Box3();
  const toRoot = new Matrix4();
  let seeded = false;
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const geometryBox = mesh.geometry.boundingBox;
    if (!geometryBox || geometryBox.isEmpty()) return;
    mesh.updateWorldMatrix(true, false);
    toRoot.multiplyMatrices(rootInv, mesh.matrixWorld);
    const childBox = geometryBox.clone().applyMatrix4(toRoot);
    if (!seeded) {
      box.copy(childBox);
      seeded = true;
      return;
    }
    box.union(childBox);
  });
  return box;
}

type Props = {
  model: LandmarkModel;
  /** Multiplikator auf LANDMARK_WIDTH (Default 1). */
  scaleMultiplier?: number;
  /** Drehung um die Hochachse, in Grad. Das Gebäude bleibt auf dem Pin. */
  rotationDegrees?: number;
};

export function HoloLandmarkMesh({
  model,
  scaleMultiplier = LANDMARK_SCALE_DEFAULT,
  rotationDegrees = 0,
}: Props) {
  const url = LANDMARK_URL[model];
  const { scene } = useGLTF(url);
  const object = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
    const box = boundsInObjectSpace(object);
    if (box.isEmpty()) return;
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const span = Math.max(size.x, size.z, 0.001);
    const scale = (LANDMARK_WIDTH * scaleMultiplier) / span;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  }, [object, scaleMultiplier]);

  return (
    <group rotation={[0, (rotationDegrees * Math.PI) / 180, 0]}>
      <primitive object={object} />
    </group>
  );
}

useGLTF.preload(LANDMARK_URL.wirtshaus);
useGLTF.preload(LANDMARK_URL.kraemer);
useGLTF.preload(LANDMARK_URL.nordtor);
useGLTF.preload(LANDMARK_URL.suedtor);
useGLTF.preload(LANDMARK_URL.wachturm);
useGLTF.preload(LANDMARK_URL.palais);
useGLTF.preload(LANDMARK_URL.kapelle);
useGLTF.preload(LANDMARK_URL.hofkanzlei);
useGLTF.preload(LANDMARK_URL.observatorium);
