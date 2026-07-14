import { createAdminClient } from "@/src/lib/supabase/server";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import type { GuestSessionCookie } from "@/src/lib/session-guest-auth";

async function getRevealedIdsForCampaign(
  campaignId: string,
  entityType: "npc" | "faction" | "lore",
): Promise<Record<string, boolean>> {
  const admin = createAdminClient();
  const { data: rows } = await (admin.from("campaign_visibility") as any)
    .select("entity_id, is_revealed")
    .eq("campaign_id", campaignId)
    .eq("entity_type", entityType)
    .eq("is_revealed", true);
  const map: Record<string, boolean> = {};
  for (const row of (rows as { entity_id: string }[] | null) || []) {
    map[row.entity_id] = true;
  }
  return map;
}

function normalizeActiveQuests(rows: unknown[]) {
  return (rows || []).map((raw) => {
    const q = raw as Record<string, unknown>;
    return {
      id: String(q.id),
      title: String(q.title ?? ""),
      description: q.description != null ? String(q.description) : null,
      rewards:
        typeof q.rewards === "string"
          ? q.rewards
          : q.rewards != null
            ? JSON.stringify(q.rewards)
            : null,
      type: q.type != null ? String(q.type) : null,
      quest_giver: null,
      location: null,
    };
  });
}

/** Lädt Session-Daten für Gäste (Admin-Client + Cookie-Validierung). */
export async function loadGuestSessionContext(sessionId: string, guest: GuestSessionCookie) {
  const admin = createAdminClient();

  const { data: participant } = await (admin as any)
    .from("session_guest_participants")
    .select("id, display_name, slot_index")
    .eq("id", guest.guestId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!participant) return null;

  const { data: sessionRaw } = await (admin.from("sessions") as any)
    .select("id, campaign_id, status, stage_deck_npc_ids, stage_deck_faction_ids, transcription_mode")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRaw) return null;

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    stage_deck_npc_ids?: string[] | null;
    stage_deck_faction_ids?: string[] | null;
    transcription_mode?: string | null;
  };

  if (["Completed", "Cancelled"].includes(session.status)) return null;
  if (session.status !== "Live") return null;

  const { data: campaignRaw } = await (admin.from("campaigns") as any)
    .select("gm_id, owner_id, world_id")
    .eq("id", session.campaign_id)
    .maybeSingle();

  const campaign = campaignRaw as { world_id?: string | null } | null;
  if (!campaign) return null;

  const { data: liveState } = await (admin.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const trayRes = await (admin as any).rpc("get_session_party_tray", {
    p_session_id: sessionId,
  });

  let partyCharacters: Array<Record<string, unknown>> = [];
  if (!trayRes.error && Array.isArray(trayRes.data)) {
    partyCharacters = (trayRes.data as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      name: String(c.char_name ?? ""),
      class: c.char_class != null ? String(c.char_class) : null,
      race: c.race != null ? String(c.race) : null,
      level: typeof c.level === "number" ? c.level : null,
      avatar_url: c.avatar_url != null ? String(c.avatar_url) : null,
      avatar_display: null,
      playerUserId: c.member_user_id != null ? String(c.member_user_id) : null,
      rations_count: 0,
      starvation_days: 0,
    }));
  }

  const visibility = await getRevealedIdsForCampaign(session.campaign_id, "npc");
  const { data: npcRows } = await (admin.from("npcs") as any)
    .select("id, name, title, description, image_url, is_merchant, shop_id, faction_id, current_location_id, home_location_id")
    .eq("campaign_id", session.campaign_id);

  const allCampaignNpcs = ((npcRows as any[]) || [])
    .filter((npc) => visibility[npc.id] === true)
    .map((npc) => ({
      id: String(npc.id),
      name: String(npc.name ?? ""),
      title: npc.title != null ? String(npc.title) : null,
      description: npc.description != null ? String(npc.description) : null,
      image_url: npc.image_url != null ? String(npc.image_url) : null,
      is_revealed: true,
      is_merchant: !!npc.is_merchant,
      shop_id: npc.shop_id != null ? String(npc.shop_id) : null,
      faction_id: npc.faction_id != null ? String(npc.faction_id) : null,
      current_location_id:
        npc.current_location_id != null ? String(npc.current_location_id) : null,
      home_location_id: npc.home_location_id != null ? String(npc.home_location_id) : null,
    }));

  const factionVis = await getRevealedIdsForCampaign(session.campaign_id, "faction");
  const { data: factionRows } = await (admin.from("factions") as any)
    .select("id, name, image_url, type, description, current_status")
    .eq("campaign_id", session.campaign_id);

  const allCampaignFactions = ((factionRows as any[]) || [])
    .filter((f) => factionVis[f.id] === true)
    .map((f) => ({
      id: String(f.id),
      name: String(f.name ?? "Fraktion"),
      image_url: f.image_url ?? null,
      type: f.type != null ? String(f.type) : null,
      description: f.description != null ? String(f.description) : null,
      current_status: f.current_status != null ? String(f.current_status) : null,
      is_revealed: true,
    }));

  const { data: activeQuests } = await (admin.from("quests") as any)
    .select("id, title, description, rewards, type")
    .eq("campaign_id", session.campaign_id)
    .eq("status", "Active")
    .eq("is_revealed", true);

  const locLoreRaw = (liveState as { current_location_lore_id?: string | null } | null)
    ?.current_location_lore_id;
  const locLoreId =
    locLoreRaw != null && String(locLoreRaw).length > 0 ? String(locLoreRaw) : null;

  let sessionLocationLoreReadable = false;
  if (locLoreId) {
    const loreVis = await getRevealedIdsForCampaign(session.campaign_id, "lore");
    sessionLocationLoreReadable = loreVis[locLoreId] === true;
  }

  const stageDeckNpcIds =
    session.stage_deck_npc_ids != null && Array.isArray(session.stage_deck_npc_ids)
      ? session.stage_deck_npc_ids.map(String)
      : null;
  const stageDeckFactionIds =
    session.stage_deck_faction_ids != null && Array.isArray(session.stage_deck_faction_ids)
      ? session.stage_deck_faction_ids.map(String)
      : null;

  return {
    session,
    campaign,
    liveState,
    partyCharacters,
    allCampaignNpcs,
    allCampaignFactions,
    activeQuests: normalizeActiveQuests(activeQuests ?? []),
    sessionLocationLoreReadable,
    stageDeckNpcIds,
    stageDeckFactionIds,
    guest: {
      id: String((participant as { id: string }).id),
      displayName: String((participant as { display_name: string }).display_name),
      slotIndex: Number((participant as { slot_index: number }).slot_index),
    },
  };
}

