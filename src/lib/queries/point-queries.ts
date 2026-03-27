import { createClient } from "@/src/lib/supabase/server";
import type { PointLogEntry } from "@/src/lib/types/point-log";

export async function getPointsLog(
  userId: string,
  limit = 10,
): Promise<PointLogEntry[]> {
  const supabase = await createClient();

  console.log("[getPointsLog] Lade Historie für User:", userId, "Limit:", limit);

  const { data, error } = await (supabase.from("points_log") as any)
    .select(
      "id, user_id, amount, reason, created_at, created_by, users:created_by ( username )",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getPointsLog] Fehler beim Laden:", error);
    return [];
  }

  const result = ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    amount: row.amount ?? 0,
    reason: row.reason ?? "",
    createdAt: row.created_at,
    grantedBy: row.created_by ?? null,
    grantedByName: (row.users as any)?.username ?? null,
    catalogItemId: row.catalog_item_id ?? null,
  }));

  console.log(
    "[getPointsLog] Ergebnis für User:",
    userId,
    "Anzahl:",
    result.length,
    "Daten:",
    result,
  );

  return result;
}
