"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowLeft, Bell, Loader2, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { MyCharacterSection } from "@/src/components/dashboard/player/MyCharacterSection";
import type { PlayerCharacterEditorPayload } from "@/src/app/dashboard/characters/player-character-load";
import { simulatePlayerEditAlertForGm } from "@/src/app/dashboard/campaigns/[id]/characters/player-character-gm-actions";

type Props = {
  payload: PlayerCharacterEditorPayload;
  characterId: string;
};

export function GmPlayerCharacterPreview({ payload, characterId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const gmEditorHref = `/dashboard/campaigns/${payload.campaignId}/characters/${characterId}`;
  const gmInboxHref = `/dashboard/campaigns/${payload.campaignId}/gm-inbox`;

  const handleSimulateAlert = () => {
    startTransition(async () => {
      const result = await simulatePlayerEditAlertForGm(payload.campaignId, characterId);
      if (!result.success) {
        toast.error(result.error ?? "Hinweis konnte nicht erzeugt werden.");
        return;
      }
      toast.success("Test-Hinweis in der GM Inbox erstellt.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/dashboard/campaigns/${payload.campaignId}?tab=members`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Mitgliedern
        </Link>
        <Link
          href={gmEditorHref}
          className="inline-flex items-center gap-2 rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-300 hover:text-white"
        >
          <Settings className="h-3.5 w-3.5" />
          GM-Bearbeitung
        </Link>
        <Link
          href={gmInboxHref}
          className="inline-flex items-center gap-2 rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-300 hover:text-white"
        >
          GM Inbox
        </Link>
      </div>

      <div className="rounded-lg border border-amber-700/50 bg-amber-950/25 px-4 py-4 space-y-3">
        <p className="font-barlow text-sm font-bold uppercase text-amber-200 flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          GM-Vorschau: Spieler-Ansicht
        </p>
        <p className="font-libre text-sm text-gray-300">
          Du siehst den Charakter von{" "}
          <strong className="text-white">{payload.playerUsername ?? "Spieler"}</strong> so, wie er
          ihn unter „Meine Charaktere“ sieht. Das D&amp;D-5e-Datenblatt kannst du hier bearbeiten
          und speichern (als GM). Profil-Stammdaten änderst du über die GM-Bearbeitung.
        </p>
        <p className="font-libre text-xs text-gray-500">
          GM-Hinweise in der Inbox entstehen normalerweise nur, wenn der Spieler selbst speichert.
          Zum Testen kannst du einen Hinweis simulieren:
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSimulateAlert}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase text-black hover:bg-yellow-500 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          Test-Hinweis in GM Inbox
        </button>
      </div>

      <MyCharacterSection
        campaignId={payload.campaignId}
        character={payload.character as any}
        cultures={payload.cultures}
        races={payload.races}
        languages={payload.languages}
        religions={payload.religions}
        factions={payload.factions}
        locations={payload.locations}
        factionReputations={payload.factionReputations}
        progressionLocked={payload.progressionLocked}
        progressionLockMessage={payload.progressionLockMessage}
        campaignSystem={payload.campaignSystem}
        gmPreviewMode
        gmEditorHref={gmEditorHref}
      />
    </div>
  );
}
