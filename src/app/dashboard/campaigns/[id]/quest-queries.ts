import { createClient } from "@/src/lib/supabase/server";

const PLAYER_MEMBER_STATUSES = [
  "Approved",
  "Active",
  "Drafting",
  "In_Review",
  "Changes_Proposed",
] as const;

export async function getQuests(campaignId: string, isGM: boolean = true) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  if (!isGM) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .in("status", [...PLAYER_MEMBER_STATUSES])
      .maybeSingle();
    if (!member) return [];
  }

  const { data: quests, error } = await (supabase.from("quests") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Quests Error:", error);
    console.error("Fehlerinhalt:", JSON.stringify(error, null, 2));
    return [];
  }

  const list = quests || [];
  if (!isGM) {
    return list.filter((q: { is_revealed?: boolean }) => q.is_revealed === true);
  }

  return list;
}
