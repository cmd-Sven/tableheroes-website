"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { joinCastingCall } from "@/src/lib/casting/actions";
import type { LandingCastingCall } from "@/src/lib/casting/types";

const COVER_SRC = "/images/casting-call-tavern.jpg";

export function CastingCallCard({ call }: { call: LandingCastingCall }) {
  const [joined, setJoined] = useState(call.joined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paragraphs = call.body.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);

  async function join() {
    setPending(true);
    setError(null);
    const result = await joinCastingCall();
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJoined(true);
  }

  return (
    <article
      data-termin-card
      className="flex h-full min-h-[28rem] w-[min(88vw,22rem)] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-hero-border/50 bg-background-dark shadow-lg sm:w-[min(44vw,22rem)] lg:w-[min(30vw,22rem)]"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden">
        <Image
          src={COVER_SRC}
          alt="Tavern Call: Table-Heroes sucht neue Helden"
          fill
          sizes="(max-width: 640px) 88vw, 22rem"
          className="object-cover object-[center_30%]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 bg-background-dark p-5">
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wider text-hero-vibrant">
          Offene Runde · ohne Termin
        </p>
        <h3 className="font-cinzel text-xl font-bold leading-snug text-accent-gold">
          {call.title}
        </h3>
        <p className="font-barlow text-sm font-bold uppercase tracking-wide text-white">
          {call.subtitle}
        </p>
        <div className="space-y-3 font-libre text-sm leading-relaxed text-gray-200">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="font-libre text-xs text-gray-400">
          Mindestens {call.minPlayers} Spieler. Bis dahin Warteliste.
        </p>
      </div>
      <div className="border-t border-accent-gold/30 p-4">
        {joined ? (
          <p className="flex items-center gap-2 font-barlow text-sm font-bold uppercase text-hero-vibrant">
            <Sparkles className="h-4 w-4" />
            Du stehst auf der Warteliste
          </p>
        ) : call.loggedIn ? (
          <button
            type="button"
            onClick={() => void join()}
            disabled={pending}
            className="w-full rounded-md border border-accent-gold/60 bg-hero-dark px-4 py-3 font-barlow text-sm font-bold uppercase text-white transition-transform hover:scale-[1.02] hover:bg-hero-vibrant disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Trage ein…" : "Auf die Warteliste"}
          </button>
        ) : (
          <div className="space-y-2">
            <Link
              href="/signup?casting=1"
              className="block w-full rounded-md border border-accent-gold/60 bg-hero-dark px-4 py-3 text-center font-barlow text-sm font-bold uppercase text-white transition-transform hover:scale-[1.02] hover:bg-hero-vibrant"
            >
              Registrieren und eintragen
            </Link>
            <Link
              href="/login?casting=1"
              className="block text-center font-libre text-xs text-gray-300 hover:text-accent-gold"
            >
              Schon ein Account? Einloggen und eintragen
            </Link>
          </div>
        )}
        {error ? (
          <p className="mt-2 text-center font-libre text-xs text-red-300">{error}</p>
        ) : null}
      </div>
    </article>
  );
}
