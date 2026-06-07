import { parsePlayerRecapRecord } from "./parse-db";
import type { PlayerRecapRecord } from "./player-recap-types";

export type LatestPublishedPlayerRecap = {
  archiveId: string;
  sessionName: string;
  archivedAt: string;
  record: PlayerRecapRecord;
};

type ArchiveLike = {
  id: string;
  session_name?: string | null;
  archived_at: string;
  player_recap?: unknown;
};

/** Neuestes freigegebenes Spieler-Recap (Archiv sortiert nach archived_at absteigend). */
export function findLatestPublishedPlayerRecap(
  archives: ArchiveLike[],
): LatestPublishedPlayerRecap | null {
  for (const archive of archives) {
    const record = parsePlayerRecapRecord(archive.player_recap);
    if (record?.status !== "published") continue;
    return {
      archiveId: String(archive.id),
      sessionName: String(archive.session_name ?? "Letzte Session").trim() || "Letzte Session",
      archivedAt: String(archive.archived_at),
      record,
    };
  }
  return null;
}
