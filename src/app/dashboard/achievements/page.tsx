import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllAchievements } from "@/src/lib/actions/achievement-actions";
import { getUserAchievements } from "@/src/lib/queries/achievement-queries";
import { getAchievementImageForName } from "@/src/lib/constants/achievements";
import {
  AchievementsList,
  type AchievementWithStatus,
} from "./AchievementsList";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [allAchievements, earnedAchievementsResult] = await Promise.all([
    getAllAchievements(),
    getUserAchievements(user.id),
  ]);

  const earnedIds = new Set(
    (earnedAchievementsResult?.achievements || []).map((e) => e.id)
  );

  const withStatus: AchievementWithStatus[] = allAchievements.map((a) => ({
    id: a.id,
    name: a.name,
    points_awarded: a.points_awarded ?? 0,
    image_url: getAchievementImageForName(a.name) ?? a.image_url ?? null,
    description: a.description ?? null,
    unlocked: earnedIds.has(a.id),
  }));

  const sorted = [...withStatus].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Achievements
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Freigeschaltete Achievements stehen oben. Noch nicht errungene sind
          ausgegraut – in den Details steht, wie du sie freischalten kannst.
        </p>
      </div>
      <AchievementsList achievements={sorted} />
    </div>
  );
}
