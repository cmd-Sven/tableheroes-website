"use client";

import Link from "next/link";
import { Eye, X } from "lucide-react";

type Props = {
  /** Ziel beim Verlassen der Vorschau */
  exitHref?: string;
  /** Optionaler Zusatzlink, z. B. Nachrichten */
  messagesHref?: string;
};

/**
 * Banner für Admin/SL: klassisches Spieler-Dashboard als Vorschau.
 */
export function PlayerDashboardPreviewBanner({
  exitHref = "/dashboard",
  messagesHref = "/dashboard/messages",
}: Props) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent-gold/70 bg-accent-gold/15 px-4 py-3 shadow-md"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Eye className="mt-0.5 h-5 w-5 shrink-0 text-accent-gold" aria-hidden />
        <div className="min-w-0">
          <p className="font-barlow text-sm font-extrabold uppercase tracking-wide text-accent-gold">
            Vorschau: Spieler-Dashboard
          </p>
          <p className="mt-0.5 font-libre text-xs leading-relaxed text-gray-200">
            Du siehst das klassische Spieler-Layout (Widgets, Postfach, Kampagnen).
            Nachrichten und Inhalte gehören zu deinem eigenen Account — keine
            Impersonation eines anderen Spielers.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={messagesHref}
          className="inline-flex items-center rounded border border-hero-border/70 bg-background-dark/80 px-3 py-1.5 font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-100 hover:border-hero-vibrant hover:text-hero-vibrant"
        >
          Nachrichten
        </Link>
        <Link
          href={exitHref}
          className="inline-flex items-center gap-1.5 rounded border border-accent-gold/80 bg-accent-gold/20 px-3 py-1.5 font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/30"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Zurück zur SL-Ansicht
        </Link>
      </div>
    </div>
  );
}
