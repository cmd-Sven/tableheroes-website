"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { startSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";

type Props = {
  open: boolean;
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Nach erfolgreichem Start (Navigation o. ä.) */
  onStarted: (sessionId: string) => void;
};

/**
 * Vor „Session starten“: Hintergrund-URL setzen oder bewusst ohne Bild starten.
 */
export function StartSessionBackgroundModal({
  open,
  sessionId,
  onOpenChange,
  onStarted,
}: Props) {
  const [url, setUrl] = useState("");
  const [noBackground, setNoBackground] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setNoBackground(false);
      setErr(null);
    }
  }, [open, sessionId]);

  async function handleSubmit() {
    if (!sessionId) return;
    if (!noBackground && !url.trim()) {
      setErr(
        "Bitte eine Bild-URL eintragen oder „Ohne Hintergrund starten“ aktivieren.",
      );
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      if (!noBackground && url.trim()) {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/live-background`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ backgroundUrl: url.trim() }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(
            j.error || "Hintergrund konnte nicht gespeichert werden.",
          );
        }
      }

      await startSession(sessionId);
      onOpenChange(false);
      onStarted(sessionId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Session konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !sessionId) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-session-bg-title"
    >
      <div className="relative w-full max-w-md rounded-lg border border-hero-border bg-background-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => !busy && onOpenChange(false)}
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-accent-gold" />
          <h2
            id="start-session-bg-title"
            className="font-barlow font-bold text-lg uppercase tracking-wide text-hero-vibrant"
          >
            Hintergrund für die Live-Session
          </h2>
        </div>

        <p className="font-libre mb-4 text-sm leading-relaxed text-gray-300">
          Bevor die Session live geht: Lege fest, welches Bild auf der Bühne
          erscheinen soll (volle URL zu einem Bild im Web). Du kannst auch ohne
          Bild starten und später in der Session nachziehen.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">
            Bild-URL
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy || noBackground}
            placeholder="https://…"
            className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none disabled:opacity-50"
          />
        </label>

        {url.trim() && !noBackground ? (
          <div
            className="mb-4 h-28 w-full rounded border border-hero-border bg-cover bg-center"
            style={{ backgroundImage: `url(${url.trim()})` }}
          />
        ) : null}

        <label className="mb-4 flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={noBackground}
            onChange={(e) => setNoBackground(e.target.checked)}
            disabled={busy}
            className="mt-1 h-4 w-4 rounded border-hero-border text-hero-vibrant focus:ring-hero-vibrant"
          />
          <span className="font-libre text-sm text-gray-300">
            Ohne Hintergrund starten (einfarbig; Bild kannst du später in der
            Session setzen)
          </span>
        </label>

        {err ? (
          <p className="mb-4 font-libre text-sm text-red-400">{err}</p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => !busy && onOpenChange(false)}
            disabled={busy}
            className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-300 hover:border-gray-500 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-black hover:bg-yellow-500 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Session jetzt starten
          </button>
        </div>
      </div>
    </div>
  );
}
