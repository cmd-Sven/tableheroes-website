import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getAllCommunityEventsForAdmin,
  getCommunityEventRsvpCounts,
} from "@/src/lib/actions/community-event-actions";
import { AdminEventsClient } from "./AdminEventsClient";

export default async function AdminCommunityEventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();

  const role = (profile as { primary_role?: string; is_super_admin?: boolean } | null)?.primary_role;
  const isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin;
  if (role !== "Admin" && !isSuperAdmin) {
    redirect("/dashboard");
  }

  const events = await getAllCommunityEventsForAdmin();
  const countsMap = await getCommunityEventRsvpCounts(events.map((e) => e.id));
  const initialRsvpCounts: Record<
    string,
    { zusage: number; absage: number; viaOnline: number }
  > = {};
  countsMap.forEach((v, k) => {
    initialRsvpCounts[k] = v;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Community-Termine
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Stammtisch, Vereinsfeiern und andere Termine — unabhängig von Kampagnen. Mitglieder
          melden sich mit ihrem Profil an.
        </p>
      </div>
      <AdminEventsClient initialEvents={events} initialRsvpCounts={initialRsvpCounts} />
    </div>
  );
}
