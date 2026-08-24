/**
 * WorldMapGroupToken — Draggable group token with radial camping toggle.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Tent, Users, X } from "lucide-react";

type Props = {
  left: number;
  top: number;
  cellSize: number;
  isCamping: boolean;
  isGm: boolean;
  onToggleCamping: (next: boolean) => void;
  onMoveToPixel?: (clientX: number, clientY: number) => void;
};

export function WorldMapGroupToken({
  left,
  top,
  cellSize,
  isCamping,
  isGm,
  onToggleCamping,
  onMoveToPixel,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const size = Math.max(28, Math.min(48, cellSize * 0.85));

  return (
    <div
      ref={rootRef}
      className="absolute z-20"
      style={{
        left,
        top,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
      }}
    >
      <button
        type="button"
        className={`flex h-full w-full items-center justify-center rounded-full border-2 shadow-lg ${
          isCamping
            ? "border-orange-400 bg-hero-dark text-orange-300"
            : "border-accent-gold bg-hero-dark text-accent-gold"
        } ${isGm ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
        title={isCamping ? "Gruppe kampiert" : "Gruppe"}
        onPointerDown={(e) => {
          if (!isGm || e.button !== 0) return;
          e.stopPropagation();
          dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current || !onMoveToPixel) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (dx * dx + dy * dy > 16) {
            dragRef.current.moved = true;
            onMoveToPixel(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          const wasDrag = dragRef.current?.moved;
          dragRef.current = null;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          if (!wasDrag && isGm) {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }
        }}
      >
        {isCamping ? <Flame className="h-4 w-4" /> : <Users className="h-4 w-4" />}
      </button>

      {menuOpen && isGm && (
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-full border border-hero-border/60 bg-black/80" />
            <button
              type="button"
              className="absolute left-1/2 top-1 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-full bg-hero-dark px-2 py-1.5 text-[9px] font-barlow font-bold uppercase text-accent-gold hover:bg-hero-vibrant hover:text-black"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCamping(!isCamping);
                setMenuOpen(false);
              }}
            >
              {isCamping ? <Users className="h-4 w-4" /> : <Tent className="h-4 w-4" />}
              {isCamping ? "Reise" : "Camp"}
            </button>
            <button
              type="button"
              className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border border-hero-border bg-black/90 p-1.5 text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              aria-label="Menü schließen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
