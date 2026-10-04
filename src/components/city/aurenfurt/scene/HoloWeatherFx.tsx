"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  InstancedMesh,
  Object3D,
  Points,
  Sprite,
  type Texture,
} from "three";
import { DIORAMA_DEPTH, DIORAMA_WIDTH } from "./diorama-geometry";
import type { WeatherFxId } from "../aurenfurt-weather-fx";

type Props = {
  effect: WeatherFxId;
  /** 0–100. Manuelle Wahl liegt fest bei 74, automatisch kommt vom Tag. */
  intensity: number;
};

const RAIN_COUNT = 640;
const SNOW_COUNT = 420;

function ignoreRaycast() {
  return null;
}

function radialTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function useRadialTexture(inner: string, outer: string) {
  const texture = useMemo(() => radialTexture(inner, outer), [inner, outer]);
  useLayoutEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Rain({ intensity }: { intensity: number }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const drops = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, () => ({
        x: (Math.random() - 0.5) * DIORAMA_WIDTH,
        y: Math.random() * 2.1,
        z: (Math.random() - 0.5) * DIORAMA_DEPTH,
        speed: 1.7 + Math.random() * 1.5,
      })),
    [],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const step = Math.min(delta, 0.05) * (0.7 + intensity / 120);
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      drop.y -= drop.speed * step;
      drop.x += step * 0.35;
      if (drop.y < 0.04 || drop.x > DIORAMA_WIDTH / 2) {
        drop.y = 1.55 + Math.random() * 0.7;
        drop.x = -DIORAMA_WIDTH / 2 + Math.random() * DIORAMA_WIDTH;
        drop.z = (Math.random() - 0.5) * DIORAMA_DEPTH;
      }
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.rotation.set(0, 0, -0.18);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, RAIN_COUNT]} raycast={ignoreRaycast} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.18, 0.012]} />
      <meshBasicMaterial color="#d5e6ff" transparent opacity={0.62} depthWrite={false} />
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
          <spriteMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

function Sunshine() {
  const sun = useRadialTexture("rgba(255,236,170,0.95)", "rgba(255,236,170,0)");
  const glowRef = useRef<Sprite>(null);

  useFrame((state) => {
    if (!glowRef.current) return;
    const material = glowRef.current.material;
    material.opacity = 0.82 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
  });

  return (
    <group>
      <sprite ref={glowRef} position={[2.15, 2.15, -1.35]} scale={[0.85, 0.85, 1]} raycast={ignoreRaycast}>
        <spriteMaterial map={sun} transparent depthWrite={false} />
      </sprite>
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

export function HoloWeatherFx({ effect, intensity }: Props) {
  const cloud = useRadialTexture("rgba(198,206,214,0.55)", "rgba(198,206,214,0)");
  const mist = useRadialTexture("rgba(214,224,228,0.42)", "rgba(214,224,228,0)");
  const strength = Math.max(20, Math.min(100, intensity || 55));

  return (
    <group>
      {effect === "regen" ? <Rain intensity={strength} /> : null}
      {effect === "schnee" ? <Snow intensity={strength} /> : null}
      {effect === "nebel" ? (
        <>
          <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <planeGeometry args={[DIORAMA_WIDTH * 1.04, DIORAMA_DEPTH * 1.04]} />
            <meshBasicMaterial color="#c5d0d6" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <DriftingSprites
            texture={mist}
            count={7}
            yMin={0.28}
            ySpan={0.45}
            scaleMin={1.8}
            scaleSpan={1.6}
            opacity={0.34}
            speed={0.18}
          />
        </>
      ) : null}
      {effect === "bewoelkt" ? (
        <>
          <mesh position={[0, 1.7, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast}>
            <planeGeometry args={[DIORAMA_WIDTH * 1.2, DIORAMA_DEPTH * 1.2]} />
            <meshBasicMaterial color="#6e7884" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <DriftingSprites
            texture={cloud}
            count={6}
            yMin={0.95}
            ySpan={0.45}
            scaleMin={1.6}
            scaleSpan={1.5}
            opacity={0.42}
            speed={0.12}
          />
        </>
      ) : null}
      {effect === "sonnenschein" ? <Sunshine /> : null}
    </group>
  );
}
