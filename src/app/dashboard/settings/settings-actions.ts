"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { awardAchievement } from "@/src/lib/actions/achievement-actions";
import { ACHIEVEMENT_NAMES } from "@/src/lib/constants/achievements";

type ProfileDesignPayload = {
  avatar_url: string | null;
  avatar_shape: "circle" | "square";
  profile_background_image: string | null;
  profile_show_rank: boolean;
  profile_show_points: boolean;
  profile_achievement_mode: "newest" | "specific";
  profile_favorite_achievement_id: string | null;
  profile_slogan: string | null;
  profile_show_slogan: boolean;
};

/** Speichert alle Profil-Design-Felder in einem Batch in der users-Tabelle. Vergibt ggf. Achievements. */
export async function updateProfileDesign(payload: ProfileDesignPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { data: current } = await (supabase.from("users") as any)
    .select("avatar_url, profile_background_url, slogan")
    .eq("id", user.id)
    .single();

  const { error } = await (supabase.from("users") as any)
    .update({
      avatar_url: payload.avatar_url ?? null,
      avatar_shape: payload.avatar_shape ?? "circle",
      profile_background_url: payload.profile_background_image ?? null,
      show_rank: payload.profile_show_rank ?? true,
      show_points: payload.profile_show_points ?? true,
      profile_achievement_mode: payload.profile_achievement_mode ?? "newest",
      selected_achievement_id: payload.profile_favorite_achievement_id ?? null,
      slogan: payload.profile_slogan ?? null,
      show_slogan: payload.profile_show_slogan ?? false,
    })
    .eq("id", user.id);

  if (error)
    throw new Error(
      error.message || "Profil-Design konnte nicht gespeichert werden.",
    );

  const cur = current as {
    avatar_url?: string | null;
    profile_background_url?: string | null;
    slogan?: string | null;
  } | null;
  const sloganTrimmed = (payload.profile_slogan ?? "").trim();
  if (sloganTrimmed) {
    await awardAchievement(user.id, ACHIEVEMENT_NAMES.SLOGAN_SCHMIED);
  }
  const avatarChanged =
    (payload.avatar_url ?? null) !== (cur?.avatar_url ?? null) ||
    (payload.profile_background_image ?? null) !==
      (cur?.profile_background_url ?? null);
  if (avatarChanged) {
    await awardAchievement(user.id, ACHIEVEMENT_NAMES.NEUES_GESICHT);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/profile/[username]", "page");
}
