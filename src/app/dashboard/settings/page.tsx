import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";
import type { ProfileDesignData } from "@/src/components/dashboard/settings/ProfileSettings";
import { getUserAchievements } from "@/src/lib/queries/achievement-queries";

type UserProfile = {
  username?: string | null;
  privacy_public_profile?: boolean | null;
  player_dashboard_tutorial_dismissed?: boolean | null;
  avatar_url?: string | null;
  avatar_shape?: "circle" | "square" | null;
  profile_background_url?: string | null;
  show_rank?: boolean | null;
  show_points?: boolean | null;
  profile_achievement_mode?: "newest" | "specific" | null;
  selected_achievement_id?: string | null;
  slogan?: string | null;
  show_slogan?: boolean | null;
};

export default async function DashboardSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select(
      "username, privacy_public_profile, player_dashboard_tutorial_dismissed, avatar_url, avatar_shape, profile_background_url, show_rank, show_points, profile_achievement_mode, selected_achievement_id, slogan, show_slogan"
    )
    .eq("id", user.id)
    .single();

  const profile = profileRaw as unknown as UserProfile | null;
  const privacyPublicProfile = !!profile?.privacy_public_profile;
  const playerDashboardTutorialDismissed =
    !!profile?.player_dashboard_tutorial_dismissed;

  const profileDesign: ProfileDesignData = {
    avatarUrl: profile?.avatar_url ?? null,
    avatarShape: (profile?.avatar_shape as "circle" | "square") ?? "circle",
    backgroundImageUrl: profile?.profile_background_url ?? null,
    showRank: profile?.show_rank ?? true,
    showPoints: profile?.show_points ?? true,
    achievementMode:
      (profile?.profile_achievement_mode as "newest" | "specific") ?? "newest",
    favoriteAchievementId: profile?.selected_achievement_id ?? null,
    slogan: profile?.slogan ?? null,
    showSlogan: !!profile?.show_slogan,
  };

  const earnedResult = await getUserAchievements(user.id);
  const earnedList = Array.isArray(earnedResult?.achievements)
    ? earnedResult.achievements
    : [];
  const achievements = earnedList.map(
    (a: { id: string; name: string; image_url?: string | null }) => ({
      id: a.id,
      name: a.name,
      icon: a.image_url ?? null,
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Einstellungen
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Privatsphäre, Profil-Header und Account-Daten.
        </p>
      </div>
      <SettingsClient
        userId={user.id}
        initialUsername={profile?.username ?? null}
        privacyPublicProfile={privacyPublicProfile}
        playerDashboardTutorialDismissed={playerDashboardTutorialDismissed}
        profileDesign={profileDesign}
        achievements={achievements}
      />
    </div>
  );
}
