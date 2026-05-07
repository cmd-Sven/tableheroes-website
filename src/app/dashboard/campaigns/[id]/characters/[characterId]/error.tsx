"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function CharacterEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CharacterEditError]", error.message, error.digest ?? "");
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-6">
        <div className="mb-4 flex items-center gap-3 text-red-200">
          <AlertTriangle className="h-8 w-8 shrink-0" />
          <h1 className="font-barlow font-bold text-xl uppercase tracking-wide">
            Charakter-Ansicht fehlgeschlagen
          </h1>
        </div>
        <p className="font-libre text-sm text-gray-300 mb-4">
          Beim Laden der Charakter-Daten ist ein Fehler aufgetreten. Bitte versuche es erneut oder
          lade die Seite neu.
        </p>
        {isDev ? (
          <pre className="mb-4 max-h-40 overflow-auto rounded border border-red-900/40 bg-black/40 p-3 font-mono text-xs text-red-100 whitespace-pre-wrap">
            {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ""}
          </pre>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:border-hero-vibrant"
          >
            Erneut versuchen
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded border border-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-300 hover:text-white"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
