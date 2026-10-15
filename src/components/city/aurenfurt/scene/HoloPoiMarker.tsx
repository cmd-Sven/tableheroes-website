"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html } from "@react-three/drei";
import { motion } from "framer-motion";
import { Droplets, Landmark, MapPin, Square, Trees, type LucideIcon } from "lucide-react";
import Image from "next/image";
import {
  poiLoreHref,
  poiTooltipImage,
  type AurenfurtMapPoi,
  type PoiKind,
} from "../aurenfurt-map-pois";
import { surfacePoint } from "./diorama-geometry";

type Props = {
  poi: AurenfurtMapPoi;
  worldId: string;
  campaignId?: string | null;
  selected: boolean;
  suppressSelect: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

const KIND_ICON: Record<PoiKind, LucideIcon> = {
  Brunnen: Droplets,
  Statue: Landmark,
  Parkanlage: Trees,
  Denkmal: Landmark,
  Platz: Square,
  "sonstiger Ort": MapPin,
};

/**
 * Der frühere Gold-Pin lag fast in der angehobenen Stadtfläche (Plattform +0.012,
 * Ring nur +0.015) und verschwand im Kartenfoto. Der Token ist dasselbe Objekt,
 * als flaches DOM-Element über der gespeicherten UV-Position.
 */
export function HoloPoiMarker({
  poi,
  worldId,
  campaignId = null,
  selected,
  suppressSelect,
  onSelect,
  onHover,
}: Props) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [imageBroken, setImageBroken] = useState(false);
  const position = surfacePoint(poi.u, poi.v);
  const Icon = KIND_ICON[poi.kind] ?? MapPin;
  const imageSrc = imageBroken ? null : poiTooltipImage(poi.imageUrl);
  const loreHref = poiLoreHref(worldId, poi.id, campaignId);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    setImageBroken(false);
  }, [poi.imageUrl]);

  function readAnchor() {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left + rect.width / 2, y: rect.top };
  }

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const tick = () => {
      const next = readAnchor();
      const tip = tipRef.current;
      if (next && tip) {
        tip.style.left = `${next.x}px`;
        tip.style.top = `${next.y}px`;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function holdOpen() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const next = readAnchor();
    if (next) setAnchor(next);
    setOpen(true);
    onHover(poi.id);
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      onHover(null);
    }, 140);
  }

  return (
    <group position={[position.x, position.y + 0.08, position.z]}>
      <Html
        center
        distanceFactor={10}
        zIndexRange={[40, 0]}
        style={{ pointerEvents: suppressSelect ? "none" : "auto" }}
      >
        <button
          ref={anchorRef}
          type="button"
          aria-label={poi.name}
          className={`grid h-8 w-8 place-items-center rounded-full border-2 border-accent-gold bg-background-card shadow-lg ${
            selected ? "scale-110" : "scale-100"
          }`}
          onPointerEnter={suppressSelect ? undefined : holdOpen}
          onPointerLeave={suppressSelect ? undefined : scheduleClose}
          onClick={(event) => {
            event.stopPropagation();
            if (suppressSelect) return;
            onSelect(poi.id);
          }}
        >
          <Icon className="h-4 w-4 text-accent-gold" aria-hidden />
        </button>
      </Html>
      {open && anchor
        ? createPortal(
            <motion.div
              ref={tipRef}
              initial={{ opacity: 0, x: "-50%", y: "calc(-100% - 4px)" }}
              animate={{ opacity: 1, x: "-50%", y: "calc(-100% - 12px)" }}
              transition={{ duration: 0.18 }}
              style={{ position: "fixed", left: anchor.x, top: anchor.y, zIndex: 120 }}
              className="pointer-events-auto w-72 overflow-hidden rounded-[10px] border border-hero-border/40 bg-background-card shadow-lg"
              onPointerEnter={holdOpen}
              onPointerLeave={scheduleClose}
            >
              {imageSrc ? (
                <div className="relative h-40 w-full">
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="288px"
                    className="object-cover"
                    onError={() => setImageBroken(true)}
                  />
                </div>
              ) : null}
              <div className="space-y-2 px-3 py-3">
                <p className="font-cinzel text-lg font-bold leading-snug text-accent-gold">{poi.name}</p>
                <a
                  href={loreHref}
                  target="_blank"
                  rel="noopener"
                  className="inline-block font-barlow text-sm font-bold uppercase tracking-wide text-hero-vibrant hover:text-white"
                >
                  Mehr
                </a>
              </div>
            </motion.div>,
            document.body,
          )
        : null}
    </group>
  );
}
