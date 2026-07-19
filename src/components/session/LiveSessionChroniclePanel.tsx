"use client";

import { BookOpen, PenSquare, X } from "lucide-react";
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";

type Props = {
  onClose: () => void;
  systemLogs: SessionActivityEntry[];
  journalText: string | null;
  canEditJournal: boolean;
  sessionId: string;
  scribeId: string | null;
  onJournalChange: (text: string | null) => void;
};

export function LiveSessionChroniclePanel({
  onClose,
  systemLogs,
  journalText,
  canEditJournal,
  sessionId,
  scribeId,
  onJournalChange,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-amber-900/60 bg-linear-to-b from-background-card/95 via-emerald-950/95 to-background-dark/95 shadow-2xl backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-amber-900/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent-gold" />
          <div>
            <h2 className="font-barlow text-sm font-bold uppercase text-gray-200">
              Chronik der Session
            </h2>
            <p className="font-libre text-[10px] text-gray-500">
              System-Logs und Notizen des Chronisten
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-background-dark hover:text-white"
          aria-label="Chronik schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <section className="max-h-56 shrink-0 overflow-y-auto rounded border border-amber-900/50 bg-background-dark/80 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
              System-Logs
            </h3>
            <span className="font-libre text-[10px] text-gray-500">
              vorbereitet für Auto-Events
            </span>
          </div>
          {systemLogs.length > 0 ? (
            <ul className="space-y-2">
              {systemLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded border border-accent-gold/30 bg-accent-gold/10 px-3 py-2 italic"
                >
                  <p className="font-libre text-xs text-gray-200">{log.text}</p>
                  {log.at ? (
                    <p className="mt-1 font-barlow text-[9px] uppercase text-gray-500">
                      {log.at}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-libre text-xs italic text-gray-500">
              Noch keine System-Logs. Später erscheinen hier automatisch Ereignisse wie
              Ortswechsel, NPC-Reaktionen oder Szenenwechsel.
            </p>
          )}
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded border border-hero-border/30 bg-background-dark/80 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-barlow text-xs font-bold uppercase text-gray-200">
              Manuelle Notizen
            </h3>
            {canEditJournal ? (
              <span className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-hero-dark/60 px-2 py-0.5 font-barlow text-[10px] uppercase text-hero-vibrant">
                <PenSquare className="h-3 w-3" />
                Schreibrecht
              </span>
            ) : (
              <span className="font-libre text-[10px] text-gray-500">
                Nur GM / Chronist kann bearbeiten
              </span>
            )}
          </div>
          <textarea
            key={`${sessionId}-${scribeId ?? "none"}-${canEditJournal ? "edit" : "read"}`}
            defaultValue={journalText || ""}
            readOnly={!canEditJournal}
            onBlur={(e) => {
              if (!canEditJournal) return;
              onJournalChange(e.target.value || null);
            }}
            placeholder="Notizen zur aktuellen Szene, wichtige Ereignisse, Zitate..."
            className={`min-h-48 flex-1 resize-none rounded border border-hero-dark p-3 font-libre text-sm leading-relaxed outline-none ${
              canEditJournal
                ? "bg-slate-900 text-white focus:border-hero-vibrant"
                : "bg-slate-900/50 text-gray-300"
            }`}
          />
        </section>
      </div>
    </div>
  );
}
