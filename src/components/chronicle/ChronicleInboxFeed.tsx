"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import {
  buildChronicleImportUrl,
  type InboxImportUrlContext,
} from "@/src/lib/session-chronicle/inbox-import-urls";
import {
  countPendingInboxItems,
  inboxItemTitle,
  listChronicleInboxItems,
} from "@/src/lib/session-chronicle/inbox";
import { parseChronicleStateRow } from "@/src/lib/session-chronicle/parse-db";
import type { ChronicleInboxItem, SessionChronicleState } from "@/src/lib/session-chronicle/types";

type Props = {
  campaignId: string;
  sessionId: string;
  worldId: string | null;
  variant: "compact" | "full";
  initialState?: SessionChronicleState | null;
  pollEnabled?: boolean;
  npcNames?: Array<{ id: string; name: string }>;
  maxItems?: number;
};

const KIND_LABEL: Record<ChronicleInboxItem["kind"], string> = {
  npc: "NSC",
  location: "Ort",
  quest: "Quest",
};

function itemSubtitle(item: ChronicleInboxItem): string | null {
  if (item.kind === "npc" && item.draft.located_in?.trim()) {
    return item.draft.located_in.trim();
  }
  if (item.kind === "location" && item.draft.type?.trim()) {
    return item.draft.type.trim();
  }
  if (item.kind === "quest" && item.draft.giver?.trim()) {
    return `von ${item.draft.giver.trim()}`;
  }
  return null;
}

export function ChronicleInboxFeed({
  campaignId,
  sessionId,
  worldId,
  variant,
  initialState = null,
  pollEnabled = true,
  npcNames,
  maxItems,
}: Props) {
  const [state, setState] = useState<SessionChronicleState | null>(initialState);
  const limit = maxItems ?? (variant === "compact" ? 4 : 24);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    if (!pollEnabled || variant !== "compact") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/transcription/status`,
          { credentials: "same-origin" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          chronicleState?: unknown;
        };
        if (!cancelled && res.ok) {
          setState(parseChronicleStateRow(data.chronicleState));
        }
      } catch {
        /* ignore */
      }
    };

    void poll();
    const id = window.setInterval(poll, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollEnabled, sessionId, variant]);

  const items = useMemo(() => listChronicleInboxItems(state).slice(0, limit), [state, limit]);
  const pendingTotal = countPendingInboxItems(state);
  const urlCtx: InboxImportUrlContext = {
    campaignId,
    sessionId,
    worldId,
    npcNames,
  };

  if (pendingTotal === 0 && variant === "compact") return null;

  return (
    <div
      className={
        variant === "compact"
          ? "rounded border border-hero-border/30 bg-[#0a1f10]/80 p-2"
          : "space-y-2"
      }
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-barlow text-[9px] font-bold uppercase text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-accent-gold" />
          KI-Vorschläge
          {pendingTotal > 0 ? (
            <span className="rounded-full bg-accent-gold/20 px-1.5 py-0.5 text-[8px] text-accent-gold">
              {pendingTotal} neu
            </span>
          ) : null}
        </p>
        {variant === "compact" ? (
          <Link
            href={`/dashboard/campaigns/${campaignId}/chronist`}
            className="font-barlow text-[8px] font-bold uppercase text-hero-vibrant hover:text-white"
          >
            Alle
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="font-libre text-[10px] text-gray-500">
          {variant === "compact"
            ? "Noch keine offenen Vorschläge."
            : "Keine offenen Vorschläge für diese Session."}
        </p>
      ) : (
        <ul className={variant === "compact" ? "max-h-36 space-y-1 overflow-y-auto" : "grid gap-2 sm:grid-cols-2"}>
          {items.map((item) => {
            const href = buildChronicleImportUrl(urlCtx, item);
            const subtitle = itemSubtitle(item);
            return (
              <li
                key={`${item.kind}-${item.index}`}
                className={
                  variant === "compact"
                    ? "rounded border border-hero-border/20 bg-background-dark/40 px-2 py-1.5"
                    : "rounded border border-hero-border/30 bg-hero-dark/30 px-3 py-2"
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-barlow text-[8px] uppercase text-gray-500">
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span
                      className={`block truncate font-libre text-gray-200 ${variant === "compact" ? "text-[11px]" : "text-sm"}`}
                    >
                      {inboxItemTitle(item)}
                    </span>
                    {subtitle ? (
                      <span className="block truncate font-libre text-[10px] text-gray-500">
                        {subtitle}
                      </span>
                    ) : null}
                  </div>
                  {variant === "full" && href ? (
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded border border-accent-gold/40 bg-accent-gold/10 px-2 py-1 font-barlow text-[8px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Import
                    </Link>
                  ) : null}
                </div>
                {variant === "compact" && href ? (
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-barlow text-[8px] font-bold uppercase text-hero-vibrant hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Übernehmen
                  </Link>
                ) : null}
                {variant === "full" && item.kind === "location" && !worldId ? (
                  <p className="mt-1 font-libre text-[10px] text-amber-400/90">
                    Kampagne ohne Welt — Ort-Import nicht möglich.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
