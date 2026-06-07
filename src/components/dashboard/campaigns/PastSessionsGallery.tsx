"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  ScrollText,
  Users,
} from "lucide-react";
import { PlayerRecapEditor } from "@/src/components/chronicle/PlayerRecapEditor";
import { PlayerRecapView } from "@/src/components/chronicle/PlayerRecapView";
import { parsePlayerRecapRecord } from "@/src/lib/session-chronicle/parse-db";
import { isRecapSummaryPlaceholder } from "@/src/lib/session-chronicle/player-recap-starter";
import type { PlayerRecapRecord } from "@/src/lib/session-chronicle/player-recap-types";

type ChronicleEntry = {
  id?: string;
  at?: string;
  text?: string;
  type?: string;
  author_name?: string;
};

type ArchiveRef = {
  id?: string | null;
  name?: string | null;
};

export type SessionArchiveItem = {
  id: string;
  campaign_id: string;
  session_id: string | null;
  session_name: string;
  archived_at: string;
  chronicle_snapshot: ChronicleEntry[] | null;
  encountered_npcs: ArchiveRef[] | null;
  visited_locations: ArchiveRef[] | null;
  player_recap?: unknown;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeEntries(entries: ChronicleEntry[] | null | undefined) {
  return [...(Array.isArray(entries) ? entries : [])].sort(
    (a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime(),
  );
}

function recapStatusLabel(recap: PlayerRecapRecord | null): {
  text: string;
  className: string;
} | null {
  if (!recap) {
    return {
      text: "Recap offen",
      className: "text-gray-500",
    };
  }
  if (recap.status === "published") {
    return {
      text: "Für Spieler live",
      className: "text-emerald-400",
    };
  }
  if (isRecapSummaryPlaceholder(recap.recap.summary_md)) {
    return {
      text: "Entwurf (leer)",
      className: "text-amber-400/80",
    };
  }
  return {
    text: "Entwurf",
    className: "text-purple-300",
  };
}

export function PastSessionsGallery({
  campaignId,
  worldId = null,
  isGM = false,
  archives,
}: {
  campaignId: string;
  worldId?: string | null;
  isGM?: boolean;
  archives: SessionArchiveItem[];
}) {
  const searchParams = useSearchParams();
  const selectedArchiveId = searchParams.get("archive");
  const selectedArchive =
    archives.find((archive) => archive.id === selectedArchiveId) ?? archives[0] ?? null;
  const entries = normalizeEntries(selectedArchive?.chronicle_snapshot);
  const recapRecord: PlayerRecapRecord | null = selectedArchive
    ? parsePlayerRecapRecord(selectedArchive.player_recap)
    : null;
  const playerRecapPublished = recapRecord?.status === "published";
  const [detailTab, setDetailTab] = useState<"logbook" | "recap">(isGM ? "recap" : "logbook");

  useEffect(() => {
    if (isGM) setDetailTab("recap");
  }, [selectedArchive?.id, isGM]);

  return (
    <section className="rounded-lg border border-amber-900/60 bg-linear-to-br from-background-card via-emerald-950/60 to-background-dark p-6 shadow-xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hero-border/40 pb-3">
        <div>
          <h2 className="font-barlow text-xl font-bold uppercase text-accent-gold">
            Session-Archiv
          </h2>
          <p className="mt-1 max-w-2xl font-libre text-sm text-gray-300 leading-relaxed">
            {isGM
              ? "Wähle einen Abend, schreibe den Spieler-Recap und gib ihn frei. Das Tisch-Log ist nur für dich."
              : "Freigegebene Recaps deines Spielleiters — nach Session-Ende."}
          </p>
        </div>
        <BookOpen className="h-6 w-6 shrink-0 text-accent-gold" />
      </div>

      {archives.length === 0 ? (
        <p className="rounded border border-dashed border-amber-900/60 bg-background-dark/60 p-5 text-center font-libre text-sm text-gray-400">
          Noch keine archivierten Sessions. Beim Beenden einer Live-Session entsteht hier
          automatisch ein Archiv-Eintrag.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="space-y-2">
            <p className="px-1 font-barlow text-[10px] font-bold uppercase text-gray-500">
              Abende ({archives.length})
            </p>
            {archives.map((archive) => {
              const selected = archive.id === selectedArchive?.id;
              const recap = parsePlayerRecapRecord(archive.player_recap);
              const status = recapStatusLabel(recap);
              return (
                <Link
                  key={archive.id}
                  href={`/dashboard/campaigns/${campaignId}?tab=sessions&archive=${archive.id}`}
                  className={`block rounded-lg border px-3 py-2.5 transition-colors ${
                    selected
                      ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                      : "border-hero-dark bg-background-dark/70 text-gray-300 hover:border-hero-border"
                  }`}
                >
                  <span className="block truncate font-barlow text-sm font-bold uppercase">
                    {archive.session_name}
                  </span>
                  <span className="mt-1 flex items-center gap-1 font-libre text-[10px] text-gray-500">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatDateTime(archive.archived_at)}
                  </span>
                  {status ? (
                    <span
                      className={`mt-1 block font-barlow text-[9px] font-bold uppercase ${status.className}`}
                    >
                      {status.text}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </aside>

          {selectedArchive ? (
            <article className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="space-y-4">
                <div className="rounded-lg border border-hero-border/25 bg-background-dark/40 px-4 py-3">
                  <h3 className="font-barlow text-base font-bold uppercase text-white">
                    {selectedArchive.session_name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 font-libre text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    Archiviert am {formatDateTime(selectedArchive.archived_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-hero-border/30 pb-2">
                  {isGM ? (
                    <button
                      type="button"
                      onClick={() => setDetailTab("recap")}
                      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-barlow text-[10px] font-bold uppercase ${
                        detailTab === "recap"
                          ? "bg-purple-900/40 text-purple-100"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                      Spieler-Recap
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDetailTab("logbook")}
                    className={`rounded px-3 py-1.5 font-barlow text-[10px] font-bold uppercase ${
                      detailTab === "logbook"
                        ? "bg-accent-gold/20 text-accent-gold"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Tisch-Log (SL)
                  </button>
                  {!isGM && playerRecapPublished ? (
                    <button
                      type="button"
                      onClick={() => setDetailTab("recap")}
                      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-barlow text-[10px] font-bold uppercase ${
                        detailTab === "recap"
                          ? "bg-purple-900/40 text-purple-100"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                      Recap
                    </button>
                  ) : null}
                </div>

                {detailTab === "recap" ? (
                  isGM ? (
                    <PlayerRecapEditor
                      campaignId={campaignId}
                      worldId={worldId}
                      archiveId={selectedArchive.id}
                      sessionId={selectedArchive.session_id}
                      initialRecord={recapRecord}
                    />
                  ) : playerRecapPublished && recapRecord ? (
                    <PlayerRecapView
                      campaignId={campaignId}
                      worldId={worldId}
                      recap={recapRecord.recap}
                      openLinksInNewTab
                    />
                  ) : (
                    <p className="rounded border border-hero-border/30 bg-background-dark/50 p-4 font-libre text-sm text-gray-500">
                      Dein Spielleiter hat für diesen Abend noch keinen Recap freigegeben.
                    </p>
                  )
                ) : (
                  <div className="rounded-xl border border-amber-900/50 bg-[#21180d]/85 p-5 shadow-inner">
                    <p className="mb-4 font-libre text-sm text-gray-400">
                      Automatisches Protokoll aus der Live-Session (System-Meldungen, Bühne,
                      Wetter …). Das ist <strong className="text-gray-300">nicht</strong> der
                      Spieler-Recap.
                    </p>
                    <div className="space-y-3">
                      {entries.length > 0 ? (
                        entries.map((entry, index) => {
                          const isSystem =
                            String(entry.type ?? "").toLowerCase().includes("system") ||
                            entry.author_name === "System";
                          return (
                            <div
                              key={entry.id ?? `${selectedArchive.id}-${index}`}
                              className={`rounded border px-4 py-3 ${
                                isSystem
                                  ? "border-accent-gold/35 bg-accent-gold/10 italic text-amber-100"
                                  : "border-amber-900/45 bg-black/20 text-gray-100"
                              }`}
                            >
                              <p className="font-libre text-sm leading-relaxed">
                                {entry.text || "Leerer Eintrag"}
                              </p>
                              <p className="mt-2 font-barlow text-[10px] uppercase tracking-wide text-gray-500">
                                {entry.author_name || "System"} · {formatDate(entry.at)}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="font-libre text-sm italic text-gray-500">
                          Keine Tisch-Log-Einträge für diesen Abend.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <aside className="space-y-4">
                <div className="rounded border border-hero-border/30 bg-background-dark/70 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-barlow text-xs font-bold uppercase text-accent-gold">
                    <MapPin className="h-4 w-4" />
                    Orte (Archiv)
                  </h4>
                  <p className="mb-2 font-libre text-[10px] text-gray-500">
                    Werden im Spieler-Recap automatisch mit angezeigt.
                  </p>
                  <div className="space-y-1">
                    {(selectedArchive.visited_locations ?? []).length > 0 ? (
                      (selectedArchive.visited_locations ?? []).map((location, index) =>
                        location.id ? (
                          <Link
                            key={location.id}
                            href={`/dashboard/campaigns/${campaignId}/lore/${location.id}`}
                            className="block font-libre text-sm text-hero-vibrant hover:underline"
                          >
                            {location.name}
                          </Link>
                        ) : (
                          <span key={index} className="block font-libre text-sm text-gray-300">
                            {location.name ?? "Unbekannter Ort"}
                          </span>
                        ),
                      )
                    ) : (
                      <p className="font-libre text-xs text-gray-500">Keine Orte erfasst.</p>
                    )}
                  </div>
                </div>

                <div className="rounded border border-hero-border/30 bg-background-dark/70 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-barlow text-xs font-bold uppercase text-accent-gold">
                    <Users className="h-4 w-4" />
                    NSCs (Archiv)
                  </h4>
                  <div className="space-y-1">
                    {(selectedArchive.encountered_npcs ?? []).length > 0 ? (
                      (selectedArchive.encountered_npcs ?? []).map((npc) =>
                        npc.id ? (
                          <Link
                            key={npc.id}
                            href={`/dashboard/campaigns/${campaignId}/npcs/${npc.id}`}
                            className="block font-libre text-sm text-hero-vibrant hover:underline"
                          >
                            {npc.name}
                          </Link>
                        ) : null,
                      )
                    ) : (
                      <p className="font-libre text-xs text-gray-500">Keine NSCs erfasst.</p>
                    )}
                  </div>
                </div>
              </aside>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
