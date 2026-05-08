import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import { GMCharacterEditorLoader } from "@/src/components/dashboard/campaigns/GMCharacterEditorLoader";
import { toPlainJsonClone } from "@/src/lib/serialize-for-flight";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; characterId: string }>;
};

/**
 * Nur Auth + leichte Shell — Editor-Daten kommen per Server Action (loadGmCharacterEditorData).
 * Props an den Client nur als reine JSON-Strings (Holzhammer auf dem kleinen Props-Objekt).
 */
export default async function GMCharacterEditPage({ params }: Props) {
  try {
    const { id: campaignId, characterId } = await params;
    const { isGM, userId } = await getCampaignAccess(campaignId);

    if (!isGM) notFound();

    const shell = toPlainJsonClone({
      campaignId: String(campaignId),
      characterId: String(characterId),
      currentUserId: String(userId),
    });

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/dashboard/campaigns/${shell.campaignId}?tab=members`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Zurück zur Kampagne
        </Link>

        <GMCharacterEditorLoader
          campaignId={shell.campaignId}
          characterId={shell.characterId}
          currentUserId={shell.currentUserId}
        />
      </div>
    );
  } catch (error) {
    console.error("FATAL ERROR LOAD CHARACTER:", error);
    throw error;
  }
}
