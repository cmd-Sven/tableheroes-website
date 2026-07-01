import { createClient } from "@/src/lib/supabase/server";

/** Einzelne Bewerbung (wie vom Badge gezählt), mit Kampagne und Bewerber-Name. */
export type PendingApplicationRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string;
  application_message: string | null;
  created_at: string | null;
  campaigns: { id: string; name: string | null; gm_id: string } | null;
  users: { username: string | null } | null;
};

/**
 * Kein "use server" – für Server Components / Layout (nicht als Server Action aufrufen).
 */
export async function getPendingApplications(
  userId: string,
): Promise<PendingApplicationRow[]> {
  const supabase = await createClient();

  const { data: rows, error } = await (supabase.from("campaign_members") as any)
    .select(
      "id, campaign_id, user_id, status, application_message, created_at, campaigns!inner(id, name, gm_id), users:user_id(username)",
    )
    .eq("campaigns.gm_id", userId)
    .eq("status", "Applied")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPendingApplications]", error);
    return [];
  }

  return (Array.isArray(rows) ? rows : []) as PendingApplicationRow[];
}

export async function getPendingApplicationsCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: campaigns, error: campaignError } = await (supabase.from("campaigns") as any)
    .select("id")
    .eq("gm_id", userId);

  if (campaignError) {
    console.error("[getPendingApplicationsCount] campaigns:", campaignError);
    return 0;
  }

  const campaignIds = ((campaigns as { id: string }[]) || []).map((row) => row.id);
  if (campaignIds.length === 0) return 0;

  const { count, error } = await (supabase.from("campaign_members") as any)
    .select("id", { count: "exact", head: true })
    .in("campaign_id", campaignIds)
    .eq("status", "Applied");

  if (error) {
    console.error("[getPendingApplicationsCount]", error);
    return 0;
  }
  return count ?? 0;
}
