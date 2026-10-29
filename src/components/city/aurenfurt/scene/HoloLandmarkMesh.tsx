"use client";

import { useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  Matrix4,
  Vector3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import type { LandmarkModel } from "../aurenfurt-districts";
import { LANDMARK_SCALE_DEFAULT } from "../aurenfurt-landmark-scales";
import { disposeCloneKeepSource } from "./dispose-cloned-gltf";
import { HeavyGlbSlot } from "./HeavyGlbSlot";

const LIT_EMISSIVE = new Color("#fff4c8");

export function applyLandmarkLit(root: Object3D, lit: boolean) {
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const standard = material as MeshStandardMaterial;
      if (!standard || typeof standard.emissiveIntensity !== "number") continue;
      if (!standard.userData.holoBaseEmissiveIntensity) {
        standard.userData.holoBaseEmissiveIntensity = standard.emissiveIntensity;
        standard.userData.holoBaseEmissive = standard.emissive?.clone?.() ?? new Color(0x000000);
      }
      if (lit) {
        standard.emissive.copy(LIT_EMISSIVE);
        standard.emissiveIntensity = Math.max(0.35, standard.userData.holoBaseEmissiveIntensity + 0.28);
      } else {
        standard.emissive.copy(standard.userData.holoBaseEmissive);
        standard.emissiveIntensity = standard.userData.holoBaseEmissiveIntensity;
      }
      standard.needsUpdate = true;
    }
  });
}

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

export type LandmarkBounds = {
  span: number;
  centerX: number;
  minY: number;
  centerZ: number;
};

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

export function measureLandmarkBounds(root: Object3D): LandmarkBounds | null {
  const box = boundsInObjectSpace(root);
  if (box.isEmpty()) return null;
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  return {
    span: Math.max(size.x, size.z, 0.001),
    centerX: center.x,
    minY: box.min.y,
    centerZ: center.z,
  };
}

type Props = {
  model: LandmarkModel;
  /** Multiplikator auf LANDMARK_WIDTH (Default 1). */
  scaleMultiplier?: number;
  /** Drehung um die Hochachse, in Grad. Das Gebäude bleibt auf dem Pin. */
  rotationDegrees?: number;
  /** Auswahl oder Hover: Modell etwas heller. */
  lit?: boolean;
};

export function HoloLandmarkMesh({
  model,
  scaleMultiplier = LANDMARK_SCALE_DEFAULT,
  rotationDegrees = 0,
  lit = false,
}: Props) {
  const url = LANDMARK_URL[model];
  return (
    <HeavyGlbSlot url={url}>
      <HoloLandmarkBody
        url={url}
        scaleMultiplier={scaleMultiplier}
        rotationDegrees={rotationDegrees}
        lit={lit}
      />
    </HeavyGlbSlot>
  );
}

function HoloLandmarkBody({
  url,
  scaleMultiplier,
  rotationDegrees,
  lit,
}: {
  url: string;
  scaleMultiplier: number;
  rotationDegrees: number;
  lit: boolean;
}) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
    const bounds = measureLandmarkBounds(object);
    if (!bounds) return;
    const scale = (LANDMARK_WIDTH * scaleMultiplier) / bounds.span;
    object.scale.setScalar(scale);
    object.position.set(-bounds.centerX * scale, -bounds.minY * scale, -bounds.centerZ * scale);
  }, [object, scaleMultiplier]);

  useLayoutEffect(() => {
    applyLandmarkLit(object, lit);
  }, [lit, object]);

  useLayoutEffect(() => () => disposeCloneKeepSource(object, scene), [object, scene]);

  return (
    <group rotation={[0, (rotationDegrees * Math.PI) / 180, 0]}>
      <primitive object={object} />
    </group>
  );
}
