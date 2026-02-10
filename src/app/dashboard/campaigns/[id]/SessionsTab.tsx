"use client";

import { useState, useTransition } from "react";
import { Calendar, Wand2 } from "lucide-react";
import { SessionWizardModal } from "@/src/components/dashboard/SessionWizardModal";
import { useRouter } from "next/navigation";
import { startSession } from "./session-actions";

type Props = {
  campaignId: string;
  isGM: boolean;
  /** Spieler: Nur bei Status 'Active' darf der Spieler Sessions betreten. */
  characterStatus?: string;
  upcomingSessions: Array<{
    id: string;
    title: string | null;
    start_time: string;
    type: string;
    status: string;
  }>;
  locations: Array<{ id: string; name: string; type: string }>;
  npcs: Array<{ id: string; name: string; title: string | null }>;
};

export function SessionsTab({ campaignId, isGM, characterStatus, upcomingSessions, locations, npcs }: Props) {
  const canJoinSession = isGM || characterStatus === "Active";
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isStarting, startTransition] = useTransition();
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  const handleStartSession = (sessionId: string) => {
    if (isStarting) return;
    startTransition(async () => {
      try {
        await startSession(sessionId);
        router.push(`/session/${sessionId}`);
      } catch (err: any) {
        alert(err.message || "Fehler beim Starten der Session.");
      }
    });
  };

  const handleJoinLive = (sessionId: string) => {
    router.push(`/session/${sessionId}`);
  };

  return (
    <>
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-hero-dark">
          <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-gold" />
            Nächste Sessions
          </h2>
          {isGM && (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-1 rounded bg-hero-dark px-3 py-1.5 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors"
            >
              <Wand2 className="h-4 w-4" />
              🪄 Session planen
            </button>
          )}
        </div>

        {!upcomingSessions || upcomingSessions.length === 0 ? (
          <p className="font-libre text-gray-400 text-center py-8">
            Noch keine geplanten Sessions.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const startDate = new Date(session.start_time);
              const formattedDate = new Intl.DateTimeFormat("de-DE", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(startDate);
              const formattedTime = new Intl.DateTimeFormat("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(startDate);

              const isLive = session.status === "Live";
              const isScheduled = session.status === "Scheduled";
              const isEnded =
                session.status === "Completed" || session.status === "Ended";

              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between rounded border bg-background-dark p-4 transition-colors group ${
                    isLive
                      ? "border-red-700/70 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                      : "border-hero-border/30 hover:border-hero-vibrant"
                  }`}
                >
                  <div>
                    <p className="font-barlow font-bold text-white group-hover:text-hero-vibrant transition-colors">
                      {session.title || formattedDate} • {formattedTime} Uhr
                    </p>
                    <p className="font-libre text-xs text-gray-500">
                      {session.type === "GameSession" ? "Spielabend" : session.type}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-1 font-barlow font-bold uppercase text-xs ${
                        isLive
                          ? "bg-red-900/40 text-red-300 border border-red-600/70"
                          : isScheduled
                          ? "bg-blue-900/30 text-blue-400 border border-blue-700/60"
                          : "bg-gray-700/30 text-gray-400 border border-gray-600/60"
                      }`}
                    >
                      {session.status}
                    </span>

                    {isLive && (
                      canJoinSession ? (
                        <button
                          type="button"
                          onClick={() => handleJoinLive(session.id)}
                          className="inline-flex items-center gap-1 rounded bg-red-900/60 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-red-200 hover:bg-red-800/80 transition-colors animate-pulse"
                        >
                          🔴 Laufender Session beitreten
                        </button>
                      ) : (
                        <span className="font-libre text-[10px] text-gray-500 italic" title="Charakter muss vom GM freigeschaltet sein (Status Active).">
                          Freischaltung ausstehend
                        </span>
                      )
                    )}

                    {isScheduled && isGM && (
                      <button
                        type="button"
                        onClick={() => handleStartSession(session.id)}
                        disabled={isStarting}
                        className="inline-flex items-center gap-1 rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-background-dark hover:bg-hero-dark transition-colors disabled:opacity-50"
                      >
                        🚀 Session starten
                      </button>
                    )}

                    {isEnded && !isLive && (
                      <span className="font-libre text-[11px] text-gray-500">
                        Beendet
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isGM && (
        <SessionWizardModal
          campaignId={campaignId}
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          locations={locations}
          npcs={npcs}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

