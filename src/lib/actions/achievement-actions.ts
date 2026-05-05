"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  getAchievementImageForName,
  ACHIEVEMENT_IMAGE_FILENAMES,
} from "@/src/lib/constants/achievements";
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

async function awardPointsSafe(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    targetUserId: string;
    amount: number;
    reason: string;
    awardedBy: string | null;
    campaignId?: string | null;
    catalogId?: string | null;
  },
): Promise<{ newTotal: number | null; error?: string }> {
  const { data, error } = await (supabase as any).rpc("award_points_safe", {
    target_user_id: args.targetUserId,
    points_amount: args.amount,
    award_reason: args.reason,
    awarded_by: args.awardedBy,
    related_campaign_id: args.campaignId ?? null,
    catalog_id: args.catalogId ?? null,
  });

  if (error) return { newTotal: null, error: error.message };
  return { newTotal: typeof data === "number" ? data : Number(data) };
}

/** PostgREST meldet fehlende Spalten oft so (Schema-Cache), bevor RLS greift. */
function isAchievementsColumnSchemaError(err: { message?: string } | null): boolean {
  const msg = (err?.message ?? "").toLowerCase();
  return (
    msg.includes("is_custom") ||
    msg.includes("schema cache") ||
    (msg.includes("achievements") && msg.includes("column") && msg.includes("could not find"))
  );
}

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
 * Trägt in user_achievements ein und addiert points_awarded zum Guthaben und zu lifetime_points.
 * Erstellt automatisch einen points_log Eintrag für die Historie.
 */
export async function awardAchievement(
  userId: string,
  achievementName: string,
  grantedBy?: string | null,
  /** Bei true: Nur Achievement vergeben, keine Punkte/Log (z.B. bei Punkte-Einlösung). */
  skipPointsAndLog?: boolean
): Promise<{ awarded: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: achievement, error: achErr } = await (
    supabase.from("achievements") as any
  )
    .select("id, name, points_awarded")
    .eq("name", achievementName)
    .maybeSingle();

  if (achErr || !achievement) {
    console.error("[awardAchievement] Achievement nicht gefunden:", achievementName, achErr);
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

  // 1. user_achievements Eintrag erstellen
  const { error: insertErr } = await (
    supabase.from("user_achievements") as any
  ).insert({
    user_id: userId,
    achievement_id: achievement.id,
    awarded_at: new Date().toISOString(), // Explizit setzen für Konsistenz
  });

  if (insertErr) {
    console.error("[awardAchievement] Fehler beim Insert in user_achievements:", insertErr);
    return { awarded: false, error: insertErr.message };
  }

  console.log("[awardAchievement] ✓ Achievement vergeben:", achievementName, "an User:", userId);

  const points = Number(achievement.points_awarded) || 0;
  if (!skipPointsAndLog && points > 0) {
    const reason = `Achievement "${achievement.name}" erhalten`;
    const admin = createAdminClient();
    const result = await awardPointsSafe(admin, {
      targetUserId: userId,
      amount: points,
      reason,
      awardedBy: grantedBy ?? null,
    });

    if (result.error) {
      console.error("[awardAchievement] Fehler beim atomaren Punkte-RPC:", result.error);
      return { awarded: false, error: result.error };
    }

    console.log("[awardAchievement] ✓ Punkte atomar erhöht:", userId, "Betrag:", points, "Neuer Stand:", result.newTotal);
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

  // Award achievement with GM's ID as granter
  const result = await awardAchievement(targetUserId, achievementName, user.id);
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

  const fullPayload = {
    name: trimmedName,
    points_awarded: points,
    description: description?.trim() || null,
    icon: iconFilename,
    is_custom: true,
  };

  let { error } = await (supabase.from("achievements") as any).insert(fullPayload);

  if (error && isAchievementsColumnSchemaError(error)) {
    const { error: errMinimal } = await (supabase.from("achievements") as any).insert({
      name: trimmedName,
      points_awarded: points,
      icon: iconFilename,
    });
    error = errMinimal;
  }

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
      image_url: getAchievementImageForName(r.name) ?? r.icon ?? null,
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
    image_url: getAchievementImageForName(r.name) ?? r.icon ?? null,
    description: null,
    is_custom: false,
  }));
}
