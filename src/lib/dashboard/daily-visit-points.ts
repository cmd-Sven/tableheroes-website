import { tryCreateAdminClient } from "@/src/lib/supabase/server";
import { getBerlinDateKey } from "@/src/lib/datetime/berlin";

const PREF_KEY = "daily_visit_reward";
const POINTS = 5;

function readRewardDay(preferences: unknown): string | null {
  if (!preferences || typeof preferences !== "object") return null;
  const value = (preferences as Record<string, unknown>)[PREF_KEY];
  return typeof value === "string" ? value : null;
}

/** Schreibt einem Spieler einmal pro Berliner Kalendertag 5 Punkte für den Seitenaufruf gut. */
export async function awardDailyVisitPoints(
  userId: string,
  preferences: unknown,
): Promise<void> {
  const today = getBerlinDateKey(new Date());
  if (readRewardDay(preferences) === today) return;

  const admin = tryCreateAdminClient();
  if (!admin) return;

  const reason = `Täglicher Aufruf ${today}`;
  const { data: existing } = await (admin.from("points_log") as any)
    .select("id")
    .eq("user_id", userId)
    .eq("reason", reason)
    .limit(1);
  if (((existing as unknown[]) || []).length > 0) {
    const next =
      preferences && typeof preferences === "object"
        ? { ...(preferences as Record<string, unknown>) }
        : {};
    next[PREF_KEY] = today;
    await (admin.from("users") as any).update({ preferences: next }).eq("id", userId);
    return;
  }

  const { error } = await (admin as any).rpc("award_points_safe", {
    target_user_id: userId,
    points_amount: POINTS,
    award_reason: reason,
    awarded_by: userId,
    related_campaign_id: null,
    catalog_id: null,
  });
  if (error) {
    console.error("[awardDailyVisitPoints]", error.message);
    return;
  }

  const next =
    preferences && typeof preferences === "object"
      ? { ...(preferences as Record<string, unknown>) }
      : {};
  next[PREF_KEY] = today;
  await (admin.from("users") as any).update({ preferences: next }).eq("id", userId);
}
