"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ACHIEVEMENT_IMAGE_FILENAMES } from "@/src/lib/constants/achievements";
import fs from "fs";
import path from "path";

/** Ordner für GM-Achievement-Bilder (Dropdown). Frontend-Pfad: /images/achievement/ */
const ACHIEVEMENT_IMAGE_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "achievement"
);

const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

/**
 * Scannt den Ordner public/images/achievement/ und gibt alle Bild-Dateinamen zurück.
 * Wird für das GM-Achievement-Formular (Dropdown) genutzt.
 */
export async function getAchievementImageFilenames(): Promise<string[]> {
  try {
    if (!fs.existsSync(ACHIEVEMENT_IMAGE_DIR)) {
      return [];
    }
    const entries = fs.readdirSync(ACHIEVEMENT_IMAGE_DIR, {
      withFileTypes: true,
    });
    const filenames = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const lower = name.toLowerCase();
        return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      })
      .sort((a, b) => a.localeCompare(b));
    return filenames;
  } catch {
    return [];
  }
}

/**
 * Verleiht ein Achievement an einen User (falls noch nicht vorhanden).
 * Trägt in user_achievements ein und addiert points_awarded zum total_points des Users.
 */
export async function awardAchievement(
  userId: string,
  achievementName: string
): Promise<{ awarded: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: achievement, error: achErr } = await (
    supabase.from("achievements") as any
  )
    .select("id, points_awarded")
    .eq("name", achievementName)
    .maybeSingle();

  if (achErr || !achievement) {
    return { awarded: false, error: "Achievement nicht gefunden." };
  }

  const { data: existing } = await (supabase.from("user_achievements") as any)
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", achievement.id)
    .maybeSingle();

  if (existing) {
    return { awarded: false };
  }

  const { error: insertErr } = await (
    supabase.from("user_achievements") as any
  ).insert({
    user_id: userId,
    achievement_id: achievement.id,
  });

  if (insertErr) {
    return { awarded: false, error: insertErr.message };
  }

  const points = Number(achievement.points_awarded) || 0;
  if (points > 0) {
    const { data: userRow } = await (supabase.from("users") as any)
      .select("total_points")
      .eq("id", userId)
      .single();
    const current = Number((userRow as any)?.total_points) || 0;
    await (supabase.from("users") as any)
      .update({ total_points: current + points })
      .eq("id", userId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/achievements");
  revalidatePath("/dashboard/settings");
  revalidatePath("/profile/[username]", "page");
  return { awarded: true };
}

/** GM: Verleiht ein Achievement an einen Spieler (manuell). */
export async function awardAchievementAsGm(
  targetUserId: string,
  achievementName: string,
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    return { success: false, error: "Nur der GM kann Achievements verleihen." };
  }

  const result = await awardAchievement(targetUserId, achievementName);
  if (result.error) return { success: false, error: result.error };
  return { success: true };
}

/**
 * GM: Erstellt ein benutzerdefiniertes Achievement.
 * icon wird nur als Dateiname gespeichert (z. B. "gold_coin.png"); der Pfad wird beim Rendern ergänzt.
 */
export async function createCustomAchievement(
  name: string,
  pointsAwarded: number,
  description: string | null,
  icon: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const trimmedName = name?.trim();
  if (!trimmedName) return { success: false, error: "Name ist erforderlich." };

  const points = Number(pointsAwarded);
  if (Number.isNaN(points) || points < 0) {
    return { success: false, error: "Punkte müssen eine Zahl ≥ 0 sein." };
  }

  // Nur Dateiname speichern (kein Pfad)
  const iconFilename = icon?.trim()
    ? icon.replace(/^.*[\\/]/, "").trim()
    : null;

  const { error } = await (supabase.from("achievements") as any).insert({
    name: trimmedName,
    points_awarded: points,
    description: description?.trim() || null,
    icon: iconFilename,
    is_custom: true,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "Ein Achievement mit diesem Namen existiert bereits.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/gm/achievements");
  revalidatePath("/dashboard/achievements");
  revalidatePath("/dashboard/campaigns/[id]", "page");
  return { success: true };
}

/** Lädt alle Achievements (für GM-Modal). Global, ohne campaign_id-Filter. */
export async function getAllAchievements(): Promise<
  {
    id: string;
    name: string;
    points_awarded: number;
    image_url?: string | null;
    description?: string | null;
    is_custom?: boolean;
  }[]
> {
  const supabase = await createClient();

  // Zuerst mit allen Spalten versuchen (nach Migration: description, is_custom)
  const { data: dataFull, error: errorFull } = await (
    supabase.from("achievements") as any
  )
    .select("id, name, points_awarded, icon, description, is_custom")
    .order("name");

  if (!errorFull && dataFull != null) {
    const rows = (dataFull as any[]) || [];
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      points_awarded: Number(r.points_awarded) ?? 0,
      image_url: r.icon ?? ACHIEVEMENT_IMAGE_FILENAMES[r.name] ?? null,
      description: r.description ?? null,
      is_custom: Boolean(r.is_custom),
    }));
  }

  // Fallback: Nur Spalten aus der Basis-Migration (ohne description, is_custom)
  const { data, error } = await (supabase.from("achievements") as any)
    .select("id, name, points_awarded, icon")
    .order("name");

  if (error) return [];
  const rows = (data as any[]) || [];
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    points_awarded: Number(r.points_awarded) ?? 0,
    image_url: r.icon ?? ACHIEVEMENT_IMAGE_FILENAMES[r.name] ?? null,
    description: null,
    is_custom: false,
  }));
}

/** Lädt alle vom User errungenen Achievements (join user_achievements + achievements). hasNewContent: true, wenn das neueste Achievement jünger ist als last_achievement_view. */
export async function getUserAchievements(userId: string): Promise<{
  achievements: {
    id: string;
    name: string;
    image_url?: string | null;
    points_awarded: number;
  }[];
  hasNewContent: boolean;
}> {
  const supabase = await createClient();
  const [userRes, dataRes] = await Promise.all([
    (supabase.from("users") as any)
      .select("last_achievement_view")
      .eq("id", userId)
      .maybeSingle(),
    (supabase.from("user_achievements") as any)
      .select(
        "achievement_id, created_at, achievements(id, name, image_url, icon, points_awarded)"
      )
      .eq("user_id", userId),
  ]);
  if (dataRes.error) return { achievements: [], hasNewContent: false };
  const list = Array.isArray(dataRes.data) ? dataRes.data : [];
  const lastView = (userRes.data as any)?.last_achievement_view ?? null;
  let newestAt: string | null = null;
  const achievements = list
    .map((row: any) => {
      const a = row.achievements ?? row.achievement;
      if (row.created_at) {
        if (!newestAt || new Date(row.created_at) > new Date(newestAt))
          newestAt = row.created_at;
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
        (a.name && ACHIEVEMENT_IMAGE_FILENAMES[a.name]) ??
        null,
      points_awarded: Number(a.points_awarded) || 0,
    }));
  const hasNewContent = newestAt
    ? !lastView || new Date(newestAt) > new Date(lastView)
    : achievements.length > 0 && !lastView;
  return { achievements: achievements ?? [], hasNewContent };
}
