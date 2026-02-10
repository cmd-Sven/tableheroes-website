import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllPublishedNews } from "@/src/lib/actions/news-actions";
import { NewsArchiveClient } from "./NewsArchiveClient";

export default async function DashboardNewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const posts = await getAllPublishedNews();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          News-Archiv
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Alle veröffentlichten Plattform-News. Nutze Suche und Filter, um
          ältere Ankündigungen schnell zu finden.
        </p>
      </div>
      <NewsArchiveClient posts={posts} />
    </div>
  );
}
