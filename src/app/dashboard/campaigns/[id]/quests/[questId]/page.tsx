import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QuestDetailPage } from "@/src/components/dashboard/campaigns/quests/QuestDetailPage";
import { getQuestById } from "@/src/app/dashboard/campaigns/[id]/quest-actions";
import { getNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { getLoreEntries } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { isLocationType } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string; questId: string }>;
};

export default async function QuestDetailPageRoute({ params }: Props) {
  const { id: campaignId, questId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user has access to campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) redirect("/dashboard");

  const isGM = campaign.gm_id === user.id;

  // 3. Check membership (if not GM)
  if (!isGM) {
    const { data: membershipRaw } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .single();

    // Expliziter Cast gegen 'never'
    const membership = membershipRaw as { status: string } | null;

    if (!membership || !["Accepted", "Drafting", "In_Review"].includes(membership.status)) {
      redirect("/dashboard");
    }
  }

  // 4. Fetch Quest
  let quest;
  try {
    quest = await getQuestById(questId);
  } catch (error: any) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Quest nicht gefunden</h2>
        <p className="text-gray-400 mb-4">Diese Quest existiert nicht oder wurde gelöscht.</p>
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=quests`}
          className="text-hero-vibrant hover:underline mt-4 inline-block"
        >
          &larr; Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  // 5. Verify quest belongs to this campaign
  if ((quest as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 6. Check visibility (for players)
  if (!isGM && !(quest as any).is_revealed) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=quests`);
  }

  // 7. Load NPCs and Locations for dropdowns
  const allNPCs = await getNPCs(campaignId, user.id, isGM);
  const loreEntries = await getLoreEntries(campaignId);
  
  // Filter locations (geographical types)
  const locations = (loreEntries || [])
    .filter((entry: any) => isLocationType(entry.type))
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  return (
    <QuestDetailPage
      quest={quest as any}
      campaignId={campaignId}
      isGM={isGM}
      npcs={(allNPCs || []).map((npc: any) => ({ id: npc.id, name: npc.name }))}
      locations={locations}
    />
  );
}

