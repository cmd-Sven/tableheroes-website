"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UpdateAccountDataPayload = {
  username?: string;
  email?: string;
};

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 50;

/**
 * Aktualisiert Account-Daten (username, optional display_name synchron).
 * E-Mail-Änderung über Supabase Auth ist separat/komplex – Fokus auf Benutzername.
 */
export async function updateAccountData(
  userId: string,
  payload: UpdateAccountDataPayload
): Promise<{ success: true } | { success: false; error: string }> {
  const { username } = payload;

  if (username !== undefined) {
    const trimmed = username.trim();
    if (trimmed.length < MIN_USERNAME_LENGTH)
      return {
        success: false,
        error: `Benutzername muss mindestens ${MIN_USERNAME_LENGTH} Zeichen haben.`,
      };
    if (trimmed.length > MAX_USERNAME_LENGTH)
      return {
        success: false,
        error: `Benutzername darf maximal ${MAX_USERNAME_LENGTH} Zeichen haben.`,
      };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId)
    return { success: false, error: "Nicht berechtigt." };

  const updates: Record<string, string | null> = {};
  if (username !== undefined) {
    updates.username = username.trim() || null;
  }

  if (Object.keys(updates).length === 0) return { success: true };

  const { error } = await (supabase.from("users") as any)
    .update(updates)
    .eq("id", userId);

  if (error)
    return {
      success: false,
      error: error.message || "Account-Daten konnten nicht gespeichert werden.",
    };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings", "page");
  return { success: true };
}

/**
 * Setzt den Lese-Zeitstempel für ein Dashboard-Widget (News, Achievements, Lore).
 * Erfordert in der Tabelle users die Spalten: last_news_view, last_achievement_view, last_lore_view (timestamptz).
 */
export async function markWidgetAsRead(
  widgetType: "news" | "achievement" | "lore"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const column =
    widgetType === "news"
      ? "last_news_view"
      : widgetType === "achievement"
      ? "last_achievement_view"
      : "last_lore_view";
  const now = new Date().toISOString();
  const updates: Record<string, string> = { [column]: now };

  const { error } = await (supabase.from("users") as any)
    .update(updates)
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
