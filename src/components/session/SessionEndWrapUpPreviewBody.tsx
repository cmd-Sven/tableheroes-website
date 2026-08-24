/**
 * SessionEndWrapUpPreviewBody — Preview sections inside the session end wrap-up modal.
 */
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Coins,
  Info,
  Map,
  MapPin,
  Mic,
  Plus,
  Trash2,
  Users,
  Cloud,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { SessionParticipationAchievementInput } from "@/src/lib/session-wrap-up/participation-types";
import { formatWrapUpDuration, type SessionWrapUpPreview, type SessionWrapUpTask } from "@/src/lib/session-wrap-up/types";
import { formatSessionDate, presenceLabel } from "./session-end-wrap-up-modal.utils";

function TaskIcon({ kind }: { kind: SessionWrapUpTask["kind"] }) {
  if (kind === "warning") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />;
  }
  if (kind === "action") {
    return <ArrowRight className="h-4 w-4 shrink-0 text-hero-vibrant" />;
  }
  return <Info className="h-4 w-4 shrink-0 text-gray-400" />;
}

export type SessionEndWrapUpPreviewBodyProps = {
  preview: SessionWrapUpPreview;
  carryOver: boolean;
  setCarryOver: (value: boolean) => void;
  carryOverTable: boolean;
  setCarryOverTable: (value: boolean) => void;
  includedPlayerIds: Set<string>;
  setIncludedPlayerIds: Dispatch<SetStateAction<Set<string>>>;
  enableExtraPoints: boolean;
  setEnableExtraPoints: (value: boolean) => void;
  extraPointsByUser: Record<string, { points: string; reason: string }>;
  setExtraPointsByUser: Dispatch<SetStateAction<Record<string, { points: string; reason: string }>>>;
  enableAchievements: boolean;
  setEnableAchievements: (value: boolean) => void;
  achievementRows: SessionParticipationAchievementInput[];
  setAchievementRows: Dispatch<SetStateAction<SessionParticipationAchievementInput[]>>;
};

