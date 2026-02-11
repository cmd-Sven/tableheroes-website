"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// Types
// ============================================================================

export type GuestbookEntry = {
  id: string;
  rating: number;
  comment: string;
  username: string;
  avatarUrl: string | null;
  isBacker: boolean;
  createdAt: string;
};

export type BackerHero = {
  id: string;
  username: string;
  avatarUrl: string | null;
  backerSince: string;
};

// ============================================================================
// Get Guestbook Entries
// ============================================================================

export async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("guestbook") as any)
    .select(
      "id, rating, comment, created_at, users:user_id ( username, avatar_url, is_backer )"
    )
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[getGuestbookEntries]", error);
    return [];
  }

  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    rating: row.rating ?? 5,
    comment: row.comment ?? "",
    username: (row.users as any)?.username ?? "Abenteurer",
    avatarUrl: (row.users as any)?.avatar_url ?? null,
    isBacker: !!(row.users as any)?.is_backer,
    createdAt: row.created_at,
  }));
}

// ============================================================================
// Get Backers (Hall of Heroes)
// ============================================================================

export async function getBackers(): Promise<BackerHero[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("users") as any)
    .select("id, username, avatar_url, created_at")
    .eq("is_backer", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getBackers]", error);
    return [];
  }

  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    username: row.username ?? "Held",
    avatarUrl: row.avatar_url ?? null,
    backerSince: row.created_at,
  }));
}

// ============================================================================
// Add Guestbook Entry
// ============================================================================

export async function addGuestbookEntry(
  rating: number,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Bitte melde dich an." };

  // Validierung
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return { success: false, error: "Bewertung muss zwischen 1 und 5 liegen." };
  }
  if (!comment.trim() || comment.trim().length < 3) {
    return { success: false, error: "Bitte schreibe mindestens 3 Zeichen." };
  }
  if (comment.trim().length > 500) {
    return { success: false, error: "Maximal 500 Zeichen erlaubt." };
  }

  // Prüfen ob User schon einen Eintrag hat (max 1 pro User)
  const { data: existing } = await (supabase.from("guestbook") as any)
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existing && (existing as any[]).length > 0) {
    // Update statt Insert
    const { error } = await (supabase.from("guestbook") as any)
      .update({
        rating,
        comment: comment.trim(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("[addGuestbookEntry:update]", error);
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await (supabase.from("guestbook") as any).insert({
      user_id: user.id,
      rating,
      comment: comment.trim(),
      is_visible: true,
    });

    if (error) {
      console.error("[addGuestbookEntry:insert]", error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/support");
  return { success: true };
}
