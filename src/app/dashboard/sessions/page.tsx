import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, History } from "lucide-react";
import {
  getUpcomingSessionsForUser,
  getPastSessionsForUser,
  getPendingCharacterCampaignsForUser,
} from "@/src/lib/actions/dashboard-widgets";
import { UpcomingSessionsCard, PastSessionsCard } from "@/src/components/dashboard/UpcomingSessionsCard";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [upcomingSessions, pastSessions, pendingCharacterCampaigns] = await Promise.all([
    getUpcomingSessionsForUser(user.id, 50),
    getPastSessionsForUser(user.id, 20),
    getPendingCharacterCampaignsForUser(user.id),
  ]);
  const rsvpBlockedCampaignIds = pendingCharacterCampaigns.map((c) => c.campaignId);

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
            Termine
          </h1>
          <p className="mt-2 font-libre text-gray-400">
            Geplante und laufende Sessions. Beendete Termine können nicht mehr betreten werden.
          </p>
        </div>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Nächste Termine */}
        <section>
          <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-gold" />
            Nächste Termine
          </h2>
          {upcomingSessions.length === 0 ? (
            <div className="rounded-md border border-dashed border-hero-dark bg-background-card/50 py-12 text-center">
              <div className="mb-4 mx-auto grid h-16 w-16 place-items-center rounded-full border border-hero-border bg-background-dark">
                <Calendar className="h-8 w-8 text-accent-gold" />
              </div>
              <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
                Keine Termine geplant
              </h3>
              <p className="max-w-sm mx-auto font-libre text-gray-400">
                Sobald eine Session geplant wird, erscheint sie hier.
              </p>
            </div>
          ) : (
            <UpcomingSessionsCard
              sessions={upcomingSessions}
              showAll
              rsvpBlockedCampaignIds={rsvpBlockedCampaignIds}
            />
          )}
        </section>

        {/* Vergangene Termine */}
        {pastSessions.length > 0 && (
          <section>
            <h2 className="font-barlow font-bold text-xl text-white uppercase mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              Vergangene Termine
            </h2>
            <PastSessionsCard sessions={pastSessions} />
          </section>
        )}
      </div>
    </div>
  );
}
