import { cache } from "react";
import { createClient } from "@/src/lib/supabase/server";

/** Ein Select für Layout + Dashboard-Page (React cache dedupliziert pro Request). */
export const DASHBOARD_PROFILE_SELECT = [
  "id",
  "username",
  "display_name",
  "role",
  "primary_role",
  "avatar_url",
  "avatar_shape",
  "status",
  "created_at",
  "total_points",
  "lifetime_points",
  "profile_background",
  "profile_background_url",
  "show_rank",
  "show_points",
  "profile_achievement_mode",
  "selected_achievement_id",
  "slogan",
  "show_slogan",
  "avatar_position_x",
  "avatar_position_y",
  "banner_position_x",
  "banner_position_y",
  "dashboard_layout",
  "privacy_public_profile",
  "is_backer",
  "backer_since",
  "player_dashboard_tutorial_dismissed",
].join(", ");

export type DashboardUserProfile = {
  id: string;
  username: string | null;
  display_name?: string | null;
  role?: string | null;
  primary_role: string | null;
  avatar_url: string | null;
  avatar_shape?: "circle" | "square" | null;
  status?: string | null;
  created_at?: string | null;
  total_points?: number | null;
  lifetime_points?: number | null;
  profile_background?: string | null;
  profile_background_url?: string | null;
  show_rank?: boolean | null;
  show_points?: boolean | null;
  profile_achievement_mode?: "newest" | "specific" | null;
  selected_achievement_id?: string | null;
  slogan?: string | null;
  show_slogan?: boolean | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  banner_position_x?: number | null;
  banner_position_y?: number | null;
  dashboard_layout?: unknown;
  privacy_public_profile?: boolean | null;
  is_backer?: boolean | null;
  backer_since?: string | null;
  player_dashboard_tutorial_dismissed?: boolean | null;
};

/**
 * Pro Request genau eine users-Query — Layout und /dashboard teilen sich das Ergebnis.
 */
export const getDashboardProfile = cache(
  async (userId: string): Promise<DashboardUserProfile | null> => {
    const supabase = await createClient();
    const { data, error } = await (supabase.from("users") as any)
      .select(DASHBOARD_PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[getDashboardProfile]", error.message ?? error);
      return null;
    }
    return (data as DashboardUserProfile | null) ?? null;
  },
);
