import { createClient } from "@/src/lib/supabase/server";
import {
  getAchievementImageForName,
  ACHIEVEMENT_IMAGE_FILENAMES,
} from "@/src/lib/constants/achievements";

/** Lädt alle vom User errungenen Achievements (join user_achievements + achievements). hasNewContent: true, wenn das neueste Achievement jünger ist als last_achievement_view. newestAchievement: das zuletzt vergebene Achievement (für Gratulation-Modal). */
export async function getUserAchievements(userId: string): Promise<{
  achievements: {
    id: string;
    name: string;
    image_url?: string | null;
    points_awarded: number;
    description?: string | null;
  }[];
  hasNewContent: boolean;
  newestAchievement: {
    id: string;
    name: string;
    image_url?: string | null;
    points_awarded: number;
    description?: string | null;
  } | null;
}> {
  const supabase = await createClient();

  const userPromise = (supabase.from("users") as any)
    .select("last_achievement_view")
    .eq("id", userId)
    .maybeSingle();

  let dataRes = await (supabase.from("user_achievements") as any)
    .select(
      "achievement_id, awarded_at, achievements(id, name, icon, points_awarded, description)",
    )
    .eq("user_id", userId);

  const msg = (dataRes.error?.message ?? "").toLowerCase();
  if (
    dataRes.error &&
    (msg.includes("description") || msg.includes("schema cache"))
  ) {
    dataRes = await (supabase.from("user_achievements") as any)
      .select(
        "achievement_id, awarded_at, achievements(id, name, icon, points_awarded)",
      )
      .eq("user_id", userId);
  }

  const userRes = await userPromise;

  if (dataRes.error) {
    console.error("[getUserAchievements] Fehler beim Laden:", dataRes.error);
    return { achievements: [], hasNewContent: false, newestAchievement: null };
  }

  const list = Array.isArray(dataRes.data) ? dataRes.data : [];
  console.log(
    "[getUserAchievements] Raw data für User:",
    userId,
    "Anzahl Einträge:",
    list.length,
  );

  const lastView = (userRes.data as any)?.last_achievement_view ?? null;
  let newestAt: string | null = null;
  let newestRow: any = null;

  const achievements = list
    .map((row: any) => {
      const a = row.achievements ?? row.achievement;
      if (row.awarded_at) {
        if (!newestAt || new Date(row.awarded_at) > new Date(newestAt)) {
          newestAt = row.awarded_at;
          newestRow = row;
        }
      }
      return a;
    })
    .filter(Boolean)
    .map((a: any) => ({
      id: a.id,
      name: a.name,
      image_url:
        a.image_url ??
        a.icon ??
        (a.name &&
          (getAchievementImageForName(a.name) ??
            ACHIEVEMENT_IMAGE_FILENAMES[a.name] ??
            null)) ??
        null,
      points_awarded: Number(a.points_awarded) || 0,
      description: a.description ?? null,
    }));

  const hasNewContent = newestAt
    ? !lastView || new Date(newestAt) > new Date(lastView)
    : achievements.length > 0 && !lastView;

  const a = newestRow?.achievements ?? newestRow?.achievement;
  const newestAchievement =
    hasNewContent && a
      ? {
          id: a.id,
          name: a.name,
          image_url:
            a.image_url ??
            a.icon ??
            (a.name &&
              (getAchievementImageForName(a.name) ??
                ACHIEVEMENT_IMAGE_FILENAMES[a.name] ??
                null)) ??
            null,
          points_awarded: Number(a.points_awarded) || 0,
          description: a.description ?? null,
        }
      : null;

  console.log("[getUserAchievements] Ergebnis für User:", userId, {
    achievementsCount: achievements.length,
    hasNewContent,
    newestAt,
    lastView,
  });

  return { achievements: achievements ?? [], hasNewContent, newestAchievement };
}
