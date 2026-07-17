"use client";

import { useLayoutEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DiceRollScene } from "./DiceRollScene";
import { DICE_CAMERA } from "@/src/lib/session/dice-screen-project";

type Props = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  aimX: number;
  aimZ: number;
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
  onSettled: () => void;
  showResult?: boolean;
};

function TopDownOrthoCamera() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const set = useThree((s) => s.set);
  const configured = useRef(false);

  useLayoutEffect(() => {
    const halfH = DICE_CAMERA.orthoHalfH;
    const aspect = size.width / Math.max(1, size.height);
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.near = DICE_CAMERA.near;
    camera.far = DICE_CAMERA.far;
    camera.position.set(...DICE_CAMERA.position);
    camera.up.set(0, 0, -1);
    camera.lookAt(...DICE_CAMERA.lookAt);
    camera.updateProjectionMatrix();
    if (!configured.current) {
      set({ camera });
      configured.current = true;
    }
  }, [camera, set, size.height, size.width]);

  return null;
}

export default function DiceRollCanvas({
  sides,
  faces,
  seed,
  startAt,
  aimX,
  aimZ,
  throwDirX,
  throwDirZ,
  throwStrength,
  isTap,
  onSettled,
  showResult,
}: Props) {
  return (
    <Canvas
      orthographic
      camera={{
        position: [...DICE_CAMERA.position],
        near: DICE_CAMERA.near,
        far: DICE_CAMERA.far,
        zoom: 1,
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      shadows
    >
      <TopDownOrthoCamera />
      <DiceRollScene
        sides={sides}
        faces={faces}
        seed={seed}
        startAt={startAt}
        aimX={aimX}
        aimZ={aimZ}
        throwDirX={throwDirX}
        throwDirZ={throwDirZ}
        throwStrength={throwStrength}
        isTap={isTap}
        onAllSettled={onSettled}
        showResult={showResult}
      />
    </Canvas>
  );
}
