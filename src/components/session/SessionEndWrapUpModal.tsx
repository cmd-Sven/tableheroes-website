"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
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

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  campaignId: string;
  isRecordingActive: boolean;
  onStopRecording?: () => Promise<void>;
  onComplete: (redirectPath: string) => void;
};

function formatSessionDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function TaskIcon({ kind }: { kind: SessionWrapUpTask["kind"] }) {
  if (kind === "warning") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />;
  }
  if (kind === "action") {
    return <ArrowRight className="h-4 w-4 shrink-0 text-hero-vibrant" />;
  }
  return <Info className="h-4 w-4 shrink-0 text-gray-400" />;
}

function presenceLabel(presence: "online" | "physical" | "both" | null): string {
  if (presence === "both") return "Online & am Tisch";
  if (presence === "online") return "Eingeloggt";
  if (presence === "physical") return "Physisch am Tisch";
  return "Nicht erkannt";
}

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

  useEffect(() => {
    if (!open) return;
    setLoadError(null);
    setPreview(null);
    setEnableExtraPoints(false);
    setEnableAchievements(false);
    setExtraPointsByUser({});
    setAchievementRows([{ userId: "", achievementId: "" }]);
    void getSessionWrapUpPreview(sessionId)
      .then((data) => {
        if (!data) {
          setLoadError("Übersicht konnte nicht geladen werden.");
          return;
        }
        setPreview(data);
        setCarryOver(Boolean(data.nextSession && data.board.hasCarryOverContent));
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
        setLoadError("Übersicht konnte nicht geladen werden.");
      });
  }, [open, sessionId]);

  if (!open) return null;

  function resolveRedirectPath(data: SessionWrapUpPreview): string {
    const hasChronistFollowUp =
      data.inbox.pendingCount > 0 ||
      data.chronist.failedChunks > 0 ||
      data.chronist.pendingWhisper + data.chronist.pendingSummarize > 0;
    if (hasChronistFollowUp) {
      return `/dashboard/campaigns/${campaignId}/chronist`;
    }
    return `/dashboard/campaigns/${campaignId}?tab=sessions`;
  }

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

        if (!preview.participation.alreadySettled) {
          const extras: SessionParticipationExtraInput[] = [];
          if (enableExtraPoints) {
            for (const userId of includedPlayerIds) {
              const row = extraPointsByUser[userId];
              const points = Number(row?.points ?? 0);
              if (!Number.isFinite(points) || points === 0) continue;
              if (!row?.reason?.trim() || row.reason.trim().length < 3) {
                throw new Error("Bitte für Extrapunkte einen Grund angeben (mind. 3 Zeichen).");
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
        }

        await endSession(sessionId);
        onComplete(resolveRedirectPath(preview));
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
              Session abschließen
            </h2>
            <p className="mt-1 font-libre text-sm text-gray-400">
              {preview?.sessionTitle?.trim() || "Live-Session"} — Übersicht vor dem Archivieren
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded border border-hero-border/50 p-2 text-gray-400 hover:text-white disabled:opacity-50"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {loadError ? (
            <p className="font-libre text-sm text-red-300">{loadError}</p>
          ) : !preview ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-libre text-sm">Lade Session-Übersicht…</span>
            </div>
          ) : (
            <>
              {preview.chronist.used ? (
                <section className="rounded-lg border border-red-500/30 bg-red-950/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-red-300" />
                    <h3 className="font-barlow text-xs font-bold uppercase text-red-200">
                      Chronist-Aufnahme
                    </h3>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-libre text-sm text-gray-300 sm:grid-cols-4">
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Audio gesamt</dt>
                      <dd className="font-medium text-white">
                        {formatWrapUpDuration(preview.chronist.totalAudioMs)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Chunks</dt>
                      <dd className="font-medium text-white">
                        {preview.chronist.chunkCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Verarbeitet</dt>
                      <dd className="font-medium text-emerald-300">
                        {preview.chronist.processedChunks}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase text-gray-500">Status</dt>
                      <dd className="font-medium text-white">
                        {preview.chronist.recordingActive
                          ? "Noch aktiv"
                          : preview.chronist.transcriptionStatus === "stopped"
                            ? "Beendet"
                            : (preview.chronist.transcriptionStatus ?? "—")}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : (
                <section className="rounded-lg border border-hero-border/30 bg-background-dark/50 p-4">
                  <p className="font-libre text-sm text-gray-400">
                    Keine Chronist-Aufnahme in dieser Session.
                  </p>
                </section>
              )}

              <section className="rounded-lg border border-hero-border/30 bg-background-dark/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent-gold" />
                  <h3 className="font-barlow text-xs font-bold uppercase text-gray-300">
                    Aktuelle Bühne & Szene
                  </h3>
                </div>
                <ul className="space-y-2 font-libre text-sm text-gray-300">
                  <li>
                    <span className="text-gray-500">NSCs auf der Bühne: </span>
                    {preview.board.stageNpcCount > 0 ? (
                      <span className="text-white">
                        {preview.board.stageNpcNames.join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-500">Keine</span>
                    )}
                  </li>
                  <li className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span>{preview.board.locationName ?? "Kein Ort gesetzt"}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Cloud className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span>
                      {preview.board.weatherLabel} · {preview.board.temperatureLabel}
                      {preview.board.dayPhaseLabel
                        ? ` · ${preview.board.dayPhaseLabel}`
                        : ""}
                    </span>
                  </li>
                  {preview.board.inGameDate || preview.board.inGameTime ? (
                    <li>
                      <span className="text-gray-500">Ingame-Zeit: </span>
                      {[preview.board.inGameDate, preview.board.inGameTime]
                        .filter(Boolean)
                        .join(" · ")}
                    </li>
                  ) : null}
                </ul>
              </section>

              <section className="rounded-lg border border-hero-vibrant/30 bg-hero-vibrant/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-hero-vibrant" />
                  <h3 className="font-barlow text-xs font-bold uppercase text-hero-vibrant">
                    Teilnahme & Spieler-Punkte
                  </h3>
                </div>
                {preview.participation.alreadySettled ? (
                  <p className="font-libre text-sm text-gray-400">
                    Teilnahme-Punkte für diese Session wurden bereits verbucht.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="font-libre text-sm text-gray-300 leading-relaxed">
                      Jeder Spieler mit erfolgreicher Teilnahme erhält{" "}
                      <strong className="text-white">
                        {preview.participation.basePointsPerPlayer} Punkte
                      </strong>{" "}
                      (eingeloggt in der Live-Session oder vom SL als physisch anwesend
                      markiert).
                    </p>
                    <ul className="space-y-2">
                      {preview.participation.players.map((player) => {
                        const checked = includedPlayerIds.has(player.userId);
                        return (
                          <li
                            key={player.userId}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-hero-border/25 bg-background-dark/50 px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!player.eligible}
                              onChange={(e) => {
                                setIncludedPlayerIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(player.userId);
                                  else next.delete(player.userId);
                                  return next;
                                });
                              }}
                              className="h-4 w-4 rounded border-hero-border text-hero-vibrant disabled:opacity-40"
                              aria-label={`${player.username} Teilnahme-Punkte`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-barlow text-sm font-bold text-white">
                                {player.username}
                                {player.characterName ? (
                                  <span className="font-normal text-gray-400">
                                    {" "}
                                    · {player.characterName}
                                  </span>
                                ) : null}
                              </p>
                              <p className="font-libre text-xs text-gray-500">
                                {presenceLabel(player.presence)}
                              </p>
                            </div>
                            <span className="font-barlow text-xs font-bold text-hero-vibrant">
                              {player.eligible
                                ? `+${preview.participation.basePointsPerPlayer} Pkt.`
                                : "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hero-border/20 bg-background-dark/40 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={enableExtraPoints}
                        onChange={(e) => setEnableExtraPoints(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-hero-border text-hero-vibrant"
                      />
                      <span className="font-libre text-sm text-gray-300">
                        <span className="font-barlow text-xs font-bold uppercase text-gray-200">
                          Extrapunkte für besondere Aktionen?
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          Optional pro ausgewähltem Spieler — Betrag und kurzer Grund.
                        </span>
                      </span>
                    </label>

                    {enableExtraPoints ? (
                      <div className="space-y-2 pl-1">
                        {preview.participation.players
                          .filter((p) => includedPlayerIds.has(p.userId))
                          .map((player) => (
                            <div
                              key={`extra-${player.userId}`}
                              className="grid gap-2 rounded-lg border border-hero-border/20 bg-black/20 p-3 sm:grid-cols-[1fr_5rem_1fr]"
                            >
                              <span className="self-center font-barlow text-xs font-bold uppercase text-gray-300">
                                {player.username}
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Pkt."
                                value={extraPointsByUser[player.userId]?.points ?? ""}
                                onChange={(e) =>
                                  setExtraPointsByUser((prev) => ({
                                    ...prev,
                                    [player.userId]: {
                                      points: e.target.value,
                                      reason: prev[player.userId]?.reason ?? "",
                                    },
                                  }))
                                }
                                className="rounded border border-hero-border bg-background-dark px-2 py-1.5 font-barlow text-sm text-white"
                              />
                              <input
                                type="text"
                                placeholder="Grund (z. B. Held der Stunde)"
                                value={extraPointsByUser[player.userId]?.reason ?? ""}
                                onChange={(e) =>
                                  setExtraPointsByUser((prev) => ({
                                    ...prev,
                                    [player.userId]: {
                                      points: prev[player.userId]?.points ?? "",
                                      reason: e.target.value,
                                    },
                                  }))
                                }
                                className="rounded border border-hero-border bg-background-dark px-2 py-1.5 font-libre text-sm text-white sm:col-span-1"
                              />
                            </div>
                          ))}
                      </div>
                    ) : null}

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hero-border/20 bg-background-dark/40 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={enableAchievements}
                        onChange={(e) => setEnableAchievements(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-hero-border text-accent-gold"
                      />
                      <span className="font-libre text-sm text-gray-300">
                        <span className="font-barlow text-xs font-bold uppercase text-accent-gold">
                          Achievement für besondere Leistung?
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          Wähle Spieler und Achievement aus der bestehenden Übersicht.
                        </span>
                      </span>
                    </label>

                    {enableAchievements ? (
                      <div className="space-y-2">
                        {achievementRows.map((row, index) => (
                          <div
                            key={`ach-${index}`}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-accent-gold/20 bg-black/20 p-3"
                          >
                            <Award className="h-4 w-4 shrink-0 text-accent-gold" />
                            <select
                              value={row.userId}
                              onChange={(e) =>
                                setAchievementRows((prev) =>
                                  prev.map((entry, i) =>
                                    i === index
                                      ? { ...entry, userId: e.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              className="min-w-[8rem] flex-1 rounded border border-hero-border bg-background-dark px-2 py-1.5 font-libre text-sm text-white"
                            >
                              <option value="">Spieler wählen…</option>
                              {preview.participation.players
                                .filter((p) => includedPlayerIds.has(p.userId))
                                .map((p) => (
                                  <option key={p.userId} value={p.userId}>
                                    {p.username}
                                  </option>
                                ))}
                            </select>
                            <select
                              value={row.achievementId}
                              onChange={(e) =>
                                setAchievementRows((prev) =>
                                  prev.map((entry, i) =>
                                    i === index
                                      ? { ...entry, achievementId: e.target.value }
                                      : entry,
                                  ),
                                )
                              }
                              className="min-w-[10rem] flex-1 rounded border border-hero-border bg-background-dark px-2 py-1.5 font-libre text-sm text-white"
                            >
                              <option value="">Achievement wählen…</option>
                              {preview.participation.achievements.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                  {a.pointsAwarded > 0 ? ` (+${a.pointsAwarded} Pkt.)` : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                setAchievementRows((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              disabled={achievementRows.length <= 1}
                              className="rounded border border-red-800/50 p-2 text-red-300 hover:bg-red-950/40 disabled:opacity-30"
                              aria-label="Zeile entfernen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setAchievementRows((prev) => [
                              ...prev,
                              {
                                userId: prev[0]?.userId ?? "",
                                achievementId:
                                  preview.participation.achievements[0]?.id ?? "",
                              },
                            ])
                          }
                          className="inline-flex items-center gap-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Weiteres Achievement
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              {preview.nextSession ? (
                <section className="rounded-lg border border-accent-gold/30 bg-accent-gold/5 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={carryOver}
                      onChange={(e) => setCarryOver(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-hero-border text-accent-gold"
                    />
                    <span>
                      <span className="font-barlow text-xs font-bold uppercase text-accent-gold">
                        In nächste Session übernehmen
                      </span>
                      <span className="mt-1 block font-libre text-sm text-gray-300 leading-relaxed">
                        NSCs auf der Bühne, Wetter, Temperatur, Tageszeit, Ort und
                        Hintergrund werden für{" "}
                        <strong className="text-white">
                          {preview.nextSession.title?.trim() ||
                            formatSessionDate(preview.nextSession.startTime)}
                        </strong>{" "}
                        vorbereitet — sinnvoll, wenn das Abenteuer direkt weitergeht.
                      </span>
                    </span>
                  </label>
                </section>
              ) : (
                <section className="rounded-lg border border-hero-border/25 bg-background-dark/40 p-4">
                  <p className="font-libre text-sm text-gray-400">
                    Kein nächster Termin geplant. Lege einen neuen Termin an, wenn du Bühne
                    und Wetter manuell in der Vorbereitung setzen willst.
                  </p>
                </section>
              )}

              <section>
                <h3 className="mb-3 font-barlow text-xs font-bold uppercase text-gray-400">
                  Danach erledigen (optional)
                </h3>
                <ul className="space-y-2">
                  {preview.followUpTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex gap-3 rounded-lg border border-hero-border/25 bg-background-dark/40 px-3 py-2.5"
                    >
                      <TaskIcon kind={task.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="font-barlow text-[11px] font-bold uppercase text-gray-200">
                          {task.title}
                        </p>
                        <p className="mt-0.5 font-libre text-xs text-gray-400 leading-relaxed">
                          {task.description}
                        </p>
                        {task.href ? (
                          <Link
                            href={task.href}
                            className="mt-1 inline-block font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Öffnen
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
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
        </div>
      </div>
    </div>
  );
}
