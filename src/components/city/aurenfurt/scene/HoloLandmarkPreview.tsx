"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import type { LandmarkModel } from "../aurenfurt-districts";
import { disposeCloneKeepSource } from "./dispose-cloned-gltf";
import { LANDMARK_URL, measureLandmarkBounds } from "./HoloLandmarkMesh";

type Props = {
  model: LandmarkModel;
};

/** Fußabdruck in der Vorschau-Kamera (Welt-Einheiten). */
const PREVIEW_SPAN = 1.2;
/** Langsame Y-Drehung, Radiant pro Sekunde. */
const SPIN_RAD_PER_SEC = 0.4;

function PreviewCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.lookAt(0, 0.35, 0);
  }, [camera]);
  return null;
}

function PreviewModel({ model }: { model: LandmarkModel }) {
  const url = LANDMARK_URL[model];
  const { scene } = useGLTF(url, true, true);
  const object = useMemo(() => scene.clone(true), [scene]);
  const spin = useRef<Group>(null);

  useLayoutEffect(() => {
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.position.set(0, 0, 0);
    const bounds = measureLandmarkBounds(object);
    if (!bounds) return;
    const scale = PREVIEW_SPAN / bounds.span;
    object.scale.setScalar(scale);
    object.position.set(-bounds.centerX * scale, -bounds.minY * scale, -bounds.centerZ * scale);
  }, [object]);

  useLayoutEffect(() => () => disposeCloneKeepSource(object, scene), [object, scene]);

  useFrame((_, dt) => {
    if (!spin.current) return;
    spin.current.rotation.y += dt * SPIN_RAD_PER_SEC;
  });

  return (
    <group ref={spin}>
      <primitive object={object} />
    </group>
  );
}

/**
 * Kleines WebGL-Preview im Gebäude-Infofenster.
 * useGLTF teilt den Cache mit der Stadtkarte (gleiche URL).
 */
export default function HoloLandmarkPreview({ model }: Props) {
  return (
    <div className="relative aspect-[2.4/1] max-h-36 w-full overflow-hidden bg-background-dark/70">
      <Canvas
        className="absolute inset-0 h-full w-full"
        dpr={[1, 1.5]}
        camera={{ position: [1.75, 1.15, 1.75], fov: 32, near: 0.01, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        frameloop="always"
      >
        <color attach="background" args={["#0a1f10"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2.4, 4, 2]} intensity={1.2} />
        <directionalLight position={[-2, 1.4, -1.2]} intensity={0.4} />
        <PreviewCamera />
        <PreviewModel model={model} />
      </Canvas>
    </div>
  );
}
