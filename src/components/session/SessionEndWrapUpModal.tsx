"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Cloud,
  Coins,
  Info,
  Loader2,
  MapPin,
  Mic,
  Plus,
  Power,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  carryOverSessionBoardState,
  carryOverSessionTableState,
  getSessionWrapUpPreview,
  settleSessionParticipationRewards,
} from "@/src/app/dashboard/campaigns/[id]/session-wrap-up-actions";
import type {
  SessionParticipationAchievementInput,
  SessionParticipationExtraInput,
} from "@/src/lib/session-wrap-up/participation-types";
import { endSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import {
  formatWrapUpDuration,
  type SessionWrapUpPreview,
  type SessionWrapUpTask,
} from "@/src/lib/session-wrap-up/types";
import { SessionChronistProcessingWait } from "@/src/components/session/SessionChronistProcessingWait";
import { SessionEndWrapUpPreviewBody } from "./SessionEndWrapUpPreviewBody";
import {
  formatSessionDate,
  presenceLabel,
  resolveRedirectPath,
  shouldWaitForChronistProcessing,
} from "./session-end-wrap-up-modal.utils";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  campaignId: string;
  isRecordingActive: boolean;
  onStopRecording?: () => Promise<void>;
  onComplete: (redirectPath: string) => void;
};

type WrapUpPhase = "preview" | "chronist-processing";

