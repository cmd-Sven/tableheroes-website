"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

export type ItemActionMenuAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type ItemActionMenuEntry = {
  id: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type Props = {
  title: string;
  anchor: ItemActionMenuAnchor;
  items: ItemActionMenuEntry[];
  onClose: () => void;
  /** Gürtel-Overlay schließt nicht, wenn der Klick im Menü landet. */
  beltUi?: boolean;
};

const MENU_MARGIN = 8;
const MENU_GAP = 4;

function clampToTile(
  anchor: ItemActionMenuAnchor,
  width: number,
  height: number,
): { left: number; top: number } {
  let left = anchor.left;
  let top = anchor.bottom + MENU_GAP;
  if (left + width > window.innerWidth - MENU_MARGIN) {
    left = anchor.right - width;
  }
  if (top + height > window.innerHeight - MENU_MARGIN) {
    top = anchor.top - MENU_GAP - height;
  }
  left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - MENU_MARGIN - width));
  top = Math.max(MENU_MARGIN, Math.min(top, window.innerHeight - MENU_MARGIN - height));
  return { left, top };
}

/**
 * Gemeinsames Item-Menü für Rucksack und Gürtel.
 * Portal auf document.body: der Rucksack nutzt filter:drop-shadow, dadurch wäre
 * position:fixed relativ zu dieser Box und Viewport-Koordinaten landen weit außerhalb.
 */
export function ItemActionContextMenu({ title, anchor, items, onClose, beltUi }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = clampToTile(anchor, rect.width, rect.height);
    setPos((prev) =>
      prev && prev.left === next.left && prev.top === next.top ? prev : next,
    );
  }, [anchor, items.length, title]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (ref.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll(e: Event) {
      const target = e.target;
      if (target instanceof Node && ref.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  if (typeof document === "undefined" || items.length === 0) return null;

  return createPortal(
    <div
      ref={ref}
      data-belt-ui={beltUi ? "" : undefined}
      role="menu"
      className={`fixed z-[230] min-w-[170px] rounded-lg border border-hero-border bg-background-card py-1 shadow-2xl ${
        pos ? "opacity-100" : "opacity-0"
      }`}
      style={{
        left: pos?.left ?? anchor.left,
        top: pos?.top ?? anchor.bottom + MENU_GAP,
      }}
    >
      <p className="truncate border-b border-hero-border/40 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-accent-gold">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => item.onSelect()}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-barlow text-xs hover:bg-hero-dark/60 disabled:opacity-40 ${
              item.danger ? "text-red-400 hover:text-red-300" : "text-gray-300 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
