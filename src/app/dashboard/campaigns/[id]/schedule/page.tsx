import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { CampaignScheduleForm } from "@/src/components/dashboard/campaigns/CampaignScheduleForm";
import { SessionsTab } from "../SessionsTab";
import { getNPCs } from "../npc-queries";
import { getLoreEntries } from "../lore-queries";
import { isLocationType } from "@/src/lib/lore-types";
import { loadUpcomingSessionsWithRsvpForGm } from "../campaign-sessions-load";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function CampaignSchedulePage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select(
      "id, gm_id, name, schedule_interval, schedule_day, schedule_time, schedule_duration_hours, frequency",
    )
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as {
    id: string;
    gm_id: string;
    name: string;
    schedule_interval: string | null;
    schedule_day: string | number | null;
    schedule_time: string | null;
    schedule_duration_hours: number | null;
    frequency: string | null;
  } | null;

  if (!campaign) notFound();
  if (campaign.gm_id !== user.id) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=sessions`);
  }

  const scheduleDayNum =
    campaign.schedule_day != null && campaign.schedule_day !== ""
      ? Number(campaign.schedule_day)
      : null;
  const initialDay =
    scheduleDayNum != null && !Number.isNaN(scheduleDayNum) ? scheduleDayNum : null;

  const [sessionsPayload, loreEntries, npcs] = await Promise.all([
    loadUpcomingSessionsWithRsvpForGm(campaignId, user.id),
    getLoreEntries(campaignId),
    getNPCs(campaignId, user.id, true),
  ]);

  const sessionsTabNpcs = npcs.map((n: any) => ({
    id: String(n.id),
    name: String(n.name ?? ""),
    title: n.title != null ? String(n.title) : null,
  }));

  const locations = loreEntries
    .filter((l: any) => isLocationType(l.type))
    .map((l: any) => ({
      id: String(l.id),
      name: String(l.name ?? ""),
      type: String(l.type ?? ""),
    }))
    .sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name),
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href={`/dashboard/campaigns/${campaignId}?tab=overview`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      <div>
        <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
          Termine &amp; Spielplan
        </h1>
        <p className="font-libre text-gray-400 mt-2">
          {campaign.name} – Rhythmus festlegen und Sitzungen verwalten.
        </p>
      </div>

      <CampaignScheduleForm
        campaignId={campaignId}
        initialInterval={campaign.schedule_interval ?? null}
        initialDay={initialDay}
        initialTime={campaign.schedule_time ?? null}
        initialDuration={campaign.schedule_duration_hours ?? null}
        initialFrequencyNote={campaign.frequency ?? null}
      />

      <section className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-6">
          Sitzungen
        </h2>
        <SessionsTab
          campaignId={campaignId}
          isGM
          focusSession={(sessionsPayload.focusSession as any) ?? null}
          otherUpcomingSessions={(sessionsPayload.otherUpcomingSessions || []) as any}
          pastSessionRows={(sessionsPayload.pastSessionsForCampaignTab || []) as any}
          upcomingSessions={(sessionsPayload.upcomingSessionsWithRsvp || []) as any}
          archives={[]}
          locations={locations}
          npcs={sessionsTabNpcs}
        />
      </section>
    </div>
  );
}
