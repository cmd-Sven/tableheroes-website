"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Map as MapIcon, Users, Calendar, Radio, CalendarPlus, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { cancelSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import type { GmMyCampaignCardModel } from "@/src/app/dashboard/my-campaigns/gm-my-campaign-cards-data";

const MAX_PLAYER_NAMES = 5;

function canPlanSessions(campaignStatus: string | null): boolean {
  const s = String(campaignStatus ?? "Active").trim();
  return s !== "Archived";
}

export function GmMyCampaignCard({ model }: { model: GmMyCampaignCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const planOk = canPlanSessions(model.campaignStatus);
  const cancelTargetId = model.nextScheduled?.id ?? null;
  const canCancelNext =
    Boolean(cancelTargetId) && planOk;

  function handleCancelNext() {
    if (!cancelTargetId) return;
    const title = model.nextScheduled?.title?.trim() || "dieser Termin";
    if (!window.confirm(`Termin „${title}" wirklich absagen? Zugesagte Spieler werden per Nachricht informiert.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await cancelSession(cancelTargetId);
        toast.success("Termin wurde abgesagt.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Absage fehlgeschlagen.");
      }
    });
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-hero-border bg-background-card shadow-lg transition-colors hover:border-hero-vibrant">
      <Link
        href={`/dashboard/campaigns/${model.id}`}
        className="group block shrink-0"
      >
        {model.banner_url ? (
          <div className="relative h-32 w-full bg-hero-dark">
            <Image
              src={model.banner_url}
              alt=""
              fill
              className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
          </div>
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-hero-dark/50">
            <MapIcon className="h-10 w-10 text-hero-vibrant/50" />
          </div>
        )}
        <div className="border-b border-hero-border/40 p-4">
          <h3 className="mb-1 truncate font-cinzel font-bold text-lg text-white transition-colors group-hover:text-accent-gold">
            {model.name || "Unbenannt"}
          </h3>
          <p className="font-barlow text-xs font-bold uppercase text-gray-500">
            {model.system || "System offen"}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4 font-libre text-sm text-gray-200">
        <div className="flex gap-2">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
          <div className="min-w-0">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Spieler
            </p>
            {model.players.length === 0 ? (
              <p className="text-xs text-gray-500">Noch keine aktiven Charaktere.</p>
            ) : (
              <p className="leading-snug text-gray-300">
                {model.players.slice(0, MAX_PLAYER_NAMES).map((p) => p.name).join(", ")}
                {model.players.length > MAX_PLAYER_NAMES
                  ? ` +${model.players.length - MAX_PLAYER_NAMES} weitere`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {model.liveSessionId ? (
          <div className="rounded-lg border border-hero-vibrant/50 bg-hero-dark/40 p-3">
            <p className="mb-2 flex items-center gap-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              Session läuft
            </p>
            <Link
              href={`/session/${model.liveSessionId}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded border border-hero-border bg-background-dark px-3 py-2 font-barlow text-xs font-bold uppercase text-white transition-colors hover:border-hero-vibrant hover:bg-hero-dark"
            >
              Zur laufenden Session
            </Link>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
          <div className="min-w-0">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Nächste Session
            </p>
            {model.nextScheduled ? (
              <>
                <p className="font-barlow text-sm font-semibold text-white">
                  {model.nextScheduled.title?.trim() || "Termin"}
                </p>
                <p className="text-xs text-gray-400">
                  {model.nextScheduled.formattedDate} · {model.nextScheduled.formattedTime} Uhr
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Bestätigte Teilnehmer:{" "}
                  <span className="font-barlow font-bold text-accent-gold">
                    {model.nextScheduled.confirmedCount}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">Kein kommender Termin geplant.</p>
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-hero-border/30 pt-3 sm:flex-row sm:flex-wrap">
          {planOk ? (
            <Link
              href={`/dashboard/campaigns/${model.id}/schedule`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded border border-hero-border bg-background-dark px-3 py-2 font-barlow text-[11px] font-bold uppercase text-white transition-colors hover:border-hero-vibrant hover:bg-hero-dark sm:min-w-[9rem]"
            >
              <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Termin planen
            </Link>
          ) : null}
          {canCancelNext ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleCancelNext}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded border border-amber-900/70 bg-amber-950/40 px-3 py-2 font-barlow text-[11px] font-bold uppercase text-amber-100 transition-colors hover:bg-amber-950/70 disabled:opacity-50 sm:min-w-[9rem]"
            >
              <CalendarX className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Nächsten Termin absagen
            </button>
          ) : null}
        </div>

        <Link
          href={`/dashboard/campaigns/${model.id}`}
          className="text-center font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-white"
        >
          Kampagne öffnen →
        </Link>
      </div>
    </article>
  );
}
