/**
 * session-end-wrap-up-modal.utils — Helpers for the session end wrap-up modal.
 */
import type { SessionWrapUpPreview, SessionWrapUpTask } from "@/src/lib/session-wrap-up/types";

export function formatSessionDate(iso: string): string {
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

export function presenceLabel(presence: "online" | "physical" | "both" | null): string {
  if (presence === "both") return "Online & am Tisch";
  if (presence === "online") return "Eingeloggt";
  if (presence === "physical") return "Physisch am Tisch";
  return "Nicht erkannt";
}

export function resolveRedirectPath(data: SessionWrapUpPreview, campaignId: string): string {
  const hasChronistFollowUp =
    data.inbox.pendingCount > 0 ||
    data.chronist.failedChunks > 0 ||
    data.chronist.pendingWhisper + data.chronist.pendingSummarize > 0;
  if (hasChronistFollowUp) {
    return `/dashboard/campaigns/${campaignId}/chronist`;
  }
  return `/dashboard/campaigns/${campaignId}?tab=sessions`;
}

export function shouldWaitForChronistProcessing(
  preview: SessionWrapUpPreview,
  wasRecordingActive: boolean,
): boolean {
  if (wasRecordingActive) return true;
  if (preview.chronist.recordingActive) return true;
  if (preview.chronist.chunkCount > 0) return true;
  if (preview.chronist.pendingWhisper + preview.chronist.pendingSummarize > 0) {
    return true;
  }
  return preview.chronist.used;
}

export type { SessionWrapUpTask };
