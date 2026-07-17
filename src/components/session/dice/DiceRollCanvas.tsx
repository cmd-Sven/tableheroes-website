"use client";

import { Canvas } from "@react-three/fiber";
import { DiceRollScene } from "./DiceRollScene";

type Props = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  onComplete: () => void;
};

export default function DiceRollCanvas({ sides, faces, seed, startAt, onComplete }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 3.2, 5.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <DiceRollScene
        sides={sides}
        faces={faces}
        seed={seed}
        startAt={startAt}
        onAllSettled={onComplete}
      />
    </Canvas>
  );
}
