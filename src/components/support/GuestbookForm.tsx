"use client";

import { useState, useTransition } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { addGuestbookEntry } from "@/src/lib/actions/support-actions";

export function GuestbookForm() {
  const [rating, setRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await addGuestbookEntry(rating, comment);
      if (result.success) {
        setSuccessMessage(
          (result.pointsAwarded ?? 0) > 0
            ? `Danke für deine Nachricht! Dir wurden einmalig ${result.pointsAwarded} Punkte gutgeschrieben.`
            : "Danke für deine Nachricht!",
        );
        setComment("");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error ?? "Etwas ist schiefgelaufen.");
      }
    });
  }

  const displayRating = hoveredStar ?? rating;

  return (
    <div className="rounded-lg border border-accent-gold/20 bg-black/30 p-6 space-y-4">
      <h3 className="font-cinzel font-bold text-lg text-accent-gold">
        Deine Bewertung abgeben
      </h3>
      <p className="font-libre text-sm text-gray-400 leading-relaxed">
        Schreib einen passenden Kommentar, vergib Sterne – und erhalte einmalig{" "}
        <strong className="text-accent-gold">100 Punkte</strong> auf dein Konto.
      </p>

      {/* Stars */}
      <div>
        <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-2">
          Deine Bewertung
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHoveredStar(s)}
              onMouseLeave={() => setHoveredStar(null)}
              onClick={() => setRating(s)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${s} Stern${s > 1 ? "e" : ""}`}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  s <= displayRating
                    ? "fill-accent-gold text-accent-gold"
                    : "fill-none text-gray-600"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 font-barlow text-sm text-gray-400">
            {displayRating}/5
          </span>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block font-barlow font-bold text-xs uppercase text-gray-500 mb-1.5">
          Nachricht
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Was gefällt dir an Table Heroes? Was können wir verbessern?"
          className="w-full rounded border border-hero-dark bg-slate-900 p-2.5 font-libre text-sm text-white placeholder-gray-600 outline-none resize-none transition-colors focus:border-accent-gold"
        />
        <p className="mt-1 text-right font-barlow text-[10px] text-gray-600">
          {comment.length}/500
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded border border-red-900/50 bg-red-950/20 px-3 py-2">
          <p className="font-barlow font-bold text-xs text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded border border-hero-border/50 bg-hero-vibrant/10 px-3 py-2">
          <p className="font-barlow font-bold text-xs text-hero-vibrant">
            {successMessage}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || comment.trim().length < 3}
        className="inline-flex items-center gap-2 rounded-md border border-accent-gold/40 bg-accent-gold/10 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-accent-gold transition-all hover:bg-accent-gold/20 hover:border-accent-gold/60 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Absenden
      </button>
    </div>
  );
}
