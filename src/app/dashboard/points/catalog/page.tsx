import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPointsCatalog } from "@/src/lib/actions/points-catalog-actions";
import { CatalogList } from "./CatalogList";

export default async function PointsCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("total_points")
    .eq("id", user.id)
    .single();

  const totalPoints = Number((profile as any)?.total_points) || 0;
  const catalogItems = await getPointsCatalog();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/points"
            className="mb-4 inline-flex items-center gap-2 font-barlow text-sm font-bold uppercase text-gray-400 hover:text-hero-vibrant"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zu Punkte
          </Link>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            Punktekatalog
          </h1>
          <p className="mt-2 font-libre text-gray-400">
            Tausche deine Punkte gegen Belohnungen ein. Du hast{" "}
            <span className="font-bold text-hero-vibrant">
              {totalPoints.toLocaleString("de-DE")}
            </span>{" "}
            Punkte.
          </p>
        </div>
      </div>

      <CatalogList
        items={catalogItems}
        totalPoints={totalPoints}
        userId={user.id}
      />
    </div>
  );
}
