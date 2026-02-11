"use client";

import Image from "next/image";
import { Star, BookOpen, Crown } from "lucide-react";
import type { GuestbookEntry } from "@/src/lib/actions/support-actions";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= rating
              ? "fill-accent-gold text-accent-gold"
              : "fill-none text-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

type Props = {
  entries: GuestbookEntry[];
};

export function GuestbookList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10">
        <BookOpen className="mx-auto h-10 w-10 text-gray-600 mb-3" />
        <p className="font-cinzel font-bold text-lg text-accent-gold">
          Das Gästebuch ist noch leer
        </p>
        <p className="font-libre text-sm text-gray-500 mt-1">
          Sei der Erste, der eine Nachricht hinterlässt!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-accent-gold/15 bg-black/20 p-5 transition-all hover:border-accent-gold/30 hover:shadow-[0_0_12px_rgba(202,185,38,0.08)]"
        >
          {/* Header: Avatar + Name + Stars */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/50 ${
                entry.isBacker
                  ? "backer-border border-transparent"
                  : "border border-accent-gold/30"
              }`}
            >
              {entry.avatarUrl ? (
                <Image
                  src={entry.avatarUrl}
                  alt={entry.username}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-barlow font-bold text-sm text-accent-gold">
                  {entry.username[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-barlow font-bold text-sm text-white truncate">
                  {entry.username}
                </p>
                {entry.isBacker && (
                  <Crown className="h-3.5 w-3.5 text-accent-gold shrink-0" />
                )}
              </div>
              <StarRating rating={entry.rating} />
            </div>
          </div>

          {/* Comment */}
          <p className="font-libre text-sm text-gray-300 leading-relaxed mb-3">
            {entry.comment}
          </p>

          {/* Date */}
          <p className="font-barlow text-[10px] text-gray-600 uppercase">
            {formatDate(entry.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
