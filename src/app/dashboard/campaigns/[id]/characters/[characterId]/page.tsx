import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import { GMCharacterEditorLoader } from "@/src/components/dashboard/campaigns/GMCharacterEditorLoader";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; characterId: string }>;
};

/**
 * Nur Auth + leichte Shell — Editor-Daten kommen per Server Action (loadGmCharacterEditorData),
 * damit keine große RSC-Flight-Payload die Produktion mit 500 killt.
 */
export default async function GMCharacterEditPage({ params }: Props) {
  const { id: campaignId, characterId } = await params;
  const { isGM, userId } = await getCampaignAccess(campaignId);

  if (!isGM) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}?tab=members`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Zurück zur Kampagne
      </Link>

      <GMCharacterEditorLoader
        campaignId={campaignId}
        characterId={characterId}
        currentUserId={userId}
      />
    </div>
  );
}
