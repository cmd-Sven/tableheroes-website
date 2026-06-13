"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink, Loader2, Sparkles, Trash2 } from "lucide-react";
import {
  dismissAllChronicleInboxItems,
  dismissChronicleInboxItem,
} from "@/src/app/dashboard/campaigns/[id]/chronicle-inbox-actions";
import { GmBoardSettingsModal } from "@/src/components/session/GmBoardSettingsModal";
import {
  chronicleImportFlowHint,
  getChronicleInboxItemDetails,
} from "@/src/lib/session-chronicle/inbox-item-details";
import {
  buildChronicleImportUrl,
  type InboxImportUrlContext,
} from "@/src/lib/session-chronicle/inbox-import-urls";
import {
  countPendingInboxItems,
  dismissAllPendingInboxItems,
  dismissLocation,
  dismissNpc,
  dismissQuest,
  inboxItemTitle,
  listChronicleInboxItems,
} from "@/src/lib/session-chronicle/inbox";
import { parseChronicleStateRow } from "@/src/lib/session-chronicle/parse-db";
import type { ChronicleInboxItem, SessionChronicleState } from "@/src/lib/session-chronicle/types";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

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

function InboxItemDetailModal({
  item,
  href,
  onClose,
  onDismiss,
  dismissing,
}: {
  item: ChronicleInboxItem;
  href: string | null;
  onClose: () => void;
  onDismiss: (item: ChronicleInboxItem) => void;
  dismissing: boolean;
}) {
  const details = getChronicleInboxItemDetails(item);
  const title = inboxItemTitle(item);

  return (
    <GmBoardSettingsModal
      open
      onClose={onClose}
      title={`KI-Vorschlag: ${KIND_LABEL[item.kind]}`}
      size="lg"
      zIndexClass="z-[160]"
    >
      <div className="space-y-4">
        <div>
          <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">
            Erkannt als
          </p>
          <p className="mt-1 font-barlow text-lg font-bold text-white">{title}</p>
        </div>

        {details.length > 0 ? (
          <dl className="space-y-3 rounded-lg border border-hero-border/30 bg-background-dark/50 p-3">
            {details.map((line) => (
              <div key={line.label}>
                <dt className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                  {line.label}
                </dt>
                <dd className="mt-0.5 font-libre text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="font-libre text-sm text-gray-400">
            Die KI hat außer dem Namen noch keine weiteren Details extrahiert.
          </p>
        )}

        <p className="rounded-lg border border-accent-gold/25 bg-accent-gold/5 px-3 py-2.5 font-libre text-xs leading-relaxed text-gray-300">
          {chronicleImportFlowHint(item)}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={dismissing}
            onClick={() => onDismiss(item)}
            className="inline-flex items-center gap-1.5 rounded border border-red-500/40 px-4 py-2 font-barlow text-xs font-bold uppercase text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            {dismissing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Verwerfen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-400"
          >
            Schließen
          </button>
          {href ? (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-accent-gold/50 bg-accent-gold/15 px-4 py-2 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/25"
              onClick={onClose}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Im Maker übernehmen
            </Link>
          ) : (
            <span className="font-libre text-xs text-amber-400">
              Import derzeit nicht möglich (z. B. fehlende Welt).
            </span>
          )}
        </div>
      </div>
    </GmBoardSettingsModal>
  );
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
  const [detailItem, setDetailItem] = useState<ChronicleInboxItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const limit = maxItems ?? (variant === "compact" ? 4 : 24);

  const applyLocalDismiss = useCallback((item: ChronicleInboxItem) => {
    setState((prev) => {
      if (!prev) return prev;
      if (item.kind === "npc") return dismissNpc(prev, item.index);
      if (item.kind === "location") return dismissLocation(prev, item.index);
      return dismissQuest(prev, item.index);
    });
  }, []);

  const handleDismissItem = useCallback(
    (item: ChronicleInboxItem, closeDetail = false) => {
      setActionError(null);
      startTransition(async () => {
        const result = await dismissChronicleInboxItem(sessionId, item.kind, item.index);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        applyLocalDismiss(item);
        if (closeDetail) setDetailItem(null);
      });
    },
    [applyLocalDismiss, sessionId],
  );

  const handleDismissAll = useCallback(() => {
    setActionError(null);
    startTransition(async () => {
      const result = await dismissAllChronicleInboxItems(sessionId);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setState((prev) => (prev ? dismissAllPendingInboxItems(prev) : prev));
      setDetailItem(null);
    });
  }, [sessionId]);

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

  const detailHref = detailItem ? buildChronicleImportUrl(urlCtx, detailItem) : null;

  if (pendingTotal === 0 && variant === "compact") return null;

  return (
    <>
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
          {pendingTotal > 0 ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDismissAll()}
              className="inline-flex items-center gap-1 font-barlow text-[8px] font-bold uppercase text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Alle verwerfen
            </button>
          ) : null}
        </div>

        {actionError ? (
          <p className="mb-2 font-libre text-[10px] text-red-400">{actionError}</p>
        ) : null}

        {items.length === 0 ? (
          <p className="font-libre text-[10px] text-gray-500">
            {variant === "compact"
              ? "Noch keine offenen Vorschläge."
              : "Keine offenen Vorschläge für diese Session."}
          </p>
        ) : (
          <ul
            className={
              variant === "compact"
                ? "max-h-36 space-y-1 overflow-y-auto"
                : "grid gap-2 sm:grid-cols-2"
            }
          >
            {items.map((item) => {
              const href = buildChronicleImportUrl(urlCtx, item);
              const subtitle = itemSubtitle(item);
              const detailCount = getChronicleInboxItemDetails(item).length;

              return (
                <li
                  key={`${item.kind}-${item.index}`}
                  className={
                    variant === "compact"
                      ? "rounded border border-hero-border/20 bg-background-dark/40 px-2 py-1.5"
                      : "rounded border border-hero-border/30 bg-hero-dark/30 px-3 py-2"
                  }
                >
                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    className="flex w-full items-start justify-between gap-2 text-left transition-colors hover:opacity-90"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-barlow text-[8px] uppercase text-gray-500">
                        {KIND_LABEL[item.kind]}
                      </span>
                      <span
                        className={`block font-libre text-gray-200 ${variant === "compact" ? "truncate text-[11px]" : "text-sm"}`}
                        title={inboxItemTitle(item)}
                      >
                        {inboxItemTitle(item)}
                      </span>
                      {subtitle ? (
                        <span className="block truncate font-libre text-[10px] text-gray-500">
                          {subtitle}
                        </span>
                      ) : null}
                      {detailCount > 0 ? (
                        <span className="mt-0.5 block font-libre text-[9px] text-gray-600">
                          {detailCount} Detail{detailCount === 1 ? "" : "s"} · Tippen für Vorschau
                        </span>
                      ) : (
                        <span className="mt-0.5 block font-libre text-[9px] text-gray-600">
                          Tippen für Details
                        </span>
                      )}
                    </div>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-gray-500" />
                  </button>

                  {variant === "full" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="rounded border border-hero-border/40 px-2 py-1 font-barlow text-[8px] font-bold uppercase text-gray-400 hover:text-white"
                      >
                        Details
                      </button>
                      {href ? (
                        <Link
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-accent-gold/40 bg-accent-gold/10 px-2 py-1 font-barlow text-[8px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Import
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDismissItem(item)}
                        className="inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 font-barlow text-[8px] font-bold uppercase text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Verwerfen
                      </button>
                    </div>
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

      {detailItem ? (
        <InboxItemDetailModal
          item={detailItem}
          href={detailHref}
          onClose={() => setDetailItem(null)}
          onDismiss={(item) => handleDismissItem(item, true)}
          dismissing={isPending}
        />
      ) : null}
    </>
  );
}
