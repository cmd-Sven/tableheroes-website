import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getGmPlanningEventsForCurrentUser,
  getPlanningEventRsvpCountsForGm,
} from "@/src/lib/actions/community-event-actions";
import { GmPlanningEventsClient } from "./GmPlanningEventsClient";

export default async function GmPlanningEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();

  const role = (profile as { primary_role?: string; is_super_admin?: boolean } | null)
    ?.primary_role;
  const isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin;
  if (role !== "GameMaster" && role !== "Admin" && !isSuperAdmin) {
    redirect("/dashboard");
  }

  const events = await getGmPlanningEventsForCurrentUser();
  const countsMap = await getPlanningEventRsvpCountsForGm(events.map((e) => e.id));

  return (
    <GmPlanningEventsClient
      initialEvents={events}
      initialRsvpCounts={countsMap}
    />
  );
}
