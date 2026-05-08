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
      <div className="rounded-lg border border-red-600/60 bg-red-950/50 p-6">
        <div className="mb-4 flex items-center gap-3 text-red-200">
          <AlertTriangle className="h-8 w-8 shrink-0 text-red-400" />
          <h1 className="font-barlow font-bold text-xl uppercase tracking-wide text-red-300">
            Fehler beim Laden des Charakters
          </h1>
        </div>
        <p className="font-libre text-sm text-red-100/90 mb-4">
          Die Seite konnte nicht aufgebaut werden. Bitte versuche es erneut oder kehre zum
          Dashboard zurück.
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
            className="rounded border border-red-400/60 bg-red-900/40 px-4 py-2 font-barlow font-bold uppercase text-sm text-red-100 hover:bg-red-800/50"
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
