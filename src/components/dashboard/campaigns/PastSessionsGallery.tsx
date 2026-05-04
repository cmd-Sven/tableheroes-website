"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, Calendar, MapPin, Users } from "lucide-react";

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
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeEntries(entries: ChronicleEntry[] | null | undefined) {
  return [...(Array.isArray(entries) ? entries : [])].sort(
    (a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime(),
  );
}

export function PastSessionsGallery({
  campaignId,
  archives,
}: {
  campaignId: string;
  archives: SessionArchiveItem[];
}) {
  const searchParams = useSearchParams();
  const selectedArchiveId = searchParams.get("archive");
  const selectedArchive =
    archives.find((archive) => archive.id === selectedArchiveId) ?? archives[0] ?? null;
  const entries = normalizeEntries(selectedArchive?.chronicle_snapshot);

  return (
    <section className="rounded-lg border border-amber-900/60 bg-linear-to-br from-background-card via-emerald-950/60 to-background-dark p-6 shadow-xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-hero-border/40 pb-3">
        <div>
          <h2 className="font-barlow text-xl font-bold uppercase text-accent-gold">
            Vergangene Sessions
          </h2>
          <p className="font-libre text-xs text-gray-400">
            Logbuch, besuchte Orte und Begegnungen aus abgeschlossenen Spielabenden.
          </p>
        </div>
        <BookOpen className="h-6 w-6 text-accent-gold" />
      </div>

      {archives.length === 0 ? (
        <p className="rounded border border-dashed border-amber-900/60 bg-background-dark/60 p-5 text-center font-libre text-sm text-gray-400">
          Noch keine archivierten Sessions. Beim Beenden einer Live-Session entsteht hier
          automatisch ein Logbuch-Eintrag.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="space-y-2">
            {archives.map((archive) => {
              const selected = archive.id === selectedArchive?.id;
              return (
                <Link
                  key={archive.id}
                  href={`/dashboard/campaigns/${campaignId}?tab=sessions&archive=${archive.id}`}
                  className={`block rounded border px-3 py-2 transition-colors ${
                    selected
                      ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                      : "border-hero-dark bg-background-dark/70 text-gray-300 hover:border-hero-border"
                  }`}
                >
                  <span className="block truncate font-barlow text-sm font-bold uppercase">
                    {archive.session_name}
                  </span>
                  <span className="mt-1 flex items-center gap-1 font-libre text-[10px] text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(archive.archived_at)}
                  </span>
                </Link>
              );
            })}
          </aside>

          {selectedArchive ? (
            <article className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="rounded-xl border border-amber-900/50 bg-[#21180d]/85 p-5 shadow-inner">
                <h3 className="font-cinzel text-xl font-bold text-accent-gold">
                  {selectedArchive.session_name}
                </h3>
                <p className="mb-4 font-libre text-xs text-amber-100/70">
                  Archiviert am {formatDate(selectedArchive.archived_at)}
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
                            {entry.author_name || "Chronik"} · {formatDate(entry.at)}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="font-libre text-sm italic text-gray-500">
                      Für diese Session wurden keine Chronikeinträge gespeichert.
                    </p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded border border-hero-border/30 bg-background-dark/70 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-barlow text-xs font-bold uppercase text-accent-gold">
                    <MapPin className="h-4 w-4" />
                    Besuchte Orte
                  </h4>
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
                    Begegnte Personen
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
                      <p className="font-libre text-xs text-gray-500">Keine NPCs erfasst.</p>
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
