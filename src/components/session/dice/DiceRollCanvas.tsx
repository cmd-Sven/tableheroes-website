"use client";

import { Canvas } from "@react-three/fiber";
import { DiceRollScene } from "./DiceRollScene";

type Props = {
  sides: number;
  faces: number[];
  seed: string;
  startAt: number;
  onSettled: () => void;
  resultLabel?: string | null;
  showResult?: boolean;
};

export default function DiceRollCanvas({
  sides,
  faces,
  seed,
  startAt,
  onSettled,
  resultLabel,
  showResult,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 4.1, 5.6], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
      shadows
    >
      <DiceRollScene
        sides={sides}
        faces={faces}
        seed={seed}
        startAt={startAt}
        onAllSettled={onSettled}
        resultLabel={resultLabel}
        showResult={showResult}
      />
    </Canvas>
  );
}
