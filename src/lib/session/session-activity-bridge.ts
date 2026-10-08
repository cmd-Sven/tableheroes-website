"use client";

import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";

export const SESSION_ACTIVITY_POSTED_EVENT = "th:session-activity-posted";
export const SESSION_ACTIVITY_POSTED_BROADCAST = "session_activity_posted";

export type SessionActivityPostedDetail = {
  entry: SessionActivityEntry;
  remote?: boolean;
  senderId?: string | null;
};

export function dispatchSessionActivityPosted(detail: SessionActivityPostedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SESSION_ACTIVITY_POSTED_EVENT, { detail }),
  );
}

export function isSessionActivityEntry(value: unknown): value is SessionActivityEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.at === "string" &&
    typeof row.text === "string" &&
    typeof row.type === "string"
  );
}