export function SessionEndWrapUpModal({
  open,
  onClose,
  sessionId,
  campaignId,
  isRecordingActive,
  onStopRecording,
  onComplete,
}: Props) {
  const [preview, setPreview] = useState<SessionWrapUpPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [carryOver, setCarryOver] = useState(true);
  const [carryOverTable, setCarryOverTable] = useState(false);
  const [includedPlayerIds, setIncludedPlayerIds] = useState<Set<string>>(new Set());
  const [enableExtraPoints, setEnableExtraPoints] = useState(false);
  const [extraPointsByUser, setExtraPointsByUser] = useState<
    Record<string, { points: string; reason: string }>
  >({});
  const [enableAchievements, setEnableAchievements] = useState(false);
  const [achievementRows, setAchievementRows] = useState<
    SessionParticipationAchievementInput[]
  >([{ userId: "", achievementId: "" }]);
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<WrapUpPhase>("preview");
  const [redirectAfterChronist, setRedirectAfterChronist] = useState<string | null>(
    null,
  );
  const [chronistReady, setChronistReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("preview");
    setRedirectAfterChronist(null);
    setChronistReady(false);
    setLoadError(null);
    setPreview(null);
    setEnableExtraPoints(false);
    setEnableAchievements(false);
    setExtraPointsByUser({});
    setAchievementRows([{ userId: "", achievementId: "" }]);
    void getSessionWrapUpPreview(sessionId)
      .then((data) => {
        if (!data) {
          setLoadError("Ãœbersicht konnte nicht geladen werden.");
          return;
        }
        setPreview(data);
        setCarryOver(Boolean(data.nextSession && data.board.hasCarryOverContent));
        setCarryOverTable(
          Boolean(data.nextSession && data.table.hasCarryOverContent),
        );
        setIncludedPlayerIds(
          new Set(
            data.participation.players.filter((p) => p.eligible).map((p) => p.userId),
          ),
        );
        const firstEligible = data.participation.players.find((p) => p.eligible);
        setAchievementRows([
          {
            userId: firstEligible?.userId ?? "",
            achievementId: data.participation.achievements[0]?.id ?? "",
          },
        ]);
      })
      .catch(() => {
        setLoadError("Ãœbersicht konnte nicht geladen werden.");
      });
  }, [open, sessionId]);

  if (!open) return null;

  const chronistHref = `/dashboard/campaigns/${campaignId}/chronist`;
  const sessionsHref = `/dashboard/campaigns/${campaignId}?tab=sessions`;

  function handleConfirmEnd() {
    if (!preview || isPending) return;
    startTransition(async () => {
      try {
        if (isRecordingActive && onStopRecording) {
          await onStopRecording();
          await new Promise((r) => window.setTimeout(r, 800));
        }

        if (carryOver && preview.nextSession) {
          const carryResult = await carryOverSessionBoardState(
            sessionId,
            preview.nextSession.id,
          );
          if (!carryResult.ok) {
            throw new Error(carryResult.error);
          }
        }

        if (carryOverTable && preview.nextSession) {
          const tableResult = await carryOverSessionTableState(
            sessionId,
            preview.nextSession.id,
          );
          if (!tableResult.ok) {
            throw new Error(tableResult.error);
          }
        }

        let pointsSkippedDueToConfig = false;

        if (!preview.participation.alreadySettled) {
          const extras: SessionParticipationExtraInput[] = [];
          if (enableExtraPoints) {
            for (const userId of includedPlayerIds) {
              const row = extraPointsByUser[userId];
              const points = Number(row?.points ?? 0);
              if (!Number.isFinite(points) || points === 0) continue;
              if (!row?.reason?.trim() || row.reason.trim().length < 3) {
                throw new Error("Bitte fÃ¼r Extrapunkte einen Grund angeben (mind. 3 Zeichen).");
              }
              extras.push({
                userId,
                points,
                reason: row.reason.trim(),
              });
            }
          }

          const achievements: SessionParticipationAchievementInput[] = enableAchievements
            ? achievementRows.filter((row) => row.userId && row.achievementId)
            : [];

          const settleResult = await settleSessionParticipationRewards(sessionId, {
            participantUserIds: Array.from(includedPlayerIds),
            extras,
            achievements,
          });
          if (!settleResult.ok) {
            throw new Error(settleResult.error);
          }
          pointsSkippedDueToConfig = Boolean(settleResult.pointsSkippedDueToConfig);
        }

        await endSession(sessionId);
        const redirectPath = resolveRedirectPath(preview, campaignId);
        if (shouldWaitForChronistProcessing(preview, isRecordingActive)) {
          setRedirectAfterChronist(redirectPath);
          setPhase("chronist-processing");
        } else {
          onComplete(redirectPath);
        }
        if (pointsSkippedDueToConfig) {
          window.alert(
            "Session wurde archiviert. Teilnahme-Punkte konnten wegen fehlender Server-Konfiguration (SUPABASE_SERVICE_ROLE_KEY) nicht vergeben werden â€” bitte in Vercel nachziehen.",
          );
        }
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Session konnte nicht beendet werden.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-wrap-up-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-hero-border/50 bg-background-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2
              id="session-wrap-up-title"
              className="font-barlow text-xl font-bold uppercase tracking-wide text-white"
            >
              {phase === "chronist-processing"
                ? "Chronist-Verarbeitung"
                : "Session abschlieÃŸen"}
            </h2>
            <p className="mt-1 font-libre text-sm text-gray-400">
              {phase === "chronist-processing"
                ? "Session archiviert â€” der Chronist arbeitet die Aufnahme auf"
                : `${preview?.sessionTitle?.trim() || "Live-Session"} â€” Ãœbersicht vor dem Archivieren`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending || phase === "chronist-processing"}
            className="rounded border border-hero-border/50 p-2 text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="SchlieÃŸen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {phase === "chronist-processing" ? (
            <SessionChronistProcessingWait
              sessionId={sessionId}
              onStatusChange={(_summary, waitPhase) => {
                setChronistReady(waitPhase === "complete");
              }}
            />
          ) : loadError ? (
            <p className="font-libre text-sm text-red-300">{loadError}</p>
          ) : !preview ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-libre text-sm">Lade Session-Übersicht…</span>
            </div>
          ) : (
            <SessionEndWrapUpPreviewBody
              preview={preview}
              carryOver={carryOver}
              setCarryOver={setCarryOver}
              carryOverTable={carryOverTable}
              setCarryOverTable={setCarryOverTable}
              includedPlayerIds={includedPlayerIds}
              setIncludedPlayerIds={setIncludedPlayerIds}
              enableExtraPoints={enableExtraPoints}
              setEnableExtraPoints={setEnableExtraPoints}
              extraPointsByUser={extraPointsByUser}
              setExtraPointsByUser={setExtraPointsByUser}
              enableAchievements={enableAchievements}
              setEnableAchievements={setEnableAchievements}
              achievementRows={achievementRows}
              setAchievementRows={setAchievementRows}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          {phase === "chronist-processing" ? (
            <>
              <button
                type="button"
                onClick={() =>
                  onComplete(redirectAfterChronist ?? sessionsHref)
                }
                className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-400 hover:text-white"
              >
                SpÃ¤ter im Dashboard
              </button>
              <Link
                href={chronistHref}
                onClick={() => onComplete(chronistHref)}
                className={`inline-flex items-center gap-2 rounded border px-4 py-2 font-barlow text-xs font-bold uppercase ${
                  chronistReady
                    ? "border-emerald-500 bg-emerald-900/60 text-emerald-100 hover:bg-emerald-800/70"
                    : "border-hero-border text-gray-300 hover:text-white"
                }`}
              >
                {chronistReady ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Ergebnis im Chronist Ã¶ffnen
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chronist Ã¶ffnen
                  </>
                )}
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-400 hover:text-white disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                disabled={isPending || !preview}
                className="inline-flex items-center gap-2 rounded border border-red-600 bg-red-900/70 px-4 py-2 font-barlow text-xs font-bold uppercase text-red-100 hover:bg-red-800/80 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                Session archivieren & beenden
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
