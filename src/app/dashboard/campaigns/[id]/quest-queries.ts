import { createClient } from "@/src/lib/supabase/server";

export async function getQuests(campaignId: string) {
  const supabase = await createClient();

  const { data: quests, error } = await (supabase.from("quests") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Quests Error:", error);
    console.error("Fehlerinhalt:", JSON.stringify(error, null, 2));
    return [];
  }

  return quests || [];
}
