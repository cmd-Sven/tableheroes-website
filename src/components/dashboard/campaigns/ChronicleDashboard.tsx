"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Loader2, Mic, RefreshCw } from "lucide-react";
import type { CampaignChronicleRow } from "@/src/lib/session-chronicle/campaign-chronicle-load";
import { RECORDING_NOTICE_TEXT } from "@/src/lib/session-chronicle/constants";
import { ChronicleInboxFeed } from "@/src/components/chronicle/ChronicleInboxFeed";

type Props = {
  campaignId: string;
  worldId: string | null;
  npcNames: Array<{ id: string; name: string }>;
  rows: CampaignChronicleRow[];
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-gray-700 text-gray-300",
    processing: "bg-amber-900/50 text-amber-200",
    done: "bg-emerald-900/50 text-emerald-200",
    failed: "bg-red-900/50 text-red-200",
  };
  return colors[status] ?? colors.pending;
}

export function ChronicleDashboard({ campaignId, worldId, npcNames, rows }: Props) {
  const router = useRouter();
  const [busyChunk, setBusyChunk] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function retryChunk(sessionId: string, chunkIndex: number) {
    const key = `${sessionId}:${chunkIndex}`;
    setBusyChunk(key);
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/process-chunk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ chunkIndex, force: true }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Verarbeitung fehlgeschlagen.");
      startTransition(() => router.refresh());
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyChunk(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
          Whisper-Transkription und KI-Zusammenfassung laufen nach jedem Audio-Chunk
          automatisch. Offene Vorschläge kannst du direkt in die NSC-, Ort- und Quest-Maker
          übernehmen.
        </p>
        <p className="mt-1 font-libre text-xs text-gray-500">{RECORDING_NOTICE_TEXT}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-hero-border/40 bg-background-card p-8 text-center font-libre text-gray-400">
          Noch keine Chronist-Daten. Starte eine Session mit Tisch-Modus und beginne die
          Aufnahme.
        </div>
      ) : (
        rows.map((row) => {
          return (
            <section
              key={row.sessionId}
              className="rounded-lg border border-hero-border/40 bg-background-card p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-barlow text-lg font-bold uppercase text-white">
                    {row.sessionTitle?.trim() || "Session"}
                  </h2>
                  <p className="font-libre text-xs text-gray-500">
                    Status: {row.sessionStatus}
                    {row.pendingInbox > 0 ? (
                      <span className="ml-2 text-accent-gold">
                        · {row.pendingInbox} offene Vorschläge
                      </span>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={`/session/${row.sessionId}`}
                  className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-white"
                >
                  Zur Session
                </Link>
              </div>

              {row.state?.story_recap ? (
                <div className="rounded border border-hero-border/30 bg-background-dark/60 p-4">
                  <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
                    Story-Recap (laufend)
                  </p>
                  <p className="font-libre text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {row.state.story_recap}
                  </p>
                </div>
              ) : null}

              {row.chunks.length > 0 ? (
                <div>
                  <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
                    Audio-Chunks
                  </p>
                  <ul className="space-y-2">
                    {row.chunks.map((c) => {
                      const key = `${row.sessionId}:${c.chunk_index}`;
                      const busy = busyChunk === key || isPending;
                      return (
                        <li
                          key={c.chunk_index}
                          className="flex flex-wrap items-center gap-2 rounded border border-hero-border/25 bg-background-dark/40 px-3 py-2 text-xs"
                        >
                          <span className="font-barlow font-bold text-gray-300">
                            #{c.chunk_index + 1}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-barlow text-[9px] uppercase ${statusBadge(c.whisper_status)}`}
                          >
                            Whisper: {c.whisper_status}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-barlow text-[9px] uppercase ${statusBadge(c.summarize_status)}`}
                          >
                            KI: {c.summarize_status}
                          </span>
                          {c.error_message ? (
                            <span className="font-libre text-red-400 truncate max-w-xs" title={c.error_message}>
                              {c.error_message}
                            </span>
                          ) : null}
                          {(c.whisper_status === "failed" ||
                            c.summarize_status === "failed") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void retryChunk(row.sessionId, c.chunk_index)}
                              className="ml-auto inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow text-[9px] uppercase text-gray-300 hover:border-accent-gold"
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Erneut
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {row.pendingInbox > 0 || row.state ? (
                <ChronicleInboxFeed
                  campaignId={campaignId}
                  sessionId={row.sessionId}
                  worldId={worldId}
                  variant="full"
                  initialState={row.state}
                  pollEnabled={false}
                  npcNames={npcNames}
                />
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
