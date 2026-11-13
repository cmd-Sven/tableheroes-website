"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  InstancedMesh,
  Object3D,
  Points,
  Sprite,
  type Texture,
} from "three";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/Lensflare.js";
import { DIORAMA_DEPTH, DIORAMA_WIDTH } from "./diorama-geometry";
import type { WeatherFxId } from "../aurenfurt-weather-fx";

/** Sonne im Sonnenschein-Effekt — Anker für Glow und Lensflare. */
const SUN_POS: [number, number, number] = [2.15, 2.15, -1.35];

type Props = {
  effect: WeatherFxId;
  /** 0–100. Manuelle Wahl liegt fest bei 74, automatisch kommt vom Tag. */
  intensity: number;
};

const RAIN_COUNT = 720;
const SNOW_COUNT = 240;

function ignoreRaycast() {
  return null;
}

function radialTexture(inner: string, outer: string, mid?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, inner);
  if (mid) gradient.addColorStop(0.48, mid);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function useRadialTexture(inner: string, outer: string, mid?: string) {
  const texture = useMemo(() => radialTexture(inner, outer, mid), [inner, outer, mid]);
  useLayoutEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Rain({ intensity }: { intensity: number }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const drops = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, () => {
        const length = 0.045 + Math.random() * 0.07;
        return {
          x: (Math.random() - 0.5) * DIORAMA_WIDTH,
          y: Math.random() * 2.1,
          z: (Math.random() - 0.5) * DIORAMA_DEPTH,
          speed: 2.4 + Math.random() * 2.2,
          /** Dünne Streaks: Breite/Tiefe stark unter der Länge. */
          sx: 0.0016 + Math.random() * 0.0014,
          sy: length,
          sz: 0.0016 + Math.random() * 0.0014,
          tilt: -0.22 - Math.random() * 0.12,
        };
      }),
    [],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const step = Math.min(delta, 0.05) * (0.85 + intensity / 110);
    const drift = 0.55 + intensity / 180;
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      drop.y -= drop.speed * step;
      drop.x += step * drift;
      if (drop.y < 0.03 || drop.x > DIORAMA_WIDTH / 2) {
        drop.y = 1.65 + Math.random() * 0.85;
        drop.x = -DIORAMA_WIDTH / 2 + Math.random() * DIORAMA_WIDTH;
        drop.z = (Math.random() - 0.5) * DIORAMA_DEPTH;
      }
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(0.08, 0, drop.tilt);
      dummy.scale.set(drop.sx / 0.0025, drop.sy / 0.08, drop.sz / 0.0025);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const opacity = 0.28 + (intensity / 100) * 0.22;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, RAIN_COUNT]}
      raycast={ignoreRaycast}
      frustumCulled={false}
    >
      {/* Basis-Streak; Instanz-Scale macht die Tropfen unterschiedlich lang/dünn. */}
      <boxGeometry args={[0.0025, 0.08, 0.0025]} />
      <meshBasicMaterial
        color="#c8daf5"
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </instancedMesh>
  );
}

