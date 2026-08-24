"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, AlertTriangle } from "lucide-react";
import { WorldSetupForm } from "./WorldSetupForm";

type World = { id: string; name: string; description: string | null };

type Props = {
  campaignId: string;
  isGM: boolean;
  /** Vom Server geladene Welten des GMs (für Welt-Zuweisung) */
  worlds?: World[];
};

export function WorldRequiredBlocker({ campaignId, isGM, worlds = [] }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isGM) {
    return (
      <div
        className="rounded-lg p-12 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
        style={{
          border: "3px solid #B8860B",
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="relative z-10 text-center">
          <AlertTriangle className="h-16 w-16 text-accent-gold mx-auto mb-4" />
          <h2 className="font-cinzel font-bold text-3xl text-accent-gold mb-4">
            Das Fundament fehlt
          </h2>
          <p className="font-libre text-lg text-gray-300 max-w-2xl mx-auto">
            Bevor Bewohner, Orte oder Fraktionen entstehen können, muss der Game Master die Welt definieren.
            Bitte wende dich an deinen GM, um die Welt zu erschaffen.
          </p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <WorldSetupForm
        campaignId={campaignId}
        worlds={worlds}
        onSuccess={() => {
          setShowForm(false);
          router.refresh();
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div
      className="rounded-lg p-12 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      style={{
        border: "3px solid #B8860B",
        backgroundImage: "url('/images/dark-marmor.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      <div className="relative z-10 text-center">
        <Globe className="h-20 w-20 text-accent-gold mx-auto mb-6" />
        <h2 className="font-cinzel font-bold text-4xl text-accent-gold mb-4">
          Das Fundament fehlt!
        </h2>
        <p className="font-libre text-xl text-gray-200 max-w-2xl mx-auto mb-8">
          Bevor Bewohner, Orte oder Fraktionen entstehen können, muss die Welt definiert werden.
        </p>
        <button
          onClick={() => setShowForm(true)}
          disabled={isPending}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-hero-vibrant text-black font-barlow font-bold text-lg uppercase hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <Globe className="h-6 w-6" />
          Die Welt erschaffen
        </button>
      </div>
    </div>
  );
}

