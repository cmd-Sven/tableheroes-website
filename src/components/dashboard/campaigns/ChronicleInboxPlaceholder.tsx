"use client";

import Link from "next/link";
import { Mic, ArrowLeft } from "lucide-react";
import {
  JITSI_ROOM_URL,
  RECORDING_NOTICE_TEXT,
  TRANSCRIPTION_MODE_LABELS,
} from "@/src/lib/session-chronicle/constants";

type Props = {
  campaignId: string;
};

/** Platzhalter bis Phase 1–3 (Audio-Pipeline + Feed) live sind. */
export function ChronicleInboxPlaceholder({ campaignId }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="inline-flex items-center gap-2 font-barlow text-xs font-bold uppercase text-hero-vibrant hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      <div>
        <h1 className="flex items-center gap-3 font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
          <Mic className="h-8 w-8 text-accent-gold" />
          Session-Chronist
        </h1>
        <p className="mt-2 font-libre text-sm text-gray-300 leading-relaxed">
          Hier erscheinen später KI-Vorschläge aus der Session-Aufnahme (NSCs, Orte,
          Quests). Phase 0 legt die Datenbank- und Typ-Grundlage — Audio-Pipeline und
          Maker-Import folgen in den nächsten Phasen.
        </p>
      </div>

      <div className="rounded-lg border border-hero-border/40 bg-background-card p-5 space-y-3 font-libre text-sm text-gray-300">
        <p>
          <span className="font-barlow font-bold uppercase text-accent-gold">Modi:</span>{" "}
          {TRANSCRIPTION_MODE_LABELS.table} · {TRANSCRIPTION_MODE_LABELS.jitsi}
        </p>
        <p>
          <span className="font-barlow font-bold uppercase text-accent-gold">Jitsi:</span>{" "}
          {JITSI_ROOM_URL}
        </p>
        <p>
          <span className="font-barlow font-bold uppercase text-accent-gold">Hinweis:</span>{" "}
          {RECORDING_NOTICE_TEXT}
        </p>
      </div>
    </div>
  );
}
