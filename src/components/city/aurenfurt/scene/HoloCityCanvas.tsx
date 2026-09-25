"use client";

import { Component, Suspense, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CityModel } from "../CityModel";
import type { HoloSelection } from "../aurenfurt-districts";
import { HoloFocusRig } from "./HoloFocusRig";

type Props = {
  selection: HoloSelection | null;
  hovered: HoloSelection | null;
  onSelect: (selection: HoloSelection | null) => void;
  onHover: (selection: HoloSelection | null) => void;
};

type BoundaryProps = { children: ReactNode };
type BoundaryState = { failed: boolean };

class HoloCityErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center font-libre text-sm text-gray-300">
          Das Diorama konnte nicht geladen werden. WebGL ist in diesem Browser nicht verfügbar.
        </div>
      );
    }
    return this.props.children;
  }
}

function CursorReset() {
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);
  return null;
}

export default function HoloCityCanvas({ selection, hovered, onSelect, onHover }: Props) {
  return (
    <HoloCityErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100/80">
            Diorama wird gehoben…
          </div>
        }
      >
        <Canvas
          camera={{ position: [0.2, 3.5, 5.25], fov: 34, near: 0.1, far: 40 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onPointerMissed={() => onSelect(null)}
        >
          <color attach="background" args={["#02080c"]} />
          <fog attach="fog" args={["#02080c", 8.5, 16]} />
          <ambientLight intensity={0.64} />
          <directionalLight position={[3.4, 6.4, 2.4]} intensity={1.5} color="#fff6e4" />
          <directionalLight position={[-4.2, 2.4, -1.6]} intensity={0.3} color="#9fd8ff" />
          <pointLight position={[0, -0.7, 0]} intensity={1.8} color="#37d7ff" distance={8} />
          <Suspense fallback={null}>
            <CityModel selection={selection} hovered={hovered} onSelect={onSelect} onHover={onHover} />
          </Suspense>
          <HoloFocusRig selection={selection} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!selection}
            autoRotateSpeed={0.28}
            minPolarAngle={0.52}
            maxPolarAngle={1.15}
            minDistance={2.8}
            maxDistance={12}
            target={[0, 0.12, 0]}
          />
          <CursorReset />
        </Canvas>
      </Suspense>
    </HoloCityErrorBoundary>
  );
}
