import { redirect, notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { loadPlayerCharacterViewForGm } from "@/src/app/dashboard/characters/player-character-load";
import { GmPlayerCharacterPreview } from "@/src/components/dashboard/campaigns/GmPlayerCharacterPreview";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; characterId: string }>;
};

export default async function GmPlayerCharacterViewPage({ params }: Props) {
  const { id: campaignId, characterId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const payload = await loadPlayerCharacterViewForGm(campaignId, characterId, user.id);
  if (!payload) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <GmPlayerCharacterPreview payload={payload} characterId={characterId} />
    </div>
  );
}
