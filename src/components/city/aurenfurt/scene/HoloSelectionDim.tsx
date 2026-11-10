"use client";

/**
 * Tages-/Nachtlicht + sanfte Abdunklung bei Gebäude-Auswahl.
 * Nacht wechselt langsam (kein harter Cut).
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, Color, DirectionalLight, Fog, PointLight } from "three";
import { HOLO_FLOAT_AMPLITUDE } from "../hooks/useHoloFloat";
import { HoloCityNightLights } from "./HoloCityNightLights";

type Props = {
  /** true, wenn ein Gebäude gewählt ist. */
  active: boolean;
  /** SL-Nachtmodus — Übergang ist weich. */
  night?: boolean;
  /** Gleiche Schwebe-Amplitude wie CityModel (0 im Editor). */
  floatAmplitude?: number;
};

const DAY = {
  ambient: 0.64,
  key: 1.5,
  fill: 0.3,
  under: 1.8,
  keyColor: "#fff6e4",
  fillColor: "#9fd8ff",
  underColor: "#37d7ff",
  bg: "#02080c",
  fogNear: 14,
  fogFar: 28,
} as const;

const NIGHT = {
  ambient: 0.22,
  key: 0.28,
  fill: 0.38,
  under: 0.35,
  keyColor: "#8ea6c8",
  fillColor: "#3a4f78",
  underColor: "#1c2a44",
  bg: "#01040a",
  fogNear: 10,
  fogFar: 22,
} as const;

/** Ziel-Faktoren bei Auswahl (nicht auf Schwarz — Karte bleibt lesbar). */
const DIM = {
  ambient: 0.52,
  key: 0.58,
  fill: 0.45,
  under: 0.4,
} as const;

/** ~5–6 s weicher Übergang Tag ↔ Nacht. */
const NIGHT_LERP = 0.38;

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function HoloSelectionDim({
  active,
  night = false,
  floatAmplitude = HOLO_FLOAT_AMPLITUDE,
}: Props) {
  const ambientRef = useRef<AmbientLight>(null);
  const keyRef = useRef<DirectionalLight>(null);
  const fillRef = useRef<DirectionalLight>(null);
  const underRef = useRef<PointLight>(null);
  const moonRef = useRef<DirectionalLight>(null);
  const dimAmount = useRef(0);
  const nightAmount = useRef(0);
  const keyColor = useRef(new Color(DAY.keyColor));
  const fillColor = useRef(new Color(DAY.fillColor));
  const underColor = useRef(new Color(DAY.underColor));
  const fogColor = useRef(new Color(DAY.bg));
  const dayKey = useRef(new Color(DAY.keyColor));
  const dayFill = useRef(new Color(DAY.fillColor));
  const dayUnder = useRef(new Color(DAY.underColor));
  const nightKey = useRef(new Color(NIGHT.keyColor));
  const nightFill = useRef(new Color(NIGHT.fillColor));
  const nightUnder = useRef(new Color(NIGHT.underColor));
  const dayBg = useRef(new Color(DAY.bg));
  const nightBg = useRef(new Color(NIGHT.bg));
  const { scene, gl } = useThree();

  useFrame((_, delta) => {
    const dimTarget = active ? 1 : 0;
    const nightTarget = night ? 1 : 0;
    const dimStep = Math.min(1, delta * 3.6);
    const nightStep = Math.min(1, delta * NIGHT_LERP);
    dimAmount.current += (dimTarget - dimAmount.current) * dimStep;
    nightAmount.current += (nightTarget - nightAmount.current) * nightStep;
    const d = dimAmount.current;
    const n = nightAmount.current;

    const ambient = mix(DAY.ambient, NIGHT.ambient, n) * (1 - (1 - DIM.ambient) * d);
    const key = mix(DAY.key, NIGHT.key, n) * (1 - (1 - DIM.key) * d);
    const fill = mix(DAY.fill, NIGHT.fill, n) * (1 - (1 - DIM.fill) * d);
    const under = mix(DAY.under, NIGHT.under, n) * (1 - (1 - DIM.under) * d);

    keyColor.current.copy(dayKey.current).lerp(nightKey.current, n);
    fillColor.current.copy(dayFill.current).lerp(nightFill.current, n);
    underColor.current.copy(dayUnder.current).lerp(nightUnder.current, n);
    fogColor.current.copy(dayBg.current).lerp(nightBg.current, n);

    if (ambientRef.current) ambientRef.current.intensity = ambient;
    if (keyRef.current) {
      keyRef.current.intensity = key;
      keyRef.current.color.copy(keyColor.current);
    }
    if (fillRef.current) {
      fillRef.current.intensity = fill;
      fillRef.current.color.copy(fillColor.current);
    }
    if (underRef.current) {
      underRef.current.intensity = under;
      underRef.current.color.copy(underColor.current);
    }
    if (moonRef.current) {
      moonRef.current.intensity = n * 0.55;
    }

    gl.setClearColor(fogColor.current, 1);
    const fog = scene.fog;
    if (fog instanceof Fog) {
      fog.color.copy(fogColor.current);
      fog.near = mix(DAY.fogNear, NIGHT.fogNear, n);
      fog.far = mix(DAY.fogFar, NIGHT.fogFar, n);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={DAY.ambient} />
      <directionalLight
        ref={keyRef}
        position={[3.4, 6.4, 2.4]}
        intensity={DAY.key}
        color={DAY.keyColor}
      />
      <directionalLight
        ref={fillRef}
        position={[-4.2, 2.4, -1.6]}
        intensity={DAY.fill}
        color={DAY.fillColor}
      />
      <directionalLight
        ref={moonRef}
        position={[-2.2, 5.5, 3.2]}
        intensity={0}
        color="#a8b8d8"
      />
      <pointLight
        ref={underRef}
        position={[0, -0.7, 0]}
        intensity={DAY.under}
        color={DAY.underColor}
        distance={8}
      />
      <HoloCityNightLights amountRef={nightAmount} floatAmplitude={floatAmplitude} />
    </>
  );
}
