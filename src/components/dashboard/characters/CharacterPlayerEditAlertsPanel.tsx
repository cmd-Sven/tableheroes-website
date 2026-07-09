"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eye, EyeOff, Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import type { CharacterPlayerEditAlert } from "@/src/lib/characters/player-character-edit-alerts";
import {
  dismissCharacterPlayerEditAlert,
  markCharacterPlayerEditReviewed,
} from "@/src/lib/characters/player-character-edit-alerts";

type Props = {
  alerts: CharacterPlayerEditAlert[];
  campaignId?: string;
};

export function CharacterPlayerEditAlertsPanel({ alerts, campaignId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (alerts.length === 0) return null;

  const handleDismiss = (alertId: string) => {
    startTransition(async () => {
      const result = await dismissCharacterPlayerEditAlert(alertId);
      if (!result.success) {
        toast.error(result.error ?? "Konnte nicht ignoriert werden.");
        return;
      }
      toast.success("Hinweis ignoriert.");
      router.refresh();
    });
  };

  const handleReview = (alert: CharacterPlayerEditAlert) => {
    startTransition(async () => {
      const result = await markCharacterPlayerEditReviewed(alert.id);
      if (!result.success) {
        toast.error(result.error ?? "Fehler beim Markieren.");
        return;
      }
      router.push(
        `/dashboard/campaigns/${alert.campaignId}/characters/${alert.characterId}`,
      );
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 flex items-center gap-2">
        <ScrollText className="h-6 w-6" />
        Charakter-Änderungen durch Spieler
      </h2>
      <p className="font-libre text-sm text-gray-500">
        Spieler haben Daten an kampagnenaktiven Charakteren geändert. Du kannst
        nachprüfen oder den Hinweis ignorieren.
      </p>
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <p className="font-barlow font-bold text-white uppercase">
                {alert.characterName}
              </p>
              <p className="font-libre text-sm text-gray-400 mt-1">
                {alert.playerUsername ?? "Spieler"} · {alert.campaignName}
              </p>
              <p className="font-libre text-xs text-gray-500 mt-1">
                {alert.editSummary ?? "Charakter bearbeitet"} ·{" "}
                {new Date(alert.editedAt).toLocaleString("de-DE")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleReview(alert)}
                className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-black hover:bg-yellow-500 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                Nachprüfen
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDismiss(alert.id)}
                className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-300 hover:bg-hero-dark/50 disabled:opacity-50"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Ignorieren
              </button>
              {!campaignId ? (
                <Link
                  href={`/dashboard/campaigns/${alert.campaignId}/gm-inbox`}
                  className="font-libre text-xs text-hero-vibrant hover:text-white"
                >
                  Kampagne →
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
