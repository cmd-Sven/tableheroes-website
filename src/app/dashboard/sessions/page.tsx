import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar } from "lucide-react";
import { getUpcomingSessionsForUser } from "@/src/lib/actions/dashboard-widgets";
import { UpcomingSessionsCard } from "@/src/components/dashboard/UpcomingSessionsCard";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const sessions = await getUpcomingSessionsForUser(user.id, 50);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-sm text-gray-400 hover:text-hero-vibrant transition-colors mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück zum Dashboard
          </Link>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            Alle Termine
          </h1>
          <p className="mt-2 font-libre text-gray-400">
            Alle geplanten und laufenden Sessions deiner Kampagnen.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-md border border-dashed border-hero-dark bg-background-card/50 py-16 text-center">
          <div className="mb-4 mx-auto grid h-16 w-16 place-items-center rounded-full border border-hero-border bg-background-dark">
            <Calendar className="h-8 w-8 text-accent-gold" />
          </div>
          <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
            Keine Termine geplant
          </h3>
          <p className="max-w-sm mx-auto font-libre text-gray-400 mb-6">
            Sobald eine Session geplant wird, erscheint sie hier.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm hover:bg-hero-vibrant transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      ) : (
        <div className="max-w-2xl">
          <UpcomingSessionsCard sessions={sessions} showAll />
        </div>
      )}
    </div>
  );
}
