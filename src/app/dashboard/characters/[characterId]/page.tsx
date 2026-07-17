import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { MyCharacterSection } from "@/src/components/dashboard/player/MyCharacterSection";
import { loadPlayerCharacterEditor } from "../player-character-load";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ characterId: string }>;
};

export default async function PlayerCharacterDetailPage({ params }: Props) {
  const { characterId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const payload = await loadPlayerCharacterEditor(characterId, user.id);
  if (!payload) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/characters"
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Meine Charaktere
      </Link>

      {payload.isCampaignLinked ? (
        <div className="rounded-lg border border-hero-vibrant/40 bg-hero-vibrant/10 px-4 py-3">
          <p className="font-barlow text-sm font-bold uppercase text-hero-vibrant">
            Aktiver Held in „{payload.campaignName}“
          </p>
          <p className="mt-1 font-libre text-xs text-gray-400">
            Änderungen an diesem Charakter werden dem Spielleiter als Hinweis angezeigt.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-hero-border/40 bg-hero-dark/20 px-4 py-3">
          <p className="font-libre text-sm text-gray-400">
            Dieser Charakter ist derzeit nicht als aktiver Held in der Kampagne verknüpft.
          </p>
        </div>
      )}

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
      />
    </div>
  );
}
