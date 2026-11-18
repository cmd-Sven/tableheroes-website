"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { setCastingCallActive, setCastingDateSent } from "@/src/lib/casting/actions";
import type { CastingAdminState } from "@/src/lib/casting/types";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function CastingCallPanel({ initial }: { initial: CastingAdminState }) {
  const [active, setActive] = useState(initial.isActive);
  const [signups, setSignups] = useState(initial.signups);
  const [pending, setPending] = useState(false);
  const enough = signups.length >= initial.minPlayers;

  async function toggle(next: boolean) {
    setPending(true);
    const result = await setCastingCallActive(next);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setActive(next);
    toast.success(next ? "Spieler-Casting ist auf der Startseite." : "Spieler-Casting ist aus.");
  }

  async function mark(userId: string, dateSent: boolean) {
    const result = await setCastingDateSent(userId, dateSent);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSignups((rows) =>
      rows.map((row) =>
        row.userId === userId
          ? { ...row, dateSent, dateSentAt: dateSent ? new Date().toISOString() : null }
          : row,
      ),
    );
  }

  return (
    <section className="rounded-md border border-accent-gold/40 bg-background-card p-6 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-barlow text-xs font-bold uppercase tracking-wider text-accent-gold">
            Neben den Session-Terminen
          </p>
          <h2 className="mt-1 font-cinzel text-xl font-bold text-accent-gold">{initial.title}</h2>
          <p className="mt-1 font-libre text-sm text-gray-300">{initial.subtitle}</p>
          <p className="mt-2 font-libre text-sm text-gray-400">
            Ohne festen Termin. Wer sich registriert, landet auf dieser Liste.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => void toggle(!active)}
          className={`rounded-md border px-4 py-2 font-barlow text-sm font-bold uppercase ${
            active
              ? "border-hero-border bg-hero-dark text-white"
              : "border-gray-600 bg-slate-900 text-gray-300"
          }`}
        >
          {active ? "Auf der Startseite" : "Ausgeschaltet"}
        </button>
      </div>

      <div
        className={`mt-4 inline-flex items-center gap-2 rounded-md border px-3 py-2 font-barlow text-sm font-bold uppercase ${
          enough
            ? "border-hero-border text-hero-vibrant"
            : "border-accent-gold/40 text-accent-gold"
        }`}
      >
        <Users className="h-4 w-4" />
        {signups.length} von {initial.minPlayers}
        {enough ? " — genug für einen Termin" : " — noch nicht genug"}
      </div>

      {signups.length === 0 ? (
        <p className="mt-4 font-libre text-sm text-gray-400">Noch niemand auf der Warteliste.</p>
      ) : (
        <ul className="mt-4 divide-y divide-hero-dark/60">
          {signups.map((row) => (
            <li key={row.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-barlow font-bold text-white">{row.username}</p>
                <p className="font-libre text-sm text-gray-300">{row.email || "Keine E-Mail"}</p>
                <p className="font-libre text-xs text-gray-500">Eingetragen {formatWhen(row.createdAt)}</p>
              </div>
              <label className="flex items-center gap-2 font-libre text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={row.dateSent}
                  onChange={(event) => void mark(row.userId, event.target.checked)}
                  className="h-4 w-4 accent-hero-vibrant"
                />
                Termin mitgeteilt
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
