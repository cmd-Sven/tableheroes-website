import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-queries";
import { getFactionsWithMembers } from "@/src/app/dashboard/campaigns/[id]/factions-queries";
import { ensureSessionPrepLiveState } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { StagePrepClient } from "./StagePrepClient";

type Props = {
  params: Promise<{ id: string; sessionId: string }>;
};

/** Kein gezieltes select("background_url"): fehlende Spalte bricht PostgREST sonst ab. */
function pickBackgroundUrl(row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const v = (row as Record<string, unknown>).background_url;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export const dynamic = "force-dynamic";

export default async function SessionStagePrepPage({ params }: Props) {
  const { id: campaignId, sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessionRaw, error: sessionErr } = await (supabase.from("sessions") as any)
    .select(
      "id, campaign_id, title, status, stage_deck_npc_ids, stage_deck_faction_ids",
    )
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    title: string | null;
    status: string;
    stage_deck_npc_ids?: string[] | null;
    stage_deck_faction_ids?: string[] | null;
  } | null;

  if (sessionErr || !session || session.campaign_id !== campaignId) {
    notFound();
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as { gm_id: string } | null;
  if (!campaign || campaign.gm_id !== user.id) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  if (["Completed", "Ended", "Cancelled"].includes(session.status)) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=sessions&ended=1`);
  }

  if (session.status === "Scheduled") {
    await ensureSessionPrepLiveState(sessionId);
  }

  const { data: liveRow } = await (supabase.from("session_live_states") as any)
    .select("background_url")
    .eq("session_id", sessionId)
    .maybeSingle();

  const npcsFromCampaign = await getNPCs(campaignId, user.id, true);
  const allCampaignNpcs = npcsFromCampaign.map((npc: any) => ({
    id: String(npc.id),
    name: String(npc.name ?? "NPC"),
    title: npc.title != null ? String(npc.title) : null,
  }));

  const factionsRaw = await getFactionsWithMembers(campaignId);
  const allCampaignFactions = (factionsRaw || []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? "Fraktion"),
    type: f.type != null ? String(f.type) : null,
  }));

  const stageDeckNpcIds =
    session.stage_deck_npc_ids != null && Array.isArray(session.stage_deck_npc_ids)
      ? session.stage_deck_npc_ids.map(String)
      : null;
  const stageDeckFactionIds =
    session.stage_deck_faction_ids != null && Array.isArray(session.stage_deck_faction_ids)
      ? session.stage_deck_faction_ids.map(String)
      : null;

  return (
    <StagePrepClient
      sessionId={sessionId}
      campaignId={campaignId}
      sessionTitle={session.title}
      sessionStatus={session.status}
      allCampaignNpcs={allCampaignNpcs}
      allCampaignFactions={allCampaignFactions}
      stageDeckNpcIds={stageDeckNpcIds}
      stageDeckFactionIds={stageDeckFactionIds}
      initialBackgroundUrl={pickBackgroundUrl(liveRow)}
    />
  );
}
