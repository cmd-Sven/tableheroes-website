import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { notFound, redirect } from "next/navigation";
import { getNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-queries";
import { getFactionsWithMembers } from "@/src/app/dashboard/campaigns/[id]/factions-queries";
import { ensureSessionPrepLiveState } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { StagePrepClient } from "./StagePrepClient";
import { getCampaignSceneMedia } from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import { getSessionBattlemaps } from "@/src/lib/actions/battlemap-actions";
import {
  getSessionWorldMaps,
  getWorldMaps,
} from "@/src/lib/actions/world-map-actions";
import { getBestariumCreaturesForCampaign } from "@/src/app/dashboard/campaigns/[id]/bestarium-queries";
import { isDnd5eCampaignSystem } from "@/src/lib/characters/dnd5e/formulas";

type Props = {
  params: Promise<{ id: string; sessionId: string }>;
};

/** Liest background_url aus einer beliebigen Live-State-Zeile (select("*")). */
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
      "id, campaign_id, title, status, stage_deck_npc_ids, stage_deck_faction_ids, stage_deck_scene_media_ids, stage_deck_creature_ids, transcription_mode",
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
    stage_deck_scene_media_ids?: string[] | null;
    stage_deck_creature_ids?: string[] | null;
    transcription_mode?: string | null;
  } | null;

  if (sessionErr || !session || session.campaign_id !== campaignId) {
    notFound();
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, world_id, system")
    .eq("id", campaignId)
    .single();
  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
    world_id?: string | null;
    system?: string | null;
  } | null;
  if (!isCampaignGm(campaign, user.id)) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }
  const worldId = campaign?.world_id ? String(campaign.world_id) : null;

  if (["Completed", "Cancelled"].includes(session.status)) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=sessions&ended=1`);
  }

  if (!["Completed", "Cancelled"].includes(session.status)) {
    try {
      await ensureSessionPrepLiveState(sessionId);
    } catch (e) {
      console.error("[stage-prep] ensureSessionPrepLiveState:", e);
    }
  }

  /** Nur background_url: kleinste Payload, keine unbekannten Spalten-Typen für RSC/Flight. */
  let initialBackgroundUrl: string | null = null;
  try {
    const { data: liveRow, error: liveRowError } = await (
      supabase.from("session_live_states") as any
    )
      .select("background_url")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (liveRowError) {
      console.error("[stage-prep] session_live_states:", liveRowError.message);
    } else {
      initialBackgroundUrl = pickBackgroundUrl(liveRow);
    }
  } catch (e) {
    console.error("[stage-prep] session_live_states load exception:", e);
  }

  const npcsFromCampaign = await getNPCs(campaignId, user.id, true);
  const allCampaignNpcs = npcsFromCampaign.map((npc: any) => ({
    id: String(npc.id),
    name: String(npc.name ?? "NPC"),
    title: npc.title != null ? String(npc.title) : null,
    image_url: npc.image_url != null ? String(npc.image_url) : null,
  }));

  const factionsRaw = await getFactionsWithMembers(campaignId);
  const allCampaignFactions = (factionsRaw || []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? "Fraktion"),
    type: f.type != null ? String(f.type) : null,
    image_url: f.image_url != null ? String(f.image_url) : null,
    banner_url: f.banner_url != null ? String(f.banner_url) : null,
  }));

  const bestariumPayload = await getBestariumCreaturesForCampaign(campaignId, true);
  const allCampaignCreatures = (bestariumPayload.gm || []).map((c: any) => ({
    id: String(c.id),
    name: String(c.name ?? "Kreatur"),
    creature_type: c.creature_type != null ? String(c.creature_type) : null,
    is_revealed: !!c.is_revealed,
    image_url: c.image_url != null ? String(c.image_url) : null,
  }));

  const stageDeckNpcIds =
    session.stage_deck_npc_ids != null && Array.isArray(session.stage_deck_npc_ids)
      ? session.stage_deck_npc_ids.map(String)
      : null;
  const stageDeckFactionIds =
    session.stage_deck_faction_ids != null && Array.isArray(session.stage_deck_faction_ids)
      ? session.stage_deck_faction_ids.map(String)
      : null;
  const stageDeckSceneMediaIds =
    session.stage_deck_scene_media_ids != null &&
    Array.isArray(session.stage_deck_scene_media_ids)
      ? session.stage_deck_scene_media_ids.map(String)
      : null;
  const stageDeckCreatureIds =
    session.stage_deck_creature_ids != null &&
    Array.isArray(session.stage_deck_creature_ids)
      ? session.stage_deck_creature_ids.map(String)
      : null;

  const sceneMediaItems = await getCampaignSceneMedia(campaignId).catch(() => []);
  const initialBattlemaps = await getSessionBattlemaps(sessionId).catch(() => []);

  return (
    <StagePrepClient
      sessionId={sessionId}
      campaignId={campaignId}
      sessionTitle={session.title != null ? String(session.title) : null}
      sessionStatus={String(session.status ?? "")}
      allCampaignNpcs={serializeForClient(allCampaignNpcs)}
      allCampaignFactions={serializeForClient(allCampaignFactions)}
      allCampaignCreatures={serializeForClient(allCampaignCreatures)}
      stageDeckNpcIds={
        stageDeckNpcIds != null ? serializeForClient(stageDeckNpcIds) : null
      }
      stageDeckFactionIds={
        stageDeckFactionIds != null
          ? serializeForClient(stageDeckFactionIds)
          : null
      }
      initialBackgroundUrl={initialBackgroundUrl}
      initialTranscriptionMode={
        session.transcription_mode === "jitsi"
          ? "jitsi"
          : session.transcription_mode === "table"
            ? "table"
            : null
      }
      sceneMediaItems={serializeForClient(sceneMediaItems)}
      stageDeckSceneMediaIds={
        stageDeckSceneMediaIds != null
          ? serializeForClient(stageDeckSceneMediaIds)
          : null
      }
      stageDeckCreatureIds={
        stageDeckCreatureIds != null ? serializeForClient(stageDeckCreatureIds) : null
      }
      initialBattlemaps={serializeForClient(initialBattlemaps)}
      availableWorldMaps={serializeForClient(
        worldId ? await getWorldMaps(worldId).catch(() => []) : [],
      )}
      sessionWorldMaps={serializeForClient(
        await getSessionWorldMaps(sessionId).catch(() => []),
      )}
      showDnd5eSheet={isDnd5eCampaignSystem(campaign?.system)}
    />
  );
}
