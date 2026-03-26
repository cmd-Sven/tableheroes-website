import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { QuestForm } from "@/src/components/dashboard/campaigns/quests/QuestForm";
import { getQuestById } from "@/src/app/dashboard/campaigns/[id]/quest-actions";
import { getNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-queries";
import { getLoreEntries } from "@/src/app/dashboard/campaigns/[id]/lore-queries";
import { isLocationType } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string; questId: string }>;
};

export default async function EditQuestPage({ params }: Props) {
  const { id: campaignId, questId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user is GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) redirect("/dashboard");
  if (campaign.gm_id !== user.id) redirect(`/dashboard/campaigns/${campaignId}`);

  // 3. Load quest
  let quest;
  try {
    quest = await getQuestById(questId);
  } catch (error: any) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Quest nicht gefunden</h2>
          <p className="text-gray-400 mb-4">Diese Quest existiert nicht oder wurde gelöscht.</p>
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=quests`}
            className="text-hero-vibrant hover:underline"
          >
            &larr; Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // 4. Verify quest belongs to this campaign
  if ((quest as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 5. Load NPCs, Locations, and Members
  const npcs = await getNPCs(campaignId, user.id, true);
  const loreEntries = await getLoreEntries(campaignId);
  
  const locations = (loreEntries || [])
    .filter((entry: any) => isLocationType(entry.type))
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  const { data: membersRaw } = await (supabase.from("campaign_members") as any)
    .select(`
      id,
      character_id,
      users:user_id (username),
      characters:character_id (
        id,
        name,
        class,
        race,
        level,
        status
      )
    `)
    .eq("campaign_id", campaignId)
    .eq("status", "Accepted");

  const members = membersRaw as any[] | null;

  const mappedMembers = (members || []).map((m: any) => ({
    id: m.id,
    character_id: m.character_id,
    user: m.users ? { username: m.users.username } : null,
    character_data: m.characters || null,
  }));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link
          href={`/dashboard/campaigns/${campaignId}/quests/${questId}`}
          className="text-hero-vibrant hover:underline font-barlow font-bold uppercase text-sm"
        >
          &larr; Zurück zur Quest
        </Link>
      </div>
      <QuestForm
        campaignId={campaignId}
        initialData={quest as any}
        npcs={(npcs || []).map((npc: any) => ({
          id: npc.id,
          name: npc.name,
          title: npc.title || null,
          role: npc.role || null,
        }))}
        locations={locations}
        members={mappedMembers}
      />
    </div>
  );
}

