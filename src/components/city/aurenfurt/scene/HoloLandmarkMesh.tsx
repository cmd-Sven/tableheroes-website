"use client";

import { useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import type { LandmarkModel } from "../aurenfurt-districts";

const LANDMARK_URL: Record<LandmarkModel, string> = {
  wirtshaus: "/models/aurenfurt/wirtshaus.glb",
  kraemer: "/models/aurenfurt/kraemer.glb",
};

/** Fußabdruck auf der Tafel, in Welteinheiten. Die Stadt selbst ist etwa vier Einheiten breit. */
const LANDMARK_WIDTH = 0.3;

type Props = {
  model: LandmarkModel;
};

export function HoloLandmarkMesh({ model }: Props) {
  const url = LANDMARK_URL[model];
  const { scene } = useGLTF(url);
  const object = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const span = Math.max(size.x, size.z, 0.001);
    const scale = LANDMARK_WIDTH / span;
    object.scale.setScalar(scale);
    object.position.set(0, -box.min.y * scale, 0);
  }, [object]);

  return <primitive object={object} />;
}

useGLTF.preload(LANDMARK_URL.wirtshaus);
useGLTF.preload(LANDMARK_URL.kraemer);