export function serializeGuestSessionPayload(
  ctx: NonNullable<Awaited<ReturnType<typeof loadGuestSessionContext>>>,
) {
  return {
    sessionId: ctx.session.id,
    campaignId: ctx.session.campaign_id,
    worldId: ctx.campaign.world_id ?? null,
    sessionStatus: ctx.session.status,
    userId: ctx.guest.id,
    guestDisplayName: ctx.guest.displayName,
    guestSlotIndex: ctx.guest.slotIndex,
    initialLiveState: ctx.liveState
      ? ({
          ...(serializeForClient(ctx.liveState) as Record<string, unknown>),
          session_id: ctx.session.id,
        } as any)
      : null,
    partyCharacters: serializeForClient(ctx.partyCharacters),
    allCampaignNpcs: serializeForClient(ctx.allCampaignNpcs),
    allCampaignFactions: serializeForClient(ctx.allCampaignFactions),
    stageDeckNpcIds: ctx.stageDeckNpcIds != null ? serializeForClient(ctx.stageDeckNpcIds) : null,
    stageDeckFactionIds:
      ctx.stageDeckFactionIds != null ? serializeForClient(ctx.stageDeckFactionIds) : null,
    activeQuests: serializeForClient(ctx.activeQuests),
    sessionLocationLoreReadable: ctx.sessionLocationLoreReadable,
    transcriptionMode:
      ctx.session.transcription_mode === "jitsi"
        ? "jitsi"
        : ctx.session.transcription_mode === "table"
          ? "table"
          : null,
  };
}
