"use client";

import { useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Matrix4, Mesh, Vector3, type Object3D } from "three";
import { LANDMARK_WIDTH } from "./HoloLandmarkMesh";

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
  url: string;
  scaleMultiplier: number;
  rotationDegrees: number;
  interactive: boolean;
};

/** Gleiche Fußausrichtung wie die Palast-Landmark: Hüllbox auf die Tafel, Drehung um die Hochachse. */
export function HoloDecorationMesh({ url, scaleMultiplier, rotationDegrees, interactive }: Props) {
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
    object.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      mesh.raycast = interactive ? Mesh.prototype.raycast : () => undefined;
    });
  }, [interactive, object, scaleMultiplier]);

  return (
    <group rotation={[0, (rotationDegrees * Math.PI) / 180, 0]}>
      <primitive object={object} />
    </group>
  );
}
