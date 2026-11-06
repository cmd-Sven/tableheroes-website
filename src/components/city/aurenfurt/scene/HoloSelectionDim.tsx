"use client";

/**
 * Sanfte Abdunklung der Szene bei Gebäude-Auswahl —
 * Spotlight-Kegel bleibt lesbarer, Karte bleibt erkennbar.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AmbientLight, DirectionalLight, PointLight } from "three";

type Props = {
  /** true, wenn ein Gebäude gewählt ist. */
  active: boolean;
};

const BASE = {
  ambient: 0.64,
  key: 1.5,
  fill: 0.3,
  under: 1.8,
} as const;

/** Ziel-Faktoren bei Auswahl (nicht auf Schwarz — Karte bleibt lesbar). */
const DIM = {
  ambient: 0.52,
  key: 0.58,
  fill: 0.45,
  under: 0.4,
} as const;

export function HoloSelectionDim({ active }: Props) {
  const ambientRef = useRef<AmbientLight>(null);
  const keyRef = useRef<DirectionalLight>(null);
  const fillRef = useRef<DirectionalLight>(null);
  const underRef = useRef<PointLight>(null);
  const amount = useRef(0);

  useFrame((_, delta) => {
    const target = active ? 1 : 0;
    const step = Math.min(1, delta * 3.6);
    amount.current += (target - amount.current) * step;
    const t = amount.current;

    if (ambientRef.current) {
      ambientRef.current.intensity = BASE.ambient * (1 - (1 - DIM.ambient) * t);
    }
    if (keyRef.current) {
      keyRef.current.intensity = BASE.key * (1 - (1 - DIM.key) * t);
    }
    if (fillRef.current) {
      fillRef.current.intensity = BASE.fill * (1 - (1 - DIM.fill) * t);
    }
    if (underRef.current) {
      underRef.current.intensity = BASE.under * (1 - (1 - DIM.under) * t);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={BASE.ambient} />
      <directionalLight ref={keyRef} position={[3.4, 6.4, 2.4]} intensity={BASE.key} color="#fff6e4" />
      <directionalLight ref={fillRef} position={[-4.2, 2.4, -1.6]} intensity={BASE.fill} color="#9fd8ff" />
      <pointLight ref={underRef} position={[0, -0.7, 0]} intensity={BASE.under} color="#37d7ff" distance={8} />
    </>
  );
}
