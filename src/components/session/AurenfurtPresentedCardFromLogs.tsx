"use client";

import { useMemo } from "react";
import type { SystemLogEntry } from "@/src/components/session/live-board/live-session-types";
import type { AurenfurtPresentedCard } from "@/src/lib/actions/aurenfurt-session-actions";
import { AurenfurtPlayedCardModal } from "@/src/components/session/AurenfurtPlayedCardModal";

function presentedFromLogs(logs: SystemLogEntry[]): AurenfurtPresentedCard | null {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const entry = logs[index];
    if (entry.type === "aurenfurt_card_dismiss") return null;
    if (entry.type !== "aurenfurt_card_reveal") continue;
    const meta = (entry.meta ?? {}) as Record<string, unknown>;
    const title = typeof meta.title === "string" ? meta.title : entry.text;
    if (!title.trim()) continue;
    return {
      revealId:
        typeof meta.revealId === "string" && meta.revealId.trim()
          ? meta.revealId.trim()
          : entry.id,
      kind:
        meta.kind === "kaiser" || meta.kind === "city-event" || meta.kind === "npc-card"
          ? meta.kind
          : "city-event",
      title,
      text: typeof meta.text === "string" ? meta.text : "",
      imageUrl:
        typeof meta.imageUrl === "string" && meta.imageUrl.trim() ? meta.imageUrl.trim() : null,
      subtitle: typeof meta.subtitle === "string" ? meta.subtitle : null,
    };
  }
  return null;
}

/** Spieler-Ansicht: ausgelegte Stadt-/Kaiser-Karte aus System-Logs. */
export function AurenfurtPresentedCardFromLogs({
  logs,
  enabled,
}: {
  logs: SystemLogEntry[];
  enabled: boolean;
}) {
  const card = useMemo(
    () => (enabled ? presentedFromLogs(logs) : null),
    [enabled, logs],
  );
  return <AurenfurtPlayedCardModal card={card} canDismiss={false} />;
}
