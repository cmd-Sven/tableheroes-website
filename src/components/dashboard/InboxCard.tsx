"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Inbox, Mail, X, AlertTriangle } from "lucide-react";
import { markMessageAsRead, type PlayerMessage } from "@/src/lib/actions/message-actions";

const MAX_ITEMS = 3;

type Props = {
  messages: PlayerMessage[];
  /** Zeigt Banner "Warte auf Terminbestätigung" wenn Anmeldefrist erreicht und noch nicht zugesagt */
  sessionConfirmationPending?: boolean;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function InboxCard({ messages: initialMessages, sessionConfirmationPending = false }: Props) {
  const [messages, setMessages] = useState<PlayerMessage[]>(
    initialMessages.filter((m) => !m.readAt).slice(0, MAX_ITEMS)
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const openMessage = messages.find((m) => m.id === openId);

  const handleOpen = useCallback(
    (msg: PlayerMessage) => {
      setOpenId(msg.id);
    },
    []
  );

  const handleClose = useCallback(() => {
    if (!openId) return;
    startTransition(async () => {
      await markMessageAsRead(openId);
    });
    setFadingId(openId);
    setOpenId(null);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== openId));
      setFadingId(null);
    }, 300);
  }, [openId]);

  if (messages.length === 0 && !openMessage) {
    return (
      <div className="w-full p-4">
        <div className="text-center py-6 rounded-lg border border-hero-border/40 bg-hero-dark/20">
          <Mail className="mx-auto h-10 w-10 text-gray-600" />
          <p className="font-libre text-sm text-gray-500 mt-2">
            Keine ungelesenen Nachrichten.
          </p>
          <Link
            href="/dashboard/messages"
            className="inline-block mt-3 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:text-accent-gold transition-colors"
          >
            Alle Nachrichten ansehen →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-3">
      {sessionConfirmationPending && (
        <Link
          href="/dashboard"
          className="block rounded-lg border border-amber-500/50 bg-amber-900/20 px-4 py-3 hover:bg-amber-900/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-barlow font-bold text-sm text-amber-200">
                Warte auf Terminbestätigung
              </p>
              <p className="font-libre text-xs text-gray-400 mt-0.5">
                Bitte bestätige deine Teilnahme bei den nächsten Terminen.
              </p>
            </div>
          </div>
        </Link>
      )}
      <ul className="space-y-2">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`transition-all duration-300 ${
              fadingId === msg.id ? "opacity-0 scale-95" : "opacity-100"
            }`}
          >
            <button
              type="button"
              onClick={() => handleOpen(msg)}
              className="block w-full text-left rounded-lg border border-hero-border/40 bg-hero-dark/20 p-3 hover:border-hero-vibrant/50 hover:bg-hero-dark/30 transition-colors"
            >
              <p className="font-barlow font-bold text-sm text-white truncate">
                {msg.subject}
              </p>
              <p className="font-libre text-xs text-gray-500 line-clamp-1 mt-0.5">
                {msg.content}
              </p>
              <p className="font-barlow text-[10px] text-gray-600 mt-1.5">
                {msg.senderName}
                {msg.campaignName && ` · ${msg.campaignName}`}
                {" · "}
                {formatDate(msg.createdAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/messages"
        className="mt-3 flex items-center justify-center gap-2 rounded-md border border-hero-border/30 bg-background-dark/50 px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-400 hover:bg-background-dark hover:text-hero-vibrant transition-colors"
      >
        <Inbox className="h-4 w-4" />
        Alle Nachrichten
      </Link>

      {/* Detail-Modal */}
      {openMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-hero-dark bg-background-card shadow-2xl"
            style={{
              backgroundImage: "url('/images/dark-marmor.jpg')",
              backgroundSize: "cover",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-white/10"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6">
              <h2 className="font-cinzel font-bold text-lg text-white pr-8">
                {openMessage.subject}
              </h2>
              <p className="font-barlow text-xs text-gray-500 mt-1">
                Von {openMessage.senderName}
                {openMessage.campaignName && ` · ${openMessage.campaignName}`}
                {" · "}
                {formatDate(openMessage.createdAt)}
              </p>
              <div className="mt-4 rounded-lg border border-hero-border/20 bg-background-dark/50 p-4">
                <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {openMessage.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
