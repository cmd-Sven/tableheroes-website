"use client";

import Link from "next/link";
import { BarChart3, Clock } from "lucide-react";
import type { CampaignPoll } from "@/src/lib/queries/poll-queries";
import { CampaignPollVoteForm } from "@/src/components/campaigns/CampaignPollVoteForm";

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

export function CampaignPollsCard({ polls }: Props) {
  const openPolls = polls.filter((p) => p.isOpen);
  const pendingVote = openPolls.filter((p) => !p.hasParticipated);

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
            <p className="font-libre text-xs text-gray-500 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRemaining(poll.closesAt)}
              </span>
              {poll.allowMultiple && <span>· Mehrfachauswahl</span>}
              {poll.allowFreeText && <span>· Freitext möglich</span>}
            </p>
          </div>
          <CampaignPollVoteForm poll={poll} showOtherResponses />
        </div>
      ))}
    </div>
  );
}
