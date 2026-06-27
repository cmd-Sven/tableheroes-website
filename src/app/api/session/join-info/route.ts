import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/server";
import { absoluteUrl } from "@/src/lib/site-url";

export const dynamic = "force-dynamic";

/** Öffentliche Info zum Join-Link (ohne Auth). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token fehlt." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sessionRaw, error } = await (admin.from("sessions") as any)
    .select("id, title, status, campaign_id")
    .eq("guest_join_token", token)
    .maybeSingle();

  if (error || !sessionRaw) {
    return NextResponse.json({ ok: false, error: "Link ungültig." }, { status: 404 });
  }

  const session = sessionRaw as {
    id: string;
    title?: string | null;
    status: string;
    campaign_id: string;
  };

  const { data: campaignRaw } = await (admin.from("campaigns") as any)
    .select("name")
    .eq("id", session.campaign_id)
    .maybeSingle();

  const campaignName =
    (campaignRaw as { name?: string | null } | null)?.name?.trim() || "Kampagne";

  return NextResponse.json({
    ok: true,
    session_id: session.id,
    session_title: session.title ?? "Live-Session",
    campaign_name: campaignName,
    status: session.status,
    is_live: session.status === "Live",
    join_url: absoluteUrl(`/session/join/${token}`),
    session_url: absoluteUrl(`/session/${session.id}`),
  });
}
