import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getAchievementImageFilenames,
} from "@/src/lib/actions/achievement-actions";
import { getAllAchievements } from "@/src/lib/actions/achievement-actions";
import { getPointsCatalog } from "@/src/lib/actions/points-catalog-actions";
import { PointsCatalogManager } from "./PointsCatalogManager";

export default async function GMPointsCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as any)?.primary_role;
  const isGM = role === "GameMaster" || role === "Admin";

  if (!isGM) redirect("/dashboard");

  const [imageFilenames, achievements, catalogItems] = await Promise.all([
    getAchievementImageFilenames(),
    getAllAchievements(),
    getPointsCatalog(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Punktekatalog verwalten
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Erstelle Belohnungen, die Spieler mit ihren Punkten einlösen können –
          physische Belohnungen (z.B. Würfelbecher) oder besondere Achievements.
        </p>
      </div>

      <PointsCatalogManager
        imageFilenames={imageFilenames}
        achievements={achievements}
        catalogItems={catalogItems}
      />
    </div>
  );
}
