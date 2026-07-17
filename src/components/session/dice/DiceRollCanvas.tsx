"use client";

import { Canvas } from "@react-three/fiber";
import { DiceRollScene } from "./DiceRollScene";
import { DICE_CAMERA } from "@/src/lib/session/dice-screen-project";

type Props = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  aimX: number;
  aimZ: number;
  onSettled: () => void;
  resultLabel?: string | null;
  showResult?: boolean;
};

export default function DiceRollCanvas({
  sides,
  faces,
  seed,
  startAt,
  aimX,
  aimZ,
  onSettled,
  resultLabel,
  showResult,
}: Props) {
  return (
    <Canvas
      camera={{
        position: [...DICE_CAMERA.position],
        fov: DICE_CAMERA.fov,
        near: DICE_CAMERA.near,
        far: DICE_CAMERA.far,
      }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0.35, 0);
      }}
      shadows
    >
      <DiceRollScene
        sides={sides}
        faces={faces}
        seed={seed}
        startAt={startAt}
        aimX={aimX}
        aimZ={aimZ}
        onAllSettled={onSettled}
        resultLabel={resultLabel}
        showResult={showResult}
      />
    </Canvas>
  );
}
