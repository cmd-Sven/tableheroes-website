"use client";

import { useEffect } from "react";

/**
 * Fängt Render-Fehler der Stage-Prep-Route; in Production siehst du die digest-Referenz in der UI
 * und kannst sie in Server-Logs zuordnen.
 */
export default function StagePrepError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[stage-prep error]", error.digest, error.message);
  }, [error]);

  const hint =
    process.env.NODE_ENV === "development"
      ? error.message
      : error.digest
        ? `Referenz: ${error.digest} (für Support / Logs)`
        : "Bitte die Seite neu laden oder es später erneut versuchen.";

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-background-dark p-8 text-center text-white">
      <h1 className="font-barlow text-xl font-extrabold uppercase tracking-wide text-accent-blood">
        Bühnenvorbereitung
      </h1>
      <p className="font-libre max-w-md text-gray-400">{hint}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded border border-hero-vibrant bg-hero-vibrant/15 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/25"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
