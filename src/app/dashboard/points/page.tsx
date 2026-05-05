import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPointsLog } from "@/src/lib/queries/point-queries";
import {
  calculateLevel,
  getPointsForLevel,
  getPointsForNextLevel,
} from "@/src/lib/utils/rank-utils";
import { PointsPageClient } from "./PointsPageClient";

export default async function PointsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("total_points, lifetime_points")
    .eq("id", user.id)
    .single();

  const totalPoints = Number((profile as any)?.total_points) || 0;
  const lifetimePoints = Number((profile as any)?.lifetime_points) || 0;
  const pointsLog = await getPointsLog(user.id, 50);

  const level = calculateLevel(lifetimePoints);
  const nextLevelPoints = getPointsForNextLevel(level);
  const currentLevelBase = level > 0 ? getPointsForLevel(level) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Punkte
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Deine Punkte, Level-Fortschritt und Historie. Du kannst Punkte im
          Katalog gegen Belohnungen eintauschen.
        </p>
      </div>

      <PointsPageClient
        totalPoints={totalPoints}
        lifetimePoints={lifetimePoints}
        level={level}
        nextLevelPoints={nextLevelPoints}
        currentLevelBase={currentLevelBase}
        pointsLog={pointsLog}
      />
    </div>
  );
}