export function SessionEndWrapUpPreviewBody(props: SessionEndWrapUpPreviewBodyProps) {
  const {
    preview,
    carryOver,
    setCarryOver,
    carryOverTable,
    setCarryOverTable,
    includedPlayerIds,
    setIncludedPlayerIds,
    enableExtraPoints,
    setEnableExtraPoints,
    extraPointsByUser,
    setExtraPointsByUser,
    enableAchievements,
    setEnableAchievements,
    achievementRows,
    setAchievementRows,
  } = props;

  return (
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
                          : preview.chronist.pendingWhisper +
                                preview.chronist.pendingSummarize >
                              0
                            ? `${preview.chronist.pendingWhisper + preview.chronist.pendingSummarize} Chunk(s) in Arbeit`
                            : preview.chronist.processedChunks > 0 &&
                                preview.chronist.processedChunks ===
                                  preview.chronist.chunkCount
                              ? "VollstÃ¤ndig verarbeitet"
                              : preview.chronist.transcriptionStatus === "stopped"
                                ? "Beendet"
                                : (preview.chronist.transcriptionStatus ?? "â€”")}
                      </dd>
                    </div>
                  </dl>
                  {preview.chronist.pendingWhisper +
                    preview.chronist.pendingSummarize >
                  0 ? (
                    <p className="mt-3 font-libre text-xs text-amber-200/90 leading-relaxed">
                      Nach dem Archivieren wartet das Modal, bis alle Chunks
                      durch sind â€” dann kannst du das Ergebnis direkt im Chronist
                      Ã¶ffnen.
                    </p>
                  ) : null}
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
                    Aktuelle BÃ¼hne & Szene
                  </h3>
                </div>
                <ul className="space-y-2 font-libre text-sm text-gray-300">
                  <li>
                    <span className="text-gray-500">NSCs auf der BÃ¼hne: </span>
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
                      {preview.board.weatherLabel} Â· {preview.board.temperatureLabel}
                      {preview.board.dayPhaseLabel
                        ? ` Â· ${preview.board.dayPhaseLabel}`
                        : ""}
                    </span>
                  </li>
                  {preview.board.inGameDate || preview.board.inGameTime ? (
                    <li>
                      <span className="text-gray-500">Ingame-Zeit: </span>
                      {[preview.board.inGameDate, preview.board.inGameTime]
                        .filter(Boolean)
                        .join(" Â· ")}
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
                    Teilnahme-Punkte fÃ¼r diese Session wurden bereits verbucht.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="font-libre text-sm text-gray-300 leading-relaxed">
                      Jeder Spieler mit erfolgreicher Teilnahme erhÃ¤lt{" "}
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
                                    Â· {player.characterName}
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
                                : "â€”"}
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
                          Extrapunkte fÃ¼r besondere Aktionen?
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          Optional pro ausgewÃ¤hltem Spieler â€” Betrag und kurzer Grund.
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
                          Achievement fÃ¼r besondere Leistung?
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          WÃ¤hle Spieler und Achievement aus der bestehenden Ãœbersicht.
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
                              <option value="">Spieler wÃ¤hlenâ€¦</option>
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
                              <option value="">Achievement wÃ¤hlenâ€¦</option>
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
                <section className="space-y-3 rounded-lg border border-accent-gold/30 bg-accent-gold/5 p-4">
                  <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold/80">
                    Nächster Termin:{" "}
                    {preview.nextSession.title?.trim() ||
                      formatSessionDate(preview.nextSession.startTime)}
                  </p>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hero-border/20 bg-background-dark/30 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={carryOver}
                      onChange={(e) => setCarryOver(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-hero-border text-accent-gold"
                    />
                    <span>
                      <span className="font-barlow text-xs font-bold uppercase text-accent-gold">
                        Bühne / Szene übernehmen
                      </span>
                      <span className="mt-1 block font-libre text-sm text-gray-300 leading-relaxed">
                        NSCs auf der Bühne, Wetter, Temperatur, Tageszeit, Ort und
                        Hintergrund — ohne Chat, Journal oder Kampftisch.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hero-border/20 bg-background-dark/30 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={carryOverTable}
                      onChange={(e) => setCarryOverTable(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-hero-border text-hero-vibrant"
                    />
                    <span>
                      <span className="inline-flex items-center gap-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant">
                        <Map className="h-3.5 w-3.5" />
                        Tisch / Map-Zustand übernehmen
                      </span>
                      <span className="mt-1 block font-libre text-sm text-gray-300 leading-relaxed">
                        Battlemaps inkl. Token, Props, Nebel, Effekte, Fallen und
                        Zeichnungen sowie Weltkarten-Overlays (Fog, Schablonen,
                        Marker, Zeichnungen). Ersetzt den Tisch-Zustand im
                        nächsten Termin. Zoom/Kamera bleibt lokal.
                      </span>
                      <span className="mt-1.5 block font-libre text-xs text-gray-500">
                        Aktuell: {preview.table.battlemapCount} Map
                        {preview.table.battlemapCount === 1 ? "" : "s"}
                        {preview.table.tokenCount > 0
                          ? ` · ${preview.table.tokenCount} Token`
                          : ""}
                        {preview.table.overlayCount > 0
                          ? ` · ${preview.table.overlayCount} Overlays`
                          : ""}
                        {preview.table.drawingCount > 0
                          ? ` · ${preview.table.drawingCount} Zeichnungen`
                          : ""}
                        {preview.table.hasActiveMap ? " · aktive Karte gesetzt" : ""}
                      </span>
                    </span>
                  </label>
                </section>
              ) : (
                <section className="rounded-lg border border-hero-border/25 bg-background-dark/40 p-4">
                  <p className="font-libre text-sm text-gray-400">
                    Kein nächster Termin geplant. Lege einen neuen Termin an, wenn du
                    Bühne, Wetter oder Tisch-Zustand manuell in der Vorbereitung
                    setzen willst.
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
                            Ã–ffnen
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
    </>
  );
}
