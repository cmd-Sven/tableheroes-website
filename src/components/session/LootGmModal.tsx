"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X } from "lucide-react";
import { LootDraftPanel } from "@/src/components/session/LootDraftPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  campaignId: string;
  activeLootId: string | null;
  onClearStageLoot: () => void;
  onPublished: () => void | Promise<void>;
};

export function LootGmModal({
  open,
  onClose,
  sessionId,
  campaignId,
  activeLootId,
  onClearStageLoot,
  onPublished,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="loot-gm-modal"
          role="presentation"
          className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label="Schließen"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loot-gm-modal-title"
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-background-card/95 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hero-border/60 bg-black/20 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Gift className="h-7 w-7 shrink-0 text-accent-gold" aria-hidden />
                <div className="min-w-0">
                  <h2
                    id="loot-gm-modal-title"
                    className="font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant sm:text-2xl"
                  >
                    Loot-Gun
                  </h2>
                  <p className="font-libre text-xs text-gray-400 sm:text-sm">
                    Nur für dich sichtbar: KI-Beute erzeugen, prüfen und auf die Bühne geben.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 text-gray-200 transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
                aria-label="Modal schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <LootDraftPanel
                sessionId={sessionId}
                campaignId={campaignId}
                activeLootId={activeLootId}
                onClearStageLoot={onClearStageLoot}
                onPublished={onPublished}
                variant="modal"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
