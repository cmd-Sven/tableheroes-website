"use client";

import Link from "next/link";
import { Inbox, Mail } from "lucide-react";

export type InboxMessage = {
  id: string;
  subject: string;
  preview: string;
  fromName: string;
  fromRole?: "GM" | "Spieler";
  createdAt: string;
  campaignId?: string;
  campaignName?: string;
};

type Props = {
  messages: InboxMessage[];
  maxItems?: number;
};

export function MessageInbox({ messages, maxItems = 3 }: Props) {
  const displayMessages = messages.slice(0, maxItems);

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Inbox className="h-6 w-6 text-accent-gold" />
        Nachrichten
      </h2>
      {displayMessages.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="mx-auto h-10 w-10 text-gray-600" />
          <p className="font-libre text-gray-500 mt-2">Keine neuen Nachrichten.</p>
          <p className="font-libre text-sm text-gray-600 mt-1">
            Nachrichten von Spielleitern oder anderen Spielern erscheinen hier.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {displayMessages.map((msg) => (
            <li key={msg.id}>
              <Link
                href={msg.campaignId ? `/dashboard/campaigns/${msg.campaignId}` : "/dashboard"}
                className="block rounded-lg border border-hero-border/30 bg-hero-dark/20 p-3 hover:border-hero-border transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-barlow font-bold text-sm text-white truncate">{msg.subject}</p>
                  {msg.fromRole && (
                    <span
                      className={`shrink-0 text-xs font-barlow uppercase px-2 py-0.5 rounded ${
                        msg.fromRole === "GM"
                          ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
                          : "bg-hero-dark text-gray-400 border border-hero-border"
                      }`}
                    >
                      {msg.fromRole}
                    </span>
                  )}
                </div>
                <p className="font-libre text-xs text-gray-400 mt-1 line-clamp-2">{msg.preview}</p>
                <p className="font-libre text-xs text-gray-500 mt-2">
                  {msg.fromName}
                  {msg.campaignName && ` · ${msg.campaignName}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
