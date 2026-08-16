"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleDot } from "lucide-react";
import {
  DEFAULT_NPC_TOKEN_BORDER,
  type NpcTokenBorder,
} from "@/src/lib/npcs/npc-sheet-types";

type Props = {
  /** Quellbild (Portrait) */
  imageUrl: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  border: NpcTokenBorder;
  onBorderChange: (border: NpcTokenBorder) => void;
  /** Wird bei jeder Crop-Änderung mit Blob/File der runden Token-PNG aufgerufen */
  onTokenBlobChange: (file: File | null) => void;
};

/**
 * Zeigt das volle Portrait und lässt einen kreisrunden Ausschnitt wählen.
 * Optional: Rahmenstärke + Farbe.
 */
export function NpcTokenCropEditor({
  imageUrl,
  enabled,
  onEnabledChange,
  border,
  onBorderChange,
  onTokenBlobChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  /** Mittelpunkt + Radius in Bildpixeln */
  const [crop, setCrop] = useState({ cx: 0, cy: 0, r: 80 });
  const dragMode = useRef<"move" | "resize" | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      onTokenBlobChange(null);
    }
  }, [enabled, onTokenBlobChange]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);

    // Abdunkeln außerhalb des Kreises
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(crop.cx, crop.cy, crop.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // Kreisrand (Auswahl)
    ctx.beginPath();
    ctx.arc(crop.cx, crop.cy, crop.r, 0, Math.PI * 2);
    ctx.strokeStyle = border.color || "#cab926";
    ctx.lineWidth = Math.max(2, border.thicknessPx || 3);
    ctx.stroke();

    // Resize-Handle
    ctx.beginPath();
    ctx.arc(crop.cx + crop.r * 0.7, crop.cy + crop.r * 0.7, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#379806";
    ctx.fill();
  }, [border.color, border.thicknessPx, crop.cx, crop.cy, crop.r]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const exportToken = useCallback(async () => {
    if (!enabled || !imgRef.current?.naturalWidth) {
      onTokenBlobChange(null);
      return;
    }
    const img = imgRef.current;
    const size = Math.max(64, Math.round(crop.r * 2));
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const sx = crop.cx - crop.r;
    const sy = crop.cy - crop.r;
    ctx.drawImage(img, sx, sy, crop.r * 2, crop.r * 2, 0, 0, size, size);

    // Border auf dem Export
    if (border.thicknessPx > 0) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - border.thicknessPx / 2, 0, Math.PI * 2);
      ctx.strokeStyle = border.color;
      ctx.lineWidth = border.thicknessPx;
      ctx.stroke();
    }

    out.toBlob(
      (blob) => {
        if (!blob) {
          onTokenBlobChange(null);
          return;
        }
        onTokenBlobChange(
          new File([blob], `npc-token-${Date.now()}.png`, { type: "image/png" }),
        );
      },
      "image/png",
      0.92,
    );
  }, [border.color, border.thicknessPx, crop.cx, crop.cy, crop.r, enabled, onTokenBlobChange]);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      void exportToken();
    }, 200);
    return () => clearTimeout(t);
  }, [enabled, exportToken]);

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    const hx = crop.cx + crop.r * 0.7;
    const hy = crop.cy + crop.r * 0.7;
    const distHandle = Math.hypot(p.x - hx, p.y - hy);
    dragMode.current = distHandle < 16 ? "resize" : "move";
    lastPos.current = p;
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragMode.current || !enabled) return;
    const p = canvasPoint(e);
    const dx = p.x - lastPos.current.x;
    const dy = p.y - lastPos.current.y;
    lastPos.current = p;
    setCrop((prev) => {
      const maxR = Math.min(imgSize.w, imgSize.h) / 2;
      if (dragMode.current === "resize") {
        const nextR = Math.min(
          maxR,
          Math.max(24, Math.hypot(p.x - prev.cx, p.y - prev.cy)),
        );
        return { ...prev, r: nextR };
      }
      const cx = Math.min(imgSize.w - prev.r, Math.max(prev.r, prev.cx + dx));
      const cy = Math.min(imgSize.h - prev.r, Math.max(prev.r, prev.cy + dy));
      return { ...prev, cx, cy };
    });
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    dragMode.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-hero-border/60 bg-black/25 p-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-hero-border"
        />
        <CircleDot className="h-4 w-4 text-accent-gold" />
        <span className="font-barlow text-xs font-bold uppercase text-accent-gold">
          Optional: Runden Battlemap-Token erstellen
        </span>
      </label>

      {enabled ? (
        <>
          <p className="font-libre text-xs text-gray-400">
            Ziehe den Kreis auf den gewünschten Bereich. Am grünen Punkt die Größe ändern.
          </p>

          <div className="relative mx-auto max-w-md overflow-hidden rounded-lg border border-hero-border bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              className="hidden"
              crossOrigin="anonymous"
              onLoad={(e) => {
                const img = e.currentTarget;
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                setImgSize({ w, h });
                const r = Math.min(w, h) * 0.28;
                setCrop({ cx: w / 2, cy: h / 2, r });
              }}
            />
            <canvas
              ref={canvasRef}
              className="block w-full h-auto cursor-move touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Rahmen-Dicke (px)
              </span>
              <input
                type="range"
                min={0}
                max={16}
                value={border.thicknessPx}
                onChange={(e) =>
                  onBorderChange({
                    ...border,
                    thicknessPx: Number(e.target.value),
                  })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hero-dark accent-hero-vibrant"
              />
              <span className="font-libre text-xs text-gray-300">{border.thicknessPx}px</span>
            </label>
            <label className="block space-y-1">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Rahmen-Farbe
              </span>
              <input
                type="color"
                value={border.color || DEFAULT_NPC_TOKEN_BORDER.color}
                onChange={(e) =>
                  onBorderChange({ ...border, color: e.target.value })
                }
                className="h-9 w-full cursor-pointer rounded border border-hero-border bg-slate-900"
              />
            </label>
          </div>

          <p className="inline-flex items-center gap-1.5 font-libre text-[11px] text-hero-vibrant">
            <Check className="h-3.5 w-3.5" />
            Token-Ausschnitt wird beim Speichern des NPCs hochgeladen
          </p>
        </>
      ) : null}
    </div>
  );
}
