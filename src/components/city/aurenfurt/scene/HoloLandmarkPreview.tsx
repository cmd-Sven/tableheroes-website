"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";
import type { LandmarkModel } from "../aurenfurt-districts";
import { LANDMARK_URL } from "./HoloLandmarkMesh";

/** Zielgröße in Welteinheiten — Modell soll die Preview-Box füllen. */
const PREVIEW_SPAN = 1.35;
/** Eine volle Umdrehung um die Hochachse. */
const TURN_SECONDS = 16;

type Props = {
  model: LandmarkModel;
};

function PreviewModel({ model }: Props) {
  const url = LANDMARK_URL[model];
  const { scene } = useGLTF(url);
  const object = useMemo(() => scene.clone(true), [scene]);
  const spinRef = useRef<Group>(null);

  useLayoutEffect(() => {
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.001);
    const scale = PREVIEW_SPAN / span;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [object]);

  useFrame((_, delta) => {
    const node = spinRef.current;
    if (!node) return;
    node.rotation.y += ((Math.PI * 2) / TURN_SECONDS) * delta;
  });

  return (
    <group ref={spinRef}>
      <primitive object={object} />
    </group>
  );
}

/** Kompakte 3D-Vorschau für das Overlay-Panel (nicht die Stadtkarte). */
export default function HoloLandmarkPreview({ model }: Props) {
  return (
    <div
      className="h-40 w-full overflow-hidden rounded border border-hero-border/40 bg-background-card"
      aria-hidden
    >
      <Canvas
        camera={{ position: [1.9, 1.15, 1.9], fov: 32, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3.2, 4.5, 2.2]} intensity={1.15} />
        <directionalLight position={[-2.4, 1.8, -2.8]} intensity={0.4} />
        <Suspense fallback={null}>
          <PreviewModel model={model} />
        </Suspense>
      </Canvas>
    </div>
  );
}