function Snow({ intensity }: { intensity: number }) {
  const pointsRef = useRef<Points>(null);
  const flakes = useMemo(() => {
    const positions = new Float32Array(SNOW_COUNT * 3);
    const speeds = new Float32Array(SNOW_COUNT);
    for (let index = 0; index < SNOW_COUNT; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * DIORAMA_WIDTH;
      positions[index * 3 + 1] = Math.random() * 2;
      positions[index * 3 + 2] = (Math.random() - 0.5) * DIORAMA_DEPTH;
      speeds[index] = 0.18 + Math.random() * 0.28;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const attribute = points.geometry.getAttribute("position");
    const step = Math.min(delta, 0.05) * (0.65 + intensity / 160);
    const time = state.clock.elapsedTime;
    for (let index = 0; index < SNOW_COUNT; index += 1) {
      let y = attribute.getY(index) - flakes.speeds[index] * step;
      let x = attribute.getX(index) + Math.sin(time * 0.7 + index) * step * 0.35;
      if (y < 0.06) {
        y = 1.5 + Math.random() * 0.6;
        x = (Math.random() - 0.5) * DIORAMA_WIDTH;
        attribute.setZ(index, (Math.random() - 0.5) * DIORAMA_DEPTH);
      }
      if (x > DIORAMA_WIDTH / 2) x = -DIORAMA_WIDTH / 2;
      if (x < -DIORAMA_WIDTH / 2) x = DIORAMA_WIDTH / 2;
      attribute.setX(index, x);
      attribute.setY(index, y);
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} raycast={ignoreRaycast} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[flakes.positions, 3]} count={SNOW_COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#f4f7ff" size={0.045} transparent opacity={0.9} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function DriftingSprites({
  texture,
  count,
  yMin,
  ySpan,
  scaleMin,
  scaleSpan,
  opacity,
  speed,
}: {
  texture: Texture;
  count: number;
  yMin: number;
  ySpan: number;
  scaleMin: number;
  scaleSpan: number;
  opacity: number;
  speed: number;
}) {
  const groupRef = useRef<Sprite[]>([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        x: (Math.random() - 0.5) * DIORAMA_WIDTH * 0.9,
        y: yMin + Math.random() * ySpan,
        z: (Math.random() - 0.5) * DIORAMA_DEPTH * 0.85,
        scale: scaleMin + Math.random() * scaleSpan,
        phase: index * 1.7,
      })),
    [count, scaleMin, scaleSpan, yMin, ySpan],
  );

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    seeds.forEach((seed, index) => {
      const sprite = groupRef.current[index];
      if (!sprite) return;
      sprite.position.x = seed.x + Math.sin(time * speed + seed.phase) * 0.35;
      sprite.position.z = seed.z + Math.cos(time * speed * 0.7 + seed.phase) * 0.2;
    });
  });

  return (
    <>
      {seeds.map((seed, index) => (
        <sprite
          key={index}
          ref={(node) => {
            if (node) groupRef.current[index] = node;
          }}
          position={[seed.x, seed.y, seed.z]}
          scale={[seed.scale, seed.scale * 0.62, 1]}
          raycast={ignoreRaycast}
        >
          <spriteMaterial map={texture} transparent opacity={opacity} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </>
  );
}

/** Leichter Lensflare — eigene Textur (dispose gehört zu Lensflare), kein Bloom. */
function SunLensflare() {
  const flare = useMemo(() => {
    const map = radialTexture("rgba(255,245,210,0.95)", "rgba(255,220,140,0)");
    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(map, 140, 0, new Color("#ffe7b8")));
    lensflare.addElement(new LensflareElement(map, 48, 0.22, new Color("#ffd28a")));
    lensflare.addElement(new LensflareElement(map, 28, 0.48, new Color("#ffc070")));
    lensflare.addElement(new LensflareElement(map, 64, 0.72, new Color("#fff1d0")));
    lensflare.raycast = ignoreRaycast;
    return lensflare;
  }, []);

  useLayoutEffect(
    () => () => {
      flare.dispose();
    },
    [flare],
  );

  return <primitive object={flare} position={SUN_POS} />;
}

function Sunshine() {
  const sun = useRadialTexture("rgba(255,236,170,0.95)", "rgba(255,236,170,0)");
  const glowRef = useRef<Sprite>(null);
  const streakRef = useRef<Sprite>(null);

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
    if (glowRef.current) glowRef.current.material.opacity = 0.82 + pulse;
    if (streakRef.current) streakRef.current.material.opacity = 0.18 + pulse * 0.35;
  });

  return (
    <group>
      <sprite ref={glowRef} position={SUN_POS} scale={[0.85, 0.85, 1]} raycast={ignoreRaycast}>
        <spriteMaterial map={sun} transparent depthWrite={false} />
      </sprite>
      {/* Anamorphischer Soft-Streifen am Sonnenkern */}
      <sprite ref={streakRef} position={SUN_POS} scale={[2.35, 0.07, 1]} raycast={ignoreRaycast}>
        <spriteMaterial
          map={sun}
          color="#ffe4ad"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </sprite>
      <SunLensflare />
      <directionalLight position={[2.4, 3.4, -1.1]} intensity={0.85} color="#ffe4ad" />
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[1.15 - index * 0.55, 1.15, -0.35 + index * 0.25]}
          rotation={[0.35, 0.15, 0.45 + index * 0.2]}
          raycast={ignoreRaycast}
        >
          <planeGeometry args={[0.28, 2.1]} />
          <meshBasicMaterial
            color="#ffe7b0"
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Weicher Bodennebel ohne harte Rechteckkante — radial auslaufend. */
function SoftGroundMist({ intensity }: { intensity: number }) {
  const mist = useRadialTexture(
    "rgba(210,220,228,0.55)",
    "rgba(210,220,228,0)",
    "rgba(210,220,228,0.22)",
  );
  const veil = useRadialTexture(
    "rgba(186,198,208,0.28)",
    "rgba(186,198,208,0)",
    "rgba(186,198,208,0.1)",
  );
  const strength = Math.max(20, Math.min(100, intensity || 55));
  const baseOpacity = 0.22 + (strength / 100) * 0.18;
  const layers = useMemo(
    () =>
      [
        { y: 0.14, scale: DIORAMA_WIDTH * 1.35, opacity: baseOpacity * 0.85, speed: 0.04 },
        { y: 0.32, scale: DIORAMA_WIDTH * 1.15, opacity: baseOpacity * 0.55, speed: 0.06 },
        { y: 0.55, scale: DIORAMA_WIDTH * 0.95, opacity: baseOpacity * 0.35, speed: 0.08 },
      ] as const,
    [baseOpacity],
  );
  const layerRefs = useRef<(Sprite | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    layers.forEach((layer, index) => {
      const sprite = layerRefs.current[index];
      if (!sprite) return;
      sprite.position.x = Math.sin(time * layer.speed + index) * 0.18;
      sprite.position.z = Math.cos(time * layer.speed * 0.8 + index * 1.2) * 0.12;
      sprite.material.opacity = layer.opacity * (0.92 + Math.sin(time * 0.45 + index) * 0.08);
    });
  });

  return (
    <group>
      {layers.map((layer, index) => (
        <sprite
          key={index}
          ref={(node) => {
            layerRefs.current[index] = node;
          }}
          position={[0, layer.y, 0]}
          scale={[layer.scale, layer.scale * (DIORAMA_DEPTH / DIORAMA_WIDTH), 1]}
          raycast={ignoreRaycast}
          frustumCulled={false}
        >
          <spriteMaterial
            map={index === 0 ? veil : mist}
            color="#d5dee6"
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
      <DriftingSprites
        texture={mist}
        count={5}
        yMin={0.22}
        ySpan={0.55}
        scaleMin={2.2}
        scaleSpan={1.8}
        opacity={0.22 + (strength / 100) * 0.12}
        speed={0.1}
      />
    </group>
  );
}

export function HoloWeatherFx({ effect, intensity }: Props) {
  const overcast = useRadialTexture(
    "rgba(110,120,132,0.22)",
    "rgba(110,120,132,0)",
    "rgba(110,120,132,0.08)",
  );
  const strength = Math.max(20, Math.min(100, intensity || 55));

  return (
    <group>
      {effect === "regen" ? <Rain intensity={strength} /> : null}
      {effect === "schnee" ? <Snow intensity={strength} /> : null}
      {effect === "nebel" ? <SoftGroundMist intensity={strength} /> : null}
      {effect === "bewoelkt" ? (
        /* PNG-Wolken: HoloDriftingClouds; hier nur weicher Himmelsschleier. */
        <sprite
          position={[0, 1.65, 0]}
          scale={[DIORAMA_WIDTH * 1.45, DIORAMA_DEPTH * 1.45, 1]}
          raycast={ignoreRaycast}
          frustumCulled={false}
        >
          <spriteMaterial
            map={overcast}
            color="#6e7884"
            transparent
            opacity={0.28}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ) : null}
      {effect === "sonnenschein" ? <Sunshine /> : null}
    </group>
  );
}
