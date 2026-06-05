import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { QuestForm } from "@/src/components/dashboard/campaigns/quests/QuestForm";
import { getNPCs } from "../../npc-queries";
import { getLoreEntries } from "../../lore-queries";
import { isLocationType } from "@/src/lib/lore-types";
import { parseChronicleImportFromSearchParams } from "@/src/lib/session-chronicle/inbox-import-urls";
import type { ChronicleImportRef } from "@/src/lib/session-chronicle/chronicle-import-types";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    quest_giver_id?: string;
    prefill_title?: string;
    prefill_description?: string;
    chronicle_session?: string;
    chronicle_kind?: string;
    chronicle_index?: string;
  }>;
};

function toChronicleImportRef(
  parsed: ReturnType<typeof parseChronicleImportFromSearchParams>,
): ChronicleImportRef | undefined {
  if (!parsed || parsed.chronicle_kind !== "quest") return undefined;
  return {
    sessionId: parsed.chronicle_session,
    kind: "quest",
    index: parsed.chronicle_index,
  };
}

export default async function CreateQuestPage({ params, searchParams }: Props) {
  const { id: campaignId } = await params;
  const search = await searchParams;
  const { quest_giver_id: questGiverIdFromQuery } = search;
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

  // 3. Load NPCs, Locations, and Members
  const npcs = await getNPCs(campaignId, user.id, true);
  const loreEntries = await getLoreEntries(campaignId);
  
  // Filter locations (geographical types)
  const locations = (loreEntries || [])
    .filter((entry: any) => isLocationType(entry.type))
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  // Load members with characters
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
    .eq("status", "Approved");

  const members = membersRaw as any[] | null;

  // Map members for QuestForm
  const mappedMembers = (members || []).map((m: any) => ({
    id: m.id,
    character_id: m.character_id,
    user: m.users ? { username: m.users.username } : null,
    character_data: m.characters || null,
  }));

  const chronicleImport = toChronicleImportRef(parseChronicleImportFromSearchParams(search));

  return (
    <div className="container mx-auto p-6">
      <QuestForm
        campaignId={campaignId}
        defaultQuestGiverId={questGiverIdFromQuery || undefined}
        defaultTitle={search.prefill_title?.trim() || undefined}
        defaultDescription={search.prefill_description?.trim() || undefined}
        chronicleImport={chronicleImport}
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



