"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BarChart3, Clock, Coins, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { voteCampaignPoll } from "@/src/lib/actions/poll-actions";
import type { CampaignPoll } from "@/src/lib/queries/poll-queries";
import { POLL_VOTE_POINTS } from "@/src/lib/queries/poll-queries";

type Props = {
  polls: CampaignPoll[];
};

function formatRemaining(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Abgelaufen";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `noch ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `noch ${days} Tag${days === 1 ? "" : "e"}`;
}

function PollVoteForm({ poll }: { poll: CampaignPoll }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(
    poll.userVoteOptionId ?? null
  );
  const [isPending, startTransition] = useTransition();

  const hasVoted = !!votedOptionId;

  function handleVote() {
    if (!selected || hasVoted) return;
    startTransition(async () => {
      const result = await voteCampaignPoll(poll.id, selected);
      if (result.success) {
        setVotedOptionId(selected);
        toast.success(
          `Danke für deine Stimme! +${result.pointsAwarded ?? POLL_VOTE_POINTS} TableHeroes-Punkte`
        );
      } else {
        toast.error(result.error ?? "Abstimmung fehlgeschlagen.");
      }
    });
  }

  if (hasVoted) {
    const chosen = poll.options.find((o) => o.id === votedOptionId);
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
      <div className="space-y-2">
        {poll.options.map((opt) => (
          <label
            key={opt.id}
            className={`flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors ${
              selected === opt.id
                ? "border-hero-vibrant bg-hero-vibrant/10"
                : "border-hero-border/40 bg-background-dark hover:border-hero-border"
            }`}
          >
            <input
              type="radio"
              name={`poll-${poll.id}`}
              value={opt.id}
              checked={selected === opt.id}
              onChange={() => setSelected(opt.id)}
              className="accent-hero-vibrant"
            />
            <span className="font-libre text-sm text-gray-200">{opt.label}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!selected || isPending}
        onClick={handleVote}
        className="w-full inline-flex items-center justify-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 disabled:opacity-40 transition-colors"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Coins className="h-4 w-4" />
            Abstimmen (+{poll.pointsPerVote} Pkt.)
          </>
        )}
      </button>
    </div>
  );
}

export function CampaignPollsCard({ polls }: Props) {
  const openPolls = polls.filter((p) => p.isOpen);
  const pendingVote = openPolls.filter((p) => !p.userVoteOptionId);

  if (openPolls.length === 0) {
    return (
      <p className="font-libre text-sm text-gray-500 px-4 py-3">
        Keine aktiven Umfragen in deinen Kampagnen.
      </p>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {pendingVote.length > 0 && (
        <p className="font-libre text-xs text-accent-gold">
          {pendingVote.length} offene{" "}
          {pendingVote.length === 1 ? "Umfrage" : "Umfragen"} — abstimmen und Punkte sammeln!
        </p>
      )}
      {openPolls.map((poll) => (
        <div
          key={poll.id}
          className="rounded-lg border border-hero-border/50 bg-background-dark/50 p-4 space-y-3"
        >
          <div className="space-y-1">
            {poll.campaignName && (
              <Link
                href={`/dashboard/campaigns/${poll.campaignId}?tab=polls`}
                className="font-barlow text-xs uppercase text-hero-vibrant hover:text-white transition-colors"
              >
                {poll.campaignName}
              </Link>
            )}
            <p className="font-barlow font-bold text-white flex items-start gap-2">
              <BarChart3 className="h-4 w-4 text-accent-gold shrink-0 mt-0.5" />
              {poll.question}
            </p>
            <p className="font-libre text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRemaining(poll.closesAt)}
            </p>
          </div>
          <PollVoteForm poll={poll} />
        </div>
      ))}
    </div>
  );
}
