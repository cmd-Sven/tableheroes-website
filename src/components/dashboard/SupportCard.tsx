"use client";

import Link from "next/link";
import { Heart, ArrowRight, Sparkles, Crown, Shield } from "lucide-react";

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function formatBackerDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function getMonthsDiff(iso: string): number {
  const start = new Date(iso);
  const now = new Date();
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );
}

function getBackerTitle(months: number): { title: string; sub: string } {
  if (months >= 24) return { title: "Legendärer Gönner", sub: "Seit über 2 Jahren an unserer Seite" };
  if (months >= 12) return { title: "Held der ersten Stunde", sub: "Über ein Jahr treue Unterstützung" };
  if (months >= 6)  return { title: "Treuer Patron", sub: "Seit über einem halben Jahr dabei" };
  return { title: "Edler Spender", sub: "Frisch in der Ehrenhalle" };
}

// ─── Komponente ─────────────────────────────────────────────────────────────

type Props = {
  isBacker?: boolean;
  backerSince?: string | null;
};

export function SupportCard({ isBacker, backerSince }: Props) {
  // ── Backer-Ansicht ──
  if (isBacker) {
    const months = backerSince ? getMonthsDiff(backerSince) : 0;
    const { title, sub } = getBackerTitle(months);
    const dateLabel = backerSince ? formatBackerDate(backerSince) : null;

    return (
      <div className="flex flex-col items-center text-center gap-4 p-6">
        {/* Goldener Kronen-Ring */}
        <div className="backer-avatar-ring relative h-16 w-16">
          <div className="absolute inset-0 grid place-items-center rounded-full border-2 border-accent-gold/60 bg-accent-gold/10">
            <Crown className="h-8 w-8 text-accent-gold" />
          </div>
        </div>

        {/* Titel */}
        <div className="space-y-1">
          <h3 className="font-cinzel font-bold text-base text-accent-gold flex items-center justify-center gap-1.5">
            <Shield className="h-4 w-4" />
            {title}
          </h3>
          <p className="font-libre text-xs text-gray-500 italic">{sub}</p>
        </div>

        {/* Datum im Urkunden-Stil */}
        {dateLabel && (
          <p className="font-cinzel text-[11px] tracking-wider text-accent-gold/50">
            Patron seit {dateLabel}
          </p>
        )}

        {/* Danke + Link */}
        <p className="font-libre text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
          Danke, dass du Table Heroes am Leben hältst. Dein goldener Schimmer
          ist wohlverdient!
        </p>

        <Link
          href="/support"
          className="inline-flex items-center gap-2 rounded-md border border-accent-gold/40 bg-accent-gold/10 px-5 py-2.5 font-barlow font-bold uppercase text-xs text-accent-gold transition-all hover:bg-accent-gold/20 hover:border-accent-gold/60"
        >
          Zur Ehrenhalle
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // ── Standard-Ansicht (kein Backer) ──
  return (
    <div className="flex flex-col items-center text-center gap-4 p-6">
      {/* Icon */}
      <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-accent-gold/30 bg-accent-gold/10">
        <Heart className="h-7 w-7 text-red-400" />
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <h3 className="font-cinzel font-bold text-base text-accent-gold flex items-center justify-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          Unterstütze das Projekt
        </h3>
        <p className="font-libre text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
          Table Heroes ist kostenlos. Hilf mit, die Server am Laufen zu halten
          und erhalte das exklusive Backer-Achievement.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/support"
        className="inline-flex items-center gap-2 rounded-md border border-accent-gold/40 bg-accent-gold/10 px-5 py-2.5 font-barlow font-bold uppercase text-xs text-accent-gold transition-all hover:bg-accent-gold/20 hover:border-accent-gold/60"
      >
        Mehr erfahren
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
