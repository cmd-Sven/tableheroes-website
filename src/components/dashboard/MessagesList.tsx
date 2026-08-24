"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Inbox, Trash2, Mail, X, Circle } from "lucide-react";
import {
  deleteMessage,
  deleteAllReadMessages,
  markMessageAsRead,
  type PlayerMessage,
} from "@/src/lib/actions/message-actions";
import { useRouter } from "next/navigation";

type Props = {
  initialMessages: PlayerMessage[];
  currentUserId: string;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MessagesList({
  initialMessages,
  currentUserId,
}: Props) {
  const [messages, setMessages] = useState<PlayerMessage[]>(initialMessages);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [pendingDeleteAll, setPendingDeleteAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const openMessage = messages.find((m) => m.id === openId);
  const hasRead = messages.some((m) => m.readAt);
  const unreadCount = messages.filter((m) => !m.readAt).length;

  const handleDelete = (messageId: string) => {
    setPendingDelete(messageId);
    startTransition(async () => {
      const result = await deleteMessage(messageId);
      setPendingDelete(null);
      if (result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        setOpenId((id) => (id === messageId ? null : id));
        router.refresh();
      }
    });
  };

  const handleDeleteAllRead = () => {
    setPendingDeleteAll(true);
    startTransition(async () => {
      const result = await deleteAllReadMessages(currentUserId);
      setPendingDeleteAll(false);
      if (result.success && result.deleted !== undefined) {
        setMessages((prev) => prev.filter((m) => !m.readAt));
        setOpenId(null);
        router.refresh();
      }
    });
  };

  const handleOpen = (msg: PlayerMessage) => {
    setOpenId(msg.id);
    if (!msg.readAt) {
      startTransition(async () => {
        await markMessageAsRead(msg.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m
          )
        );
        router.refresh();
      });
    }
  };

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-hero-border bg-background-card p-8 text-center">
        <Mail className="mx-auto h-12 w-12 text-gray-500" />
        <p className="font-libre text-gray-400 mt-4">Keine Nachrichten.</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block font-barlow font-bold text-sm uppercase text-hero-vibrant hover:text-accent-gold"
        >
          ← Zum Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hero-border bg-background-card p-4">
        <p className="font-libre text-sm text-gray-300">
          {unreadCount > 0 ? (
            <>
              <span className="text-accent-gold font-semibold">{unreadCount}</span>{" "}
              ungelesen
            </>
          ) : (
            "Alle gelesen"
          )}
        </p>
        {hasRead && (
          <button
            type="button"
            onClick={handleDeleteAllRead}
            disabled={isPending && pendingDeleteAll}
            className="flex items-center gap-2 rounded border border-hero-border bg-background-dark px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-400 hover:border-accent-blood hover:text-accent-blood disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Gelesene löschen
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`rounded-lg border bg-background-card transition-colors ${
              msg.readAt
                ? "border-hero-border/60"
                : "border-hero-vibrant/40 bg-hero-dark/10"
            }`}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="flex shrink-0 items-center pt-0.5">
                {!msg.readAt ? (
                  <Circle
                    className="h-3 w-3 fill-accent-gold text-accent-gold"
                    aria-hidden
                  />
                ) : (
                  <span className="h-3 w-3" />
                )}
              </div>
              <button
                type="button"
                onClick={() => handleOpen(msg)}
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className={`truncate font-barlow text-sm ${
                    msg.readAt
                      ? "font-semibold text-gray-300"
                      : "font-bold text-white"
                  }`}
                >
                  {msg.subject}
                </p>
                <p className="font-libre text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {msg.senderName}
                  {msg.campaignName && ` · ${msg.campaignName}`}
                  {" · "}
                  {formatDate(msg.createdAt)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(msg.id)}
                disabled={pendingDelete === msg.id}
                className="shrink-0 rounded p-2 text-gray-500 hover:bg-white/10 hover:text-accent-blood disabled:opacity-50"
                title="Nachricht löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-center pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 font-barlow font-bold text-xs uppercase text-gray-400 hover:text-hero-vibrant"
        >
          <Inbox className="h-4 w-4" />
          Zum Dashboard
        </Link>
      </div>

      {/* Detail-Modal */}
      {openMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-lg border border-hero-dark bg-background-card shadow-2xl"
            style={{
              backgroundImage: "url('/images/dark-marmor.webp')",
              backgroundSize: "cover",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenId(null)}
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
              <div className="mt-4 rounded-lg border border-hero-border/20 bg-background-dark p-4">
                <p className="font-libre text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {openMessage.content}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(openMessage.id)}
                  disabled={pendingDelete === openMessage.id}
                  className="flex items-center gap-2 rounded border border-hero-border px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-400 hover:border-accent-blood hover:text-accent-blood"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
