"use client";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";
import {
  Mail,
  MailOpen,
  Flame,
  Scroll,
  Users,
  User,
  X,
  Eye,
} from "lucide-react";
import {
  markMessageAsRead,
  type PlayerMessage,
} from "@/src/lib/actions/message-actions";

type Props = {
  messages: PlayerMessage[];
  maxItems?: number;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* ------------------------------------------------------------------ */
/* Brennendes-Siegel Icon                                              */
/* ------------------------------------------------------------------ */
function SealIcon({
  isHigh,
  isUnread,
}: {
  isHigh: boolean;
  isUnread: boolean;
}) {
  // Ungelesen + hohe Priorität → brennendes Siegel
  if (isHigh && isUnread) {
    return (
      <div className="relative group/seal shrink-0">
        <Flame className="h-5 w-5 text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        {/* Tooltip */}
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-950 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-red-200 opacity-0 shadow-lg transition-opacity group-hover/seal:opacity-100 border border-red-800/60">
          Dringende Botschaft!
        </span>
      </div>
    );
  }

  // Ungelesen + normale Priorität → versiegeltes Scroll
  if (isUnread) {
    return (
      <div className="shrink-0">
        <Scroll className="h-5 w-5 text-accent-gold/70" />
      </div>
    );
  }

  // Gelesen → geöffneter Brief (kein Glow, kein Puls)
  return (
    <div className="shrink-0">
      <MailOpen className="h-5 w-5 text-gray-600" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Einzelne Nachricht (Karte)                                          */
/* ------------------------------------------------------------------ */
function MessageCard({
  msg,
  onOpen,
}: {
  msg: PlayerMessage;
  onOpen: (msg: PlayerMessage) => void;
}) {
  const isHigh = msg.priority === "high";
  const isUnread = !msg.readAt;

  return (
    <button
      type="button"
      onClick={() => onOpen(msg)}
      className={`block w-full text-left rounded-lg border p-3 transition-all hover:border-hero-border group ${
        isHigh && isUnread
          ? "border-red-900/50 bg-red-950/[0.08] shadow-[0_0_14px_rgba(239,68,68,0.15)] hover:shadow-[0_0_18px_rgba(239,68,68,0.25)]"
          : isUnread
          ? "border-hero-border/40 bg-hero-dark/20"
          : "border-hero-border/20 bg-hero-dark/10 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Seal Icon */}
        <div className="mt-0.5">
          <SealIcon isHigh={isHigh} isUnread={isUnread} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {/* Subject */}
            <p
              className={`font-barlow text-sm truncate ${
                isUnread
                  ? "font-bold text-white"
                  : "font-semibold text-gray-400"
              }`}
            >
              {msg.subject}
            </p>
          </div>

          <p className="font-libre text-xs text-gray-500 line-clamp-1">
            {msg.content}
          </p>

          <div className="flex items-center gap-2 mt-1.5">
            {/* Type Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-barlow text-[10px] uppercase border ${
                msg.type === "broadcast"
                  ? "bg-accent-gold/10 text-accent-gold border-accent-gold/30"
                  : "bg-hero-dark text-gray-400 border-hero-border/30"
              }`}
            >
              {msg.type === "broadcast" ? (
                <Users className="h-2.5 w-2.5" />
              ) : (
                <User className="h-2.5 w-2.5" />
              )}
              {msg.type === "broadcast" ? "Rundbrief" : "Direkt"}
            </span>

            <span className="font-barlow text-[10px] text-gray-600">
              {msg.senderName}
              {msg.campaignName && ` · ${msg.campaignName}`}
            </span>

            <span className="ml-auto font-barlow text-[10px] text-gray-600">
              {formatDate(msg.createdAt)}
            </span>
          </div>
        </div>

        {/* Unread Dot */}
        {isUnread && (
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-hero-vibrant" />
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Detail-Modal                                                        */
/* ------------------------------------------------------------------ */
function MessageDetailModal({
  msg,
  onClose,
}: {
  msg: PlayerMessage;
  onClose: () => void;
}) {
  const isHigh = msg.priority === "high";
  // Im Modal ist die Nachricht immer bereits "gerade gelesen" (da handleOpen
  // den optimistischen readAt setzt, bevor das Modal erscheint)
  const wasUnreadBeforeOpen = !msg.readAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-lg border bg-background-card shadow-2xl ${
          isHigh
            ? "border-red-700/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            : "border-hero-dark"
        }`}
        style={{
          backgroundImage: "url('/images/dark-marmor.webp')",
          backgroundSize: "cover",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            {/* Avatar / geöffneter Brief */}
            <div className="relative shrink-0">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-hero-border/40 bg-background-dark">
                {msg.senderAvatarUrl ? (
                  <Image
                    src={msg.senderAvatarUrl}
                    alt={msg.senderName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center font-barlow font-bold text-sm text-accent-gold">
                    {msg.senderName[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel font-bold text-lg text-white">
                  {msg.subject}
                </h2>
              </div>
              <p className="font-barlow text-xs text-gray-500 mt-0.5">
                Von {msg.senderName}
                {msg.campaignName && ` · ${msg.campaignName}`}
                {" · "}
                {formatDate(msg.createdAt)}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-barlow text-[10px] uppercase border ${
                msg.type === "broadcast"
                  ? "bg-accent-gold/10 text-accent-gold border-accent-gold/30"
                  : "bg-hero-dark text-gray-400 border-hero-border/30"
              }`}
            >
              {msg.type === "broadcast" ? (
                <Users className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              {msg.type === "broadcast" ? "Kampagnen-Rundbrief" : "Direktnachricht"}
            </span>
            {isHigh && (
              <span className="inline-flex items-center gap-1 rounded bg-red-900/30 px-2 py-0.5 font-barlow text-[10px] uppercase text-red-300 border border-red-700/40">
                <Flame className="h-3 w-3" />
                Dringend
              </span>
            )}
          </div>

          {/* Content */}
          <div className="rounded-lg border border-hero-border/20 bg-background-dark p-4">
            <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </p>
          </div>

          {/* Read indicator */}
          <div className="flex items-center gap-1.5 mt-4 text-gray-600">
            <Eye className="h-3.5 w-3.5" />
            <span className="font-barlow text-[10px] uppercase">
              {wasUnreadBeforeOpen
                ? "Gerade gelesen"
                : msg.readAt
                ? `Gelesen am ${formatDate(msg.readAt)}`
                : "Gelesen"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Haupt-Widget                                                        */
/* ------------------------------------------------------------------ */
export function MessageWidget({ messages, maxItems = 5 }: Props) {
  // Optimistischer lokaler State: speichert IDs, die in dieser Session
  // als gelesen markiert wurden, damit die UI sofort reagiert.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [openMsg, setOpenMsg] = useState<PlayerMessage | null>(null);
  const [, startTransition] = useTransition();

  // Messages mit optimistischem readAt-Override
  const resolvedMessages = messages.map((msg) =>
    readIds.has(msg.id) && !msg.readAt
      ? { ...msg, readAt: new Date().toISOString() }
      : msg
  );

  const displayMessages = resolvedMessages.slice(0, maxItems);
  const unreadCount = resolvedMessages.filter((m) => !m.readAt).length;

  const handleOpen = useCallback(
    (msg: PlayerMessage) => {
      const wasUnread = !msg.readAt && !readIds.has(msg.id);

      // Optimistisch: sofort als gelesen markieren (UI)
      if (wasUnread) {
        setReadIds((prev) => new Set(prev).add(msg.id));
      }

      // Modal mit dem Original-Msg öffnen (readAt bleibt null für
      // den "Gerade gelesen"-Hinweis im Modal)
      setOpenMsg(msg);

      // Server-Call nur wenn tatsächlich ungelesen
      if (wasUnread) {
        startTransition(async () => {
          await markMessageAsRead(msg.id);
        });
      }
    },
    [readIds, startTransition]
  );

  if (displayMessages.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="text-center py-8">
          <Mail className="mx-auto h-10 w-10 text-gray-600" />
          <p className="font-libre text-gray-500 mt-2">
            Keine neuen Nachrichten.
          </p>
          <p className="font-libre text-sm text-gray-600 mt-1">
            Nachrichten von Spielleitern erscheinen hier.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      {/* Header with unread count */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded-full bg-hero-vibrant/20 px-2 py-0.5 font-barlow font-bold text-[10px] text-hero-vibrant border border-hero-vibrant/30">
            {unreadCount} ungelesen
          </span>
        </div>
      )}

      <div className="space-y-2">
        {displayMessages.map((msg) => (
          <MessageCard key={msg.id} msg={msg} onOpen={handleOpen} />
        ))}
      </div>

      {/* Modal */}
      {openMsg && (
        <MessageDetailModal
          msg={openMsg}
          onClose={() => setOpenMsg(null)}
        />
      )}
    </div>
  );
}
