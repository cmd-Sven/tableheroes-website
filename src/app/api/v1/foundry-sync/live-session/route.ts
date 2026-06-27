import { createAdminClient } from "@/src/lib/supabase/server";
import {
  foundryJson,
  foundryOptions,
  getFoundryApiKey,
  resolveFoundryApiCampaign,
} from "@/src/lib/foundry-sync/foundry-api";
import { absoluteUrl } from "@/src/lib/site-url";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return foundryOptions();
}

/** Aktuelle Live-Session der Kampagne — Join-Link für Foundry (neuer Browser-Tab). */
export async function GET(request: Request) {
  const apiKey = getFoundryApiKey(request);
  if (!apiKey) {
    return foundryJson({ ok: false, error: "API-Key fehlt." }, { status: 401 });
  }

  const admin = createAdminClient();
  const resolved = await resolveFoundryApiCampaign(admin, apiKey);
  if (!resolved.ok) {
    return foundryJson({ ok: false, error: resolved.error }, { status: resolved.status });
  }

  const { data: sessionRaw } = await (admin.from("sessions") as any)
    .select("id, title, status, guest_join_token, scheduled_at")
    .eq("campaign_id", resolved.campaignId)
    .eq("status", "Live")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = sessionRaw as {
    id: string;
    title?: string | null;
    status: string;
    guest_join_token?: string | null;
  } | null;

  if (!session?.id || !session.guest_join_token) {
    return foundryJson({
      ok: true,
      live: false,
      message: "Keine laufende Live-Session mit Gäste-Link.",
    });
  }

  const joinPath = `/session/join/${session.guest_join_token}`;
  return foundryJson({
    ok: true,
    live: true,
    session_id: session.id,
    session_title: session.title ?? "Live-Session",
    join_url: absoluteUrl(joinPath),
    session_url: absoluteUrl(`/session/${session.id}`),
  });
}
