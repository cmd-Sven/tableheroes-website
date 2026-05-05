import { createClient } from "@/src/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Debug-API: Prüft warum getUpcomingSessionsForUser keine Termine liefert.
 * Nur in Entwicklung verfügbar. GET /api/debug-sessions
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Nur in Entwicklung" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      error: "Nicht eingeloggt",
      memberCampaignIds: [],
      gmCampaignIds: [],
      allCampaignIds: [],
      sessionsCount: 0,
    });
  }

  // 1. Kampagnen-IDs (Spieler)
  const { data: memberRows } = await (
    supabase.from("campaign_members") as any
  )
    .select("campaign_id, status")
    .eq("user_id", user.id)
    .in("status", ["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"]);

  const memberCampaignIds = ((memberRows as any[]) || []).map(
    (m: any) => m.campaign_id as string
  );

  // 2. Kampagnen-IDs (GM)
  const { data: gmCampaignRows } = await (supabase.from("campaigns") as any)
    .select("id")
    .eq("gm_id", user.id);

  const gmCampaignIds = ((gmCampaignRows as any[]) || []).map(
    (c: any) => c.id as string
  );

  const allCampaignIds = [...new Set([...memberCampaignIds, ...gmCampaignIds])];

  // 3. Sessions OHNE Filter (nur campaign_id)
  let sessionsCount = 0;
  let sessionsSample: unknown[] = [];
  let sessionsError: unknown = null;

  if (allCampaignIds.length > 0) {
    const { data: sessionsData, error } = await (
      supabase.from("sessions") as any
    )
      .select("id, title, start_time, status, campaign_id")
      .in("campaign_id", allCampaignIds)
      .order("start_time", { ascending: true })
      .limit(20);

    sessionsError = error;
    const sessions = (sessionsData as any[]) || [];
    sessionsCount = sessions.length;
    sessionsSample = sessions.slice(0, 5).map((s: any) => ({
      id: s.id,
      title: s.title,
      start_time: s.start_time,
      status: s.status,
      campaign_id: s.campaign_id,
      isFuture: s.start_time ? new Date(s.start_time) > new Date() : null,
    }));
  }

  return NextResponse.json({
    userId: user.id,
    memberCampaignIds,
    memberRowsCount: (memberRows as any[])?.length ?? 0,
    gmCampaignIds,
    gmRowsCount: (gmCampaignRows as any[])?.length ?? 0,
    allCampaignIds,
    sessionsCount,
    sessionsError: sessionsError ? String(sessionsError) : null,
    sessionsSample,
    now: new Date().toISOString(),
  });
}
