"use client";

import { useLayoutEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  DIORAMA_DEPTH,
  DIORAMA_WIDTH,
  PLINTH_HEIGHT,
  createDomedCityGeometry,
} from "./diorama-geometry";

type Props = {
  onClear: () => void;
};

export function HoloPlatform({ onClear }: Props) {
  const geometry = useMemo(() => createDomedCityGeometry(), []);
  const texture = useTexture("/images/cities/aurenfurt.jpg");
  const gl = useThree((state) => state.gl);

  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
  }, [gl, texture]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh
        geometry={geometry}
        position={[0, 0.012, 0]}
        castShadow={false}
        receiveShadow={false}
        onClick={(event) => {
          event.stopPropagation();
          onClear();
        }}
      >
        <meshStandardMaterial
          map={texture}
          roughness={0.82}
          metalness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -PLINTH_HEIGHT / 2, 0]}>
        <boxGeometry args={[DIORAMA_WIDTH, PLINTH_HEIGHT, DIORAMA_DEPTH]} />
        <meshStandardMaterial color="#5c564c" roughness={0.9} metalness={0.06} />
      </mesh>

      <mesh position={[0, -PLINTH_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[DIORAMA_WIDTH, DIORAMA_DEPTH]} />
        <meshStandardMaterial color="#2c2823" roughness={1} />
      </mesh>

      <HoloRim />
    </group>
  );
}

function HoloRim() {
  const y = 0.035;
  const t = 0.028;
  const w = DIORAMA_WIDTH;
  const d = DIORAMA_DEPTH;
  return (
    <group>
      <mesh position={[0, y, d / 2]}>
        <boxGeometry args={[w, t, t]} />
        <meshBasicMaterial color="#8ef6ff" />
      </mesh>
      <mesh position={[0, y, -d / 2]}>
        <boxGeometry args={[w, t, t]} />
        <meshBasicMaterial color="#8ef6ff" />
      </mesh>
      <mesh position={[w / 2, y, 0]}>
        <boxGeometry args={[t, t, d]} />
        <meshBasicMaterial color="#8ef6ff" />
      </mesh>
      <mesh position={[-w / 2, y, 0]}>
        <boxGeometry args={[t, t, d]} />
        <meshBasicMaterial color="#8ef6ff" />
      </mesh>
    </group>
  );
}
