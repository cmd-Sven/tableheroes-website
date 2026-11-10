"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, ScrollText, User, X } from "lucide-react";
import type { AurenfurtPresentedCard } from "@/src/lib/actions/aurenfurt-session-actions";

type Props = {
  card: AurenfurtPresentedCard | null;
  /** Nur SL darf für alle schließen. */
  canDismiss?: boolean;
  onDismiss?: () => void;
};

export function AurenfurtPlayedCardModal({ card, canDismiss = false, onDismiss }: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {card ? (
        <motion.div
          key={card.revealId}
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="aurenfurt-played-card-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={canDismiss ? onDismiss : undefined}
        >
          <motion.div
            className="relative w-full max-w-[min(92vw,26rem)]"
            initial={{ opacity: 0, y: 36, scale: 0.86, rotate: -4 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={(event) => event.stopPropagation()}
          >
            {canDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="absolute -right-2 -top-2 z-10 rounded-full border border-hero-border bg-background-dark p-2 text-gray-300 hover:border-accent-gold hover:text-white"
                aria-label="Karte vom Tisch nehmen"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}

            <article className="overflow-hidden rounded-xl border-2 border-accent-gold bg-[#0a1f10] shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
              <div className="relative aspect-[3/4] w-full bg-[#132e1b]">
                {card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
                    {card.kind === "kaiser" ? (
                      <Crown className="h-14 w-14 text-accent-gold" />
                    ) : card.kind === "city-event" ? (
                      <ScrollText className="h-14 w-14 text-accent-gold" />
                    ) : (
                      <User className="h-14 w-14 text-hero-vibrant" />
                    )}
                    <p
                      id="aurenfurt-played-card-title"
                      className="text-center font-cinzel text-xl font-bold text-accent-gold"
                    >
                      {card.title}
                    </p>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-16">
                  {card.subtitle ? (
                    <p className="font-barlow text-[10px] font-bold uppercase tracking-[0.18em] text-accent-gold">
                      {card.subtitle}
                    </p>
                  ) : null}
                  <h2
                    id={card.imageUrl ? "aurenfurt-played-card-title" : undefined}
                    className="mt-1 font-cinzel text-2xl font-bold text-white"
                  >
                    {card.title}
                  </h2>
                </div>
              </div>
              {card.text ? (
                <p className="border-t border-hero-dark/70 px-4 py-3 font-libre text-sm leading-relaxed text-gray-200">
                  {card.text}
                </p>
              ) : null}
              <p className="border-t border-hero-dark/50 px-4 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {canDismiss
                  ? "Karte liegt auf dem Tisch — Schließen nimmt sie für alle weg"
                  : "Der Spielleiter hat diese Karte ausgelegt"}
              </p>
            </article>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
