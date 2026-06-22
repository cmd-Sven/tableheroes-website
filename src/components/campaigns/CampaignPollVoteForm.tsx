"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { submitCampaignPollResponse } from "@/src/lib/actions/poll-actions";
import type { CampaignPoll } from "@/src/lib/queries/poll-queries";
import {
  MAX_POLL_FREE_TEXT_LENGTH,
  POLL_VOTE_POINTS,
} from "@/src/lib/constants/poll";

type Props = {
  poll: CampaignPoll;
  showOtherResponses?: boolean;
  onSubmitted?: () => void;
};

export function PollTextResponsesList({
  responses,
  title = "Eigene Antworten der Spieler",
}: {
  responses: NonNullable<CampaignPoll["textResponses"]>;
  title?: string;
}) {
  if (responses.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-hero-border/30">
      <p className="font-barlow text-xs uppercase text-gray-500 flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        {title}
      </p>
      <div className="space-y-2">
        {responses.map((r) => (
          <div
            key={r.userId}
            className={`rounded border px-3 py-2 ${
              r.isOwn
                ? "border-hero-vibrant/40 bg-hero-vibrant/5"
                : "border-hero-border/40 bg-background-dark"
            }`}
          >
            <p className="font-barlow text-xs uppercase text-hero-vibrant">
              {r.isOwn ? "Deine Antwort" : r.username}
            </p>
            <p className="font-libre text-sm text-gray-200 mt-0.5 whitespace-pre-wrap">
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CampaignPollVoteForm({
  poll,
  showOtherResponses = true,
  onSubmitted,
}: Props) {
  const [selected, setSelected] = useState<string[]>(poll.userVoteOptionIds ?? []);
  const [freeText, setFreeText] = useState(poll.userFreeText ?? "");
  const [submitted, setSubmitted] = useState(poll.hasParticipated ?? false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const otherResponses =
    poll.textResponses?.filter((r) => !r.isOwn) ?? [];

  function toggleOption(optionId: string) {
    if (poll.allowMultiple) {
      setSelected((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    } else {
      setSelected([optionId]);
    }
  }

  function canSubmit(): boolean {
    const hasOptions = selected.length > 0;
    const hasText = poll.allowFreeText && freeText.trim().length > 0;
    return hasOptions || hasText;
  }

  function handleSubmit() {
    if (!canSubmit()) return;
    startTransition(async () => {
      const result = await submitCampaignPollResponse(
        poll.id,
        selected,
        poll.allowFreeText ? freeText : undefined,
      );
      if (result.success) {
        setSubmitted(true);
        if (result.pointsAwarded) {
          toast.success(
            `Danke für deine Teilnahme! +${result.pointsAwarded} TableHeroes-Punkte`,
          );
        } else {
          toast.success("Antwort gespeichert!");
        }
        onSubmitted?.();
        router.refresh();
      } else {
        toast.error(result.error ?? "Abstimmung fehlgeschlagen.");
      }
    });
  }

  if (submitted && !poll.allowMultiple && !poll.allowFreeText) {
    const chosen = poll.options.find((o) => selected.includes(o.id));
    return (
      <div className="rounded border border-green-800/40 bg-green-950/20 p-3 flex items-start gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-libre text-sm text-green-300">
            Du hast abgestimmt:{" "}
            <span className="font-semibold">{chosen?.label ?? "—"}</span>
          </p>
          <p className="font-libre text-xs text-gray-500 mt-1">
            +{poll.pointsPerVote} Punkte auf dein Konto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {poll.allowMultiple && (
        <p className="font-libre text-xs text-gray-500">
          Mehrfachauswahl möglich
        </p>
      )}

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors ${
                isSelected
                  ? "border-hero-vibrant bg-hero-vibrant/10"
                  : "border-hero-border/40 bg-background-dark hover:border-hero-border"
              }`}
            >
              <input
                type={poll.allowMultiple ? "checkbox" : "radio"}
                name={`poll-${poll.id}`}
                value={opt.id}
                checked={isSelected}
                onChange={() => toggleOption(opt.id)}
                className="accent-hero-vibrant"
              />
              <span className="font-libre text-sm text-gray-200">{opt.label}</span>
            </label>
          );
        })}
      </div>

      {poll.allowFreeText && (
        <div>
          <label className="block font-barlow text-xs uppercase text-gray-500 mb-1">
            Eigene Antwort (optional)
          </label>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Schreib hier deine eigene Antwort …"
            maxLength={MAX_POLL_FREE_TEXT_LENGTH}
            rows={3}
            className="w-full rounded border border-hero-border bg-background-dark px-3 py-2 font-libre text-sm text-white placeholder:text-gray-500 focus:border-hero-vibrant focus:outline-none resize-y"
          />
          <p className="font-libre text-xs text-gray-600 mt-1 text-right">
            {freeText.length}/{MAX_POLL_FREE_TEXT_LENGTH}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit() || isPending}
        onClick={handleSubmit}
        className="w-full inline-flex items-center justify-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 disabled:opacity-40 transition-colors"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Coins className="h-4 w-4" />
            {submitted ? "Antwort aktualisieren" : `Abstimmen (+${poll.pointsPerVote ?? POLL_VOTE_POINTS} Pkt.)`}
          </>
        )}
      </button>

      {showOtherResponses && otherResponses.length > 0 && (
        <PollTextResponsesList responses={otherResponses} />
      )}

      {submitted && poll.allowFreeText && freeText.trim() && (
        <p className="font-libre text-xs text-green-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Deine Antwort wurde gespeichert
        </p>
      )}
    </div>
  );
}
