"use client";

import {
  Component,
  Suspense,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DiceRollScene } from "./DiceRollScene";
import { DICE_CAMERA } from "@/src/lib/session/dice-screen-project";
import type { DiceSkinId } from "@/src/lib/session/dice-skins";

type Props = {
  sides: number;
  faces: number[];
  dieSides?: number[];
  seed: string;
  aimX: number;
  aimZ: number;
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
  skinId?: DiceSkinId | null;
  onSettled: () => void;
  showResult?: boolean;
  /** R3F-/WebGL-Crash → Overlay darf Text-Fallback nutzen. */
  onContextLost?: () => void;
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

type BoundaryProps = {
  onError?: () => void;
  children: ReactNode;
};

type BoundaryState = { failed: boolean };

/** Fängt Scene-Crashes (z. B. Material/Skin) ab, ohne den ganzen Overlay-Tree zu töten. */
class DiceCanvasErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[DiceRollCanvas] 3D-Scene Fehler:", error);
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default function DiceRollCanvas({
  sides,
  faces,
  dieSides,
  seed,
  aimX,
  aimZ,
  throwDirX,
  throwDirZ,
  throwStrength,
  isTap,
  skinId = null,
  onSettled,
  showResult,
  onContextLost,
}: Props) {
  const effectiveSkin = skinId;
  const lostRef = useRef(false);

  return (
    <DiceCanvasErrorBoundary
      onError={() => {
        if (lostRef.current) return;
        lostRef.current = true;
        onContextLost?.();
      }}
    >
      {/* Suspense fängt R3F-Block-Promises ab — sonst hängt Next „Rendering…“ forever. */}
      <Suspense fallback={null}>
        <Canvas
          frameloop="always"
          orthographic
          // Kein sichtbarer Canvas-Fallback-Text (Browser zeigt children bei WebGL-Fail).
          fallback={null}
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
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            const onLost = (e: Event) => {
              e.preventDefault();
              if (lostRef.current) return;
              lostRef.current = true;
              onContextLost?.();
            };
            canvas.addEventListener("webglcontextlost", onLost, false);
          }}
        >
          <TopDownOrthoCamera />
          <DiceRollScene
            sides={sides}
            faces={faces}
            dieSides={dieSides}
            seed={seed}
            aimX={aimX}
            aimZ={aimZ}
            throwDirX={throwDirX}
            throwDirZ={throwDirZ}
            throwStrength={throwStrength}
            isTap={isTap}
            skinId={effectiveSkin}
            onAllSettled={onSettled}
            showResult={showResult}
          />
        </Canvas>
      </Suspense>
    </DiceCanvasErrorBoundary>
  );
}
