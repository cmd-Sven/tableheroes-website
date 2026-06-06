"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
  zIndexClass?: string;
};

const SIZE_CLASS = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

export function GmBoardSettingsModal({
  open,
  onClose,
  title,
  children,
  size = "md",
  zIndexClass = "z-[150]",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[min(92vh,720px)] w-full flex-col overflow-hidden rounded-t-2xl border border-hero-border/50 bg-background-card shadow-2xl sm:rounded-2xl ${SIZE_CLASS[size]}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gm-board-settings-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2
            id="gm-board-settings-title"
            className="font-barlow text-sm font-bold uppercase tracking-wide text-white"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border/50 p-1.5 text-gray-400 transition-colors hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
