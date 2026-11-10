"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { Sprite, Texture } from "three";
import { SRGBColorSpace } from "three";
import { DIORAMA_DEPTH, DIORAMA_WIDTH } from "./diorama-geometry";

/** Dieselben Wolken-Assets wie im Marketing-Header (`CloudFogOverlay`). */
export const CITY_CLOUD_SOURCES = [
  "/images/clouds/cloud1.webp",
  "/images/clouds/cloud2.webp",
  "/images/clouds/cloud3.webp",
  "/images/clouds/cloud4.webp",
  "/images/clouds/cloud5.webp",
  "/images/clouds/cloud6.webp",
  "/images/clouds/cloud7.webp",
] as const;

export type CloudDensity = "light" | "medium" | "heavy";

type Props = {
  /** light = immer leichte Atmosphäre; heavy bei Bewölkung. */
  density?: CloudDensity;
};

function ignoreRaycast() {
  return null;
}

type CloudSeed = {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  speed: number;
  textureIndex: number;
  opacity: number;
  bobPhase: number;
  bobAmp: number;
};

function buildSeeds(density: CloudDensity): CloudSeed[] {
  const count = density === "heavy" ? 9 : density === "medium" ? 7 : 5;
  const opacityBase = density === "heavy" ? 0.42 : density === "medium" ? 0.3 : 0.2;
  const speedBase = density === "heavy" ? 0.11 : 0.08;
  const halfW = DIORAMA_WIDTH * 0.62;
  const halfD = DIORAMA_DEPTH * 0.55;

  return Array.from({ length: count }, (_, index) => {
    const scale = 2.4 + ((index * 47) % 100) / 100 * 2.6;
    return {
      x: -halfW + ((index * 97) % 100) / 100 * halfW * 2,
      y: 1.05 + ((index * 37) % 100) / 100 * 0.75,
      z: -halfD + ((index * 61) % 100) / 100 * halfD * 2,
      scaleX: scale,
      scaleY: scale * (0.38 + ((index * 19) % 30) / 100),
      speed: speedBase + ((index * 13) % 40) / 1000,
      textureIndex: index % CITY_CLOUD_SOURCES.length,
      opacity: opacityBase + ((index % 3) * 0.04) - (index === 2 || index === 5 ? 0.06 : 0),
      bobPhase: index * 1.35,
      bobAmp: 0.03 + ((index * 11) % 20) / 1000,
    };
  });
}

/**
 * Langsam wandernde Wolken-Sprites über der Stadttafel.
 * Texturen = Landing-Header `/images/clouds/cloud*.webp`.
 */
export function HoloDriftingClouds({ density = "light" }: Props) {
  const textures = useTexture([...CITY_CLOUD_SOURCES]) as Texture[];
  const spriteRefs = useRef<(Sprite | null)[]>([]);
  const seeds = useMemo(() => buildSeeds(density), [density]);
  const margin = DIORAMA_WIDTH * 0.75;

  useLayoutEffect(() => {
    for (const texture of textures) {
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [textures]);

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    seeds.forEach((seed, index) => {
      const sprite = spriteRefs.current[index];
      if (!sprite) return;
      seed.x += seed.speed * step;
      if (seed.x > margin) {
        seed.x = -margin;
        seed.z = (Math.random() - 0.5) * DIORAMA_DEPTH * 0.95;
        seed.y = 1.05 + Math.random() * 0.75;
      }
      sprite.position.set(
        seed.x,
        seed.y + Math.sin(time * 0.35 + seed.bobPhase) * seed.bobAmp,
        seed.z,
      );
    });
  });

  return (
    <group>
      {seeds.map((seed, index) => (
        <sprite
          key={`${density}-${index}`}
          ref={(node) => {
            spriteRefs.current[index] = node;
          }}
          position={[seed.x, seed.y, seed.z]}
          scale={[seed.scaleX, seed.scaleY, 1]}
          raycast={ignoreRaycast}
          frustumCulled={false}
        >
          <spriteMaterial
            map={textures[seed.textureIndex]}
            transparent
            opacity={Math.max(0.12, seed.opacity)}
            depthWrite={false}
            depthTest
          />
        </sprite>
      ))}
    </group>
  );
}
