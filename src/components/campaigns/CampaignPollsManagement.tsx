"use client";

import { useState, useTransition } from "react";
import {
  BarChart3,
  Plus,
  Minus,
  Loader2,
  Send,
  XCircle,
  Clock,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCampaignPoll,
  publishCampaignPoll,
  closeCampaignPoll,
  type PollDurationPreset,
} from "@/src/lib/actions/poll-actions";
import type { CampaignPoll } from "@/src/lib/queries/poll-queries";
import { POLL_VOTE_POINTS } from "@/src/lib/constants/poll";

type Props = {
  campaignId: string;
  polls: CampaignPoll[];
};

const DURATION_OPTIONS: { value: PollDurationPreset; label: string }[] = [
  { value: "24h", label: "24 Stunden" },
  { value: "48h", label: "48 Stunden" },
  { value: "72h", label: "3 Tage" },
  { value: "7d", label: "7 Tage" },
  { value: "14d", label: "14 Tage" },
];

function formatClosesAt(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(poll: CampaignPoll): string {
  if (poll.status === "draft") return "Entwurf";
  if (poll.status === "closed") return "Beendet";
  if (poll.isOpen) return "Aktiv";
  return "Abgelaufen";
}

function statusClass(poll: CampaignPoll): string {
  if (poll.status === "draft") return "bg-gray-700/50 text-gray-300";
  if (poll.status === "closed") return "bg-red-900/40 text-red-300";
  if (poll.isOpen) return "bg-green-900/40 text-green-300";
  return "bg-amber-900/40 text-amber-300";
}

export function CampaignPollsManagement({ campaignId, polls }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [duration, setDuration] = useState<PollDurationPreset>("48h");
  const [isPending, startTransition] = useTransition();
  const [actionPollId, setActionPollId] = useState<string | null>(null);

  function addOption() {
    if (options.length >= 8) return;
    setOptions([...options, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  }

  function handleCreate(publishImmediately: boolean) {
    startTransition(async () => {
      const result = await createCampaignPoll(
        campaignId,
        question,
        options,
        duration,
        publishImmediately
      );
      if (result.success) {
        toast.success(
          publishImmediately
            ? "Umfrage veröffentlicht! Spieler sehen sie im Dashboard."
            : "Umfrage als Entwurf gespeichert."
        );
        setQuestion("");
        setOptions(["", ""]);
        setDuration("48h");
        setShowForm(false);
        window.location.reload();
      } else {
        toast.error(result.error ?? "Fehler beim Erstellen.");
      }
    });
  }

  function handlePublish(pollId: string) {
    setActionPollId(pollId);
    startTransition(async () => {
      const result = await publishCampaignPoll(pollId, campaignId);
      setActionPollId(null);
      if (result.success) {
        toast.success("Umfrage veröffentlicht!");
        window.location.reload();
      } else {
        toast.error(result.error ?? "Veröffentlichung fehlgeschlagen.");
      }
    });
  }

  function handleClose(pollId: string) {
    setActionPollId(pollId);
    startTransition(async () => {
      const result = await closeCampaignPoll(pollId, campaignId);
      setActionPollId(null);
      if (result.success) {
        toast.success("Umfrage beendet.");
        window.location.reload();
      } else {
        toast.error(result.error ?? "Beenden fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-barlow font-bold text-xl text-white uppercase border-b border-hero-dark pb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-gold" />
            Kampagnen-Umfragen
          </h2>
          <p className="font-libre text-sm text-gray-400 mt-2">
            Erstelle Umfragen für deine Spieler. Jede Abstimmung bringt{" "}
            <span className="text-accent-gold font-semibold">{POLL_VOTE_POINTS} Punkte</span>.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neue Umfrage
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-hero-vibrant/40 bg-background-card p-6 space-y-5">
          <h3 className="font-barlow font-bold text-lg text-hero-vibrant uppercase">
            Umfrage erstellen
          </h3>

          <div>
            <label className="block font-barlow text-xs uppercase text-gray-400 mb-1">
              Frage
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="z. B. Welcher Spieltag passt euch am besten?"
              className="w-full rounded border border-hero-border bg-background-dark px-4 py-2 font-libre text-white placeholder:text-gray-500 focus:border-hero-vibrant focus:outline-none"
              maxLength={300}
            />
          </div>

          <div>
            <label className="block font-barlow text-xs uppercase text-gray-400 mb-2">
              Antwortmöglichkeiten
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded border border-hero-border bg-background-dark px-4 py-2 font-libre text-white placeholder:text-gray-500 focus:border-hero-vibrant focus:outline-none"
                    maxLength={120}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="rounded border border-hero-border p-2 text-gray-400 hover:text-red-400 hover:border-red-700 transition-colors"
                      aria-label="Option entfernen"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 inline-flex items-center gap-1 font-libre text-sm text-hero-vibrant hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                Option hinzufügen
              </button>
            )}
          </div>

          <div>
            <label className="block font-barlow text-xs uppercase text-gray-400 mb-1">
              Laufzeit
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as PollDurationPreset)}
              className="w-full rounded border border-hero-border bg-background-dark px-4 py-2 font-libre text-white focus:border-hero-vibrant focus:outline-none"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCreate(true)}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-5 py-2.5 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Erstellen & veröffentlichen
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCreate(false)}
              className="inline-flex items-center gap-2 rounded border border-hero-border px-5 py-2.5 font-barlow font-bold uppercase text-sm text-gray-200 hover:bg-hero-dark disabled:opacity-50 transition-colors"
            >
              Als Entwurf speichern
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="font-libre text-sm text-gray-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {polls.length === 0 && !showForm && (
        <div className="rounded-lg border border-hero-dark bg-background-card p-8 text-center">
          <BarChart3 className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="font-libre text-gray-400">
            Noch keine Umfragen. Erstelle die erste Umfrage für deine Spieler.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {polls.map((poll) => {
          const total = poll.totalVotes ?? 0;
          const busy = isPending && actionPollId === poll.id;

          return (
            <div
              key={poll.id}
              className="rounded-lg border border-hero-dark bg-background-card p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-barlow font-bold uppercase ${statusClass(poll)}`}
                    >
                      {statusLabel(poll)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 font-libre">
                      <Clock className="h-3 w-3" />
                      bis {formatClosesAt(poll.closesAt)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-accent-gold font-libre">
                      <Coins className="h-3 w-3" />
                      {poll.pointsPerVote} Pkt./Stimme
                    </span>
                  </div>
                  <p className="font-barlow font-bold text-lg text-white">
                    {poll.question}
                  </p>
                  <p className="font-libre text-sm text-gray-500">
                    {total} {total === 1 ? "Stimme" : "Stimmen"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {poll.status === "draft" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePublish(poll.id)}
                      className="inline-flex items-center gap-1 rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-xs text-black hover:bg-yellow-500 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Veröffentlichen
                    </button>
                  )}
                  {(poll.status === "draft" || poll.isOpen) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleClose(poll.id)}
                      className="inline-flex items-center gap-1 rounded border border-red-800/60 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Beenden
                    </button>
                  )}
                </div>
              </div>

              {poll.options.length > 0 && (
                <div className="space-y-2">
                  {poll.options.map((opt) => {
                    const count = opt.voteCount ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={opt.id} className="space-y-1">
                        <div className="flex justify-between text-sm font-libre">
                          <span className="text-gray-300">{opt.label}</span>
                          <span className="text-gray-500">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-background-dark overflow-hidden">
                          <div
                            className="h-full rounded-full bg-hero-vibrant/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
