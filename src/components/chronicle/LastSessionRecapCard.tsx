import Link from "next/link";
import { Calendar, ScrollText } from "lucide-react";
import { PlayerRecapView } from "./PlayerRecapView";
import type { LatestPublishedPlayerRecap } from "@/src/lib/session-chronicle/latest-published-recap";

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type Props = {
  campaignId: string;
  worldId?: string | null;
  recap: LatestPublishedPlayerRecap;
  sessionsTabHref?: string;
  className?: string;
};

export function LastSessionRecapCard({
  campaignId,
  worldId = null,
  recap,
  sessionsTabHref,
  className = "",
}: Props) {
  const archiveLink =
    sessionsTabHref ??
    `/dashboard/campaigns/${campaignId}?tab=sessions&archive=${encodeURIComponent(recap.archiveId)}`;

  return (
    <section
      className={`rounded-xl border border-purple-900/45 bg-purple-950/15 p-4 md:p-5 ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-purple-900/30 pb-3">
        <div>
          <h4 className="flex items-center gap-2 font-barlow text-sm font-bold uppercase text-purple-100">
            <ScrollText className="h-4 w-4 text-accent-gold" />
            Recap vom letzten Abend
          </h4>
          <p className="mt-1 font-cinzel text-base font-bold text-white">{recap.sessionName}</p>
          <p className="mt-1 flex items-center gap-1.5 font-libre text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            {formatArchiveDate(recap.archivedAt)}
          </p>
        </div>
        <Link
          href={archiveLink}
          className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
        >
          Im Archiv öffnen
        </Link>
      </div>

      <PlayerRecapView
        campaignId={campaignId}
        worldId={worldId}
        recap={recap.record.recap}
        openLinksInNewTab
      />
    </section>
  );
}
