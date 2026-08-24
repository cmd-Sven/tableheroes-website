/**
 * world-map-actions — part 2: getWorldMapLinkOptions, parseWorldMapGridConfig.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import type { BattlemapGridConfig } from "@/src/lib/session/battlemap-types";
import {
  DEFAULT_WORLD_MAP_GRID,
  isWorldMapIconKey,
  type WorldMap,
  type WorldMapIconKey,
  type WorldMapMarker,
  type WorldMapMarkerNote,
  type SessionWorldMap,
} from "@/src/lib/world-maps/types";
import {
  normalizeWorldMap,
  normalizeWorldMapMarker,
  normalizeWorldMapMarkerNote,
} from "@/src/lib/world-maps/normalize";

async function assertWorldGm(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .maybeSingle();

  if (!world || String((world as { gm_id?: string }).gm_id ?? "") !== String(user.id)) {
    throw new Error("Nur der Welt-GM kann Weltkarten verwalten.");
  }
  return { supabase, user };
}

async function assertSessionGm(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");

  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, world_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    throw new Error("Nur der Spielleiter darf Session-Weltkarten verwalten.");
  }

  return {
    supabase,
    user,
    campaignId,
    worldId: (campaignRaw as { world_id?: string | null })?.world_id
      ? String((campaignRaw as { world_id: string }).world_id)
      : null,
  };
}

function revalidateWorldMaps(worldId: string, campaignId?: string | null) {
  revalidatePath(`/dashboard/worlds/${worldId}/maps`);
  revalidatePath(`/dashboard/worlds/${worldId}`);
  if (campaignId) {
    revalidatePath(`/dashboard/campaigns/${campaignId}/maps`);
    revalidatePath(`/dashboard/campaigns/${campaignId}`);
  }
}

// ---------------------------------------------------------------------------
// World maps CRUD
// ---------------------------------------------------------------------------

export async function getWorldMapLinkOptions(worldId: string, campaignId?: string | null) {
  const supabase = await createClient();

  const [loreRes, npcRes, factionRes, creatureRes] = await Promise.all([
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
    (supabase.from("npcs") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
    (supabase.from("factions") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
    (supabase.from("bestarium_creatures") as any)
      .select("id, name")
      .eq("world_id", worldId)
      .order("name", { ascending: true })
      .limit(500),
  ]);

  let quests: Array<{ id: string; title: string }> = [];
  if (campaignId) {
    const questRes = await (supabase.from("quests") as any)
      .select("id, title")
      .eq("campaign_id", campaignId)
      .order("title", { ascending: true })
      .limit(500);
    quests = ((questRes.data ?? []) as Array<{ id: string; title: string }>).map((q) => ({
      id: String(q.id),
      title: String(q.title ?? "Quest"),
    }));
  }

  return {
    lore: ((loreRes.data ?? []) as Array<{ id: string; name: string; type?: string }>).map(
      (l) => ({
        id: String(l.id),
        name: String(l.name ?? "Lore"),
        type: l.type != null ? String(l.type) : null,
      }),
    ),
    npcs: ((npcRes.data ?? []) as Array<{ id: string; name: string }>).map((n) => ({
      id: String(n.id),
      name: String(n.name ?? "NPC"),
    })),
    factions: ((factionRes.data ?? []) as Array<{ id: string; name: string }>).map((f) => ({
      id: String(f.id),
      name: String(f.name ?? "Fraktion"),
    })),
    creatures: ((creatureRes.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({
      id: String(c.id),
      name: String(c.name ?? "Kreatur"),
    })),
    quests,
  };
}

export async function parseWorldMapGridConfig(raw: unknown): Promise<BattlemapGridConfig> {
  return parseGridConfig(raw);
}
