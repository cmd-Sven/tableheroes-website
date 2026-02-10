import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getAchievementImageFilenames,
  getAllAchievements,
} from "@/src/lib/actions/achievement-actions";
import { AchievementCreatorClient } from "./AchievementCreatorClient";

export default async function GMAchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as { primary_role?: string } | null)?.primary_role;
  const isGM = role === "GameMaster" || role === "Admin";

  if (!isGM) {
    redirect("/dashboard");
  }

  const [imageFilenames, existingAchievements] = await Promise.all([
    getAchievementImageFilenames(),
    getAllAchievements(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Achievement-Verwaltung
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Erstelle eigene Achievements und wähle Bilder aus dem Ordner{" "}
          <code className="bg-hero-dark/50 px-1 rounded text-sm">
            public/images/achievement/
          </code>
          . Sie erscheinen sofort im Modal „Achievement verleihen“ in deinen
          Kampagnen.
        </p>
      </div>
      <AchievementCreatorClient
        imageFilenames={imageFilenames}
        existingAchievements={existingAchievements}
      />
    </div>
  );
}
