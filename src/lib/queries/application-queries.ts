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
    .in("status", ["Applied", "Pending"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPendingApplications]", error);
    return [];
  }

  return (Array.isArray(rows) ? rows : []) as PendingApplicationRow[];
}

export async function getPendingApplicationsCount(userId: string): Promise<number> {
  const list = await getPendingApplications(userId);
  return list.length;
}
