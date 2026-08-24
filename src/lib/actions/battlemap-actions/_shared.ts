/**
 * Shared helpers for battlemap-actions.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import {
  feetToMovementCells,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import { parseSheetData } from "@/src/lib/characters/dnd5e/defaults";
import {
  BATTLEMAP_MARKER_KINDS,
  DEFAULT_BATTLEMAP_GRID,
  type BattlemapFogShapeKind,
  type BattlemapEffectShapeKind,
  type BattlemapGridConfig,
  type BattlemapMarkerKind,
  type BattlemapTokenSide,
  type SessionBattlemap,
  type SessionBattlemapEffectTemplate,
  type SessionBattlemapFogShape,
  type SessionBattlemapMarker,
  type SessionBattlemapProp,
  type SessionBattlemapToken,
} from "@/src/lib/session/battlemap-types";

export function normalizeBattlemap(row: Record<string, unknown>): SessionBattlemap {
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    title: String(row.title ?? "Battlemap"),
    image_url: String(row.image_url ?? ""),
    image_storage_path:
      row.image_storage_path != null ? String(row.image_storage_path) : null,
    sort_order: Number(row.sort_order ?? 0),
    grid_config: parseGridConfig(row.grid_config),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}


export function normalizeToken(row: Record<string, unknown>): SessionBattlemapToken {
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    character_id: row.character_id != null ? String(row.character_id) : null,
    npc_id: row.npc_id != null ? String(row.npc_id) : null,
    creature_id: row.creature_id != null ? String(row.creature_id) : null,
    grid_x: Number(row.grid_x ?? 0),
    grid_y: Number(row.grid_y ?? 0),
    label: row.label != null ? String(row.label) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    size_cells: Math.max(1, Number(row.size_cells ?? 1)),
    is_visible_to_players: row.is_visible_to_players !== false,
    token_side: (row.token_side as SessionBattlemapToken["token_side"]) ?? "party",
    show_hp_bar: row.show_hp_bar === true,
  };
}


export function normalizeProp(row: Record<string, unknown>): SessionBattlemapProp {
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    kind: (row.kind as SessionBattlemapProp["kind"]) ?? "npc_card",
    npc_id: row.npc_id != null ? String(row.npc_id) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    scene_media_id: row.scene_media_id != null ? String(row.scene_media_id) : null,
    pos_x: Number(row.pos_x ?? 0),
    pos_y: Number(row.pos_y ?? 0),
    width: Number(row.width ?? 0.15),
    height: Number(row.height ?? 0.2),
    rotation: Number(row.rotation ?? 0),
    is_visible_to_players: row.is_visible_to_players !== false,
    z_index: Number(row.z_index ?? 0),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}


export async function assertSessionGm(sessionId: string, userId: string) {
  const supabase = await createClient();
  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");

  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, userId)) {
    throw new Error("Nur der Spielleiter darf Battlemaps verwalten.");
  }
  return { supabase, campaignId };
}


export function clampNorm(value: number, min = 0, max = 1): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}


export function normalizeFogShape(row: Record<string, unknown>): SessionBattlemapFogShape {
  const shape = row.shape === "circle" ? "circle" : "rect";
  const gridW = Math.max(1, Math.min(200, Math.round(Number(row.grid_w ?? 1))));
  const gridH =
    shape === "circle"
      ? gridW
      : Math.max(1, Math.min(200, Math.round(Number(row.grid_h ?? 1))));
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    shape,
    grid_x: Math.round(Number(row.grid_x ?? 0)),
    grid_y: Math.round(Number(row.grid_y ?? 0)),
    grid_w: gridW,
    grid_h: gridH,
    z_index: Math.round(Number(row.z_index ?? 0)),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}


export type FogPresetShape = {
  shape: BattlemapFogShapeKind;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
  z_index?: number;
};


export async function persistFogPresetForBattlemap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  battlemapId: string,
): Promise<void> {
  const { data: mapRaw } = await (supabase as any)
    .from("session_battlemaps")
    .select("id, campaign_id, image_storage_path")
    .eq("id", battlemapId)
    .maybeSingle();
  const map = mapRaw as {
    campaign_id?: string;
    image_storage_path?: string | null;
  } | null;
  const path = map?.image_storage_path?.trim();
  const campaignId = map?.campaign_id ? String(map.campaign_id) : "";
  if (!path || !campaignId) return;

  const { data: shapesRaw } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .select("shape, grid_x, grid_y, grid_w, grid_h, z_index")
    .eq("battlemap_id", battlemapId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });

  const shapes: FogPresetShape[] = ((shapesRaw ?? []) as Record<string, unknown>[]).map(
    (row) => {
      const shape = row.shape === "circle" ? "circle" : "rect";
      const gridW = Math.max(1, Math.round(Number(row.grid_w ?? 1)));
      return {
        shape,
        grid_x: Math.round(Number(row.grid_x ?? 0)),
        grid_y: Math.round(Number(row.grid_y ?? 0)),
        grid_w: gridW,
        grid_h: shape === "circle" ? gridW : Math.max(1, Math.round(Number(row.grid_h ?? 1))),
        z_index: Math.round(Number(row.z_index ?? 0)),
      };
    },
  );

  const { error } = await (supabase as any).from("campaign_battlemap_fog_presets").upsert(
    {
      campaign_id: campaignId,
      image_storage_path: path,
      shapes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id,image_storage_path" },
  );
  if (error) {
    console.error("Fog-Preset speichern fehlgeschlagen:", error.message);
  }
}


export async function seedFogFromPresetIfEmpty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    battlemapId: string;
    sessionId: string;
    campaignId: string;
    imageStoragePath: string | null | undefined;
  },
): Promise<SessionBattlemapFogShape[]> {
  const { data: existing } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .select("id")
    .eq("battlemap_id", input.battlemapId)
    .limit(1);
  if (Array.isArray(existing) && existing.length > 0) return [];

  const path = input.imageStoragePath?.trim();
  if (!path) return [];

  const { data: presetRaw } = await (supabase as any)
    .from("campaign_battlemap_fog_presets")
    .select("shapes")
    .eq("campaign_id", input.campaignId)
    .eq("image_storage_path", path)
    .maybeSingle();
  const shapesRaw = (presetRaw as { shapes?: unknown } | null)?.shapes;
  if (!Array.isArray(shapesRaw) || shapesRaw.length === 0) return [];

  const rows = shapesRaw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const shape = row.shape === "circle" ? "circle" : "rect";
    const gridW = Math.max(1, Math.min(200, Math.round(Number(row.grid_w ?? 1))));
    return {
      battlemap_id: input.battlemapId,
      session_id: input.sessionId,
      campaign_id: input.campaignId,
      shape,
      grid_x: Math.round(Number(row.grid_x ?? 0)),
      grid_y: Math.round(Number(row.grid_y ?? 0)),
      grid_w: gridW,
      grid_h: shape === "circle" ? gridW : Math.max(1, Math.min(200, Math.round(Number(row.grid_h ?? 1)))),
      z_index: Math.round(Number(row.z_index ?? index)),
    };
  });

  const { data, error } = await (supabase as any)
    .from("session_battlemap_fog_shapes")
    .insert(rows)
    .select("*");
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(normalizeFogShape);
}


export function normalizeEffectTemplate(row: Record<string, unknown>): SessionBattlemapEffectTemplate {
  const shapeRaw = String(row.shape ?? "rect");
  const shape: BattlemapEffectShapeKind =
    shapeRaw === "circle" ? "circle" : shapeRaw === "cone" ? "cone" : "rect";
  const gridW = Math.max(1, Math.min(200, Math.round(Number(row.grid_w ?? 1))));
  const gridH =
    shape === "rect"
      ? Math.max(1, Math.min(200, Math.round(Number(row.grid_h ?? 1))))
      : gridW;
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    shape,
    grid_x: Math.round(Number(row.grid_x ?? 0)),
    grid_y: Math.round(Number(row.grid_y ?? 0)),
    grid_w: gridW,
    grid_h: gridH,
    direction_deg: Math.round(Number(row.direction_deg ?? 0)) % 360,
    z_index: Math.round(Number(row.z_index ?? 0)),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}


export function normalizeMarker(row: Record<string, unknown>): SessionBattlemapMarker {
  const kindRaw = String(row.kind ?? "fire");
  const kind: BattlemapMarkerKind = (
    BATTLEMAP_MARKER_KINDS as readonly string[]
  ).includes(kindRaw)
    ? (kindRaw as BattlemapMarkerKind)
    : "fire";
  return {
    id: String(row.id),
    battlemap_id: String(row.battlemap_id),
    session_id: String(row.session_id),
    campaign_id: String(row.campaign_id),
    kind,
    grid_x: Math.round(Number(row.grid_x ?? 0)),
    grid_y: Math.round(Number(row.grid_y ?? 0)),
    is_visible_to_players: row.is_visible_to_players !== false,
    z_index: Math.round(Number(row.z_index ?? 0)),
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}
