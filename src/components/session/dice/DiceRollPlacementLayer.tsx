/**
 * DiceRollPlacementLayer — Slingshot placement UI for dice drop targeting.
 */
"use client";

import type { PointerEvent, RefObject } from "react";
import { Dices } from "lucide-react";
import type { DicePlacementRequest } from "@/src/lib/session/dice-placement-store";

export type DiceRollPlacementLayerProps = {
  placement: DicePlacementRequest;
  bandLineRef: RefObject<SVGLineElement | null>;
  throwLineRef: RefObject<SVGLineElement | null>;
  originIconRef: RefObject<HTMLDivElement | null>;
  cursorElRef: RefObject<HTMLDivElement | null>;
  stretchFillRef: RefObject<HTMLDivElement | null>;
  stretchTrackRef: RefObject<HTMLDivElement | null>;
  hintRef: RefObject<HTMLSpanElement | null>;
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
};

export function DiceRollPlacementLayer({
  placement,
  bandLineRef,
  throwLineRef,
  originIconRef,
  cursorElRef,
  stretchFillRef,
  stretchTrackRef,
  hintRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: DiceRollPlacementLayerProps) {
  return (
    <div
      className="fixed inset-0 z-[70] cursor-none touch-none"
      style={{ background: "transparent" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="presentation"
    >
      <svg className="pointer-events-none fixed inset-0 z-[70] h-full w-full" aria-hidden>
        <line
          ref={bandLineRef}
          x1={0}
          y1={0}
          x2={0}
          y2={0}
          stroke="#cab926"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6 4"
          opacity={0.85}
        />
        <line
          ref={throwLineRef}
          x1={0}
          y1={0}
          x2={0}
          y2={0}
          stroke="#379806"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0}
          markerEnd="url(#dice-throw-arrow)"
        />
        <defs>
          <marker id="dice-throw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#379806" />
          </marker>
        </defs>
      </svg>

      <div
        ref={originIconRef}
        className="pointer-events-none fixed z-[71] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 opacity-0"
        style={{ willChange: "left, top, opacity" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-hero-vibrant bg-background-card/95 text-accent-gold shadow-lg ring-2 ring-hero-vibrant/30">
          <Dices className="h-7 w-7" strokeWidth={2.25} />
        </div>
      </div>

      <div
        ref={cursorElRef}
        className="pointer-events-none fixed z-[71] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
        style={{ left: "50%", top: "42%", willChange: "left, top, transform" }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-hero-border/80 bg-background-card/75 text-accent-gold/90 shadow-md">
          <Dices className="h-6 w-6" strokeWidth={2} />
        </div>
        <div ref={stretchTrackRef} className="h-1 w-16 overflow-hidden rounded-full bg-background-dark/80">
          <div
            ref={stretchFillRef}
            className="h-full w-full origin-left bg-accent-gold/80"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <span
          ref={hintRef}
          className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold drop-shadow"
        >
          {placement.count > 1
            ? `${placement.count}×W${placement.sides} · Halten & ziehen`
            : `W${placement.sides} · Halten & ziehen`}
        </span>
      </div>
    </div>
  );
}
