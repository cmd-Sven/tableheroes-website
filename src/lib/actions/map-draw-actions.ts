/**
 * map-draw-actions — Persist freehand strokes on battlemap or world map during live sessions.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  MAP_DRAW_DEFAULT_COLOR,
  MAP_DRAW_DEFAULT_WIDTH,
  normalizeMapDrawStroke,
  type MapDrawPoint,
  type SessionMapDrawStroke,
} from "@/src/lib/session/map-draw-types";

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
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    throw new Error("Nur der Spielleiter darf zeichnen.");
  }
  return { supabase, user, campaignId };
}

function sanitizePoints(points: MapDrawPoint[]): MapDrawPoint[] {
  return points
    .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .slice(0, 4000);
}

export async function listMapDrawStrokes(input: {
  sessionId: string;
  battlemapId?: string | null;
  worldMapId?: string | null;
}): Promise<SessionMapDrawStroke[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  let q = (supabase as any)
    .from("session_map_draw_strokes")
    .select("*")
    .eq("session_id", input.sessionId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (input.battlemapId) {
    q = q.eq("battlemap_id", input.battlemapId);
  } else if (input.worldMapId) {
    q = q.eq("world_map_id", input.worldMapId);
  } else {
    return [];
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMapDrawStroke);
}

export async function createMapDrawStroke(input: {
  sessionId: string;
  battlemapId?: string | null;
  worldMapId?: string | null;
  color?: string;
  strokeWidth?: number;
  points: MapDrawPoint[];
}): Promise<SessionMapDrawStroke> {
  const { supabase, campaignId } = await assertSessionGm(input.sessionId);

  const hasBattle = Boolean(input.battlemapId);
  const hasWorld = Boolean(input.worldMapId);
  if (hasBattle === hasWorld) {
    throw new Error("Genau eine Zielkarte (Battlemap oder Weltkarte) angeben.");
  }

  const points = sanitizePoints(input.points);
  if (points.length < 2) throw new Error("Zeichnung zu kurz.");

  const colorRaw = (input.color ?? MAP_DRAW_DEFAULT_COLOR).trim();
  const color = /^#[0-9A-Fa-f]{6}$/.test(colorRaw) ? colorRaw : MAP_DRAW_DEFAULT_COLOR;
  const strokeWidth = Math.max(
    1,
    Math.min(64, Math.round(input.strokeWidth ?? MAP_DRAW_DEFAULT_WIDTH)),
  );

  const { data, error } = await (supabase as any)
    .from("session_map_draw_strokes")
    .insert({
      session_id: input.sessionId,
      campaign_id: campaignId,
      battlemap_id: input.battlemapId ?? null,
      world_map_id: input.worldMapId ?? null,
      color,
      stroke_width: strokeWidth,
      points,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeMapDrawStroke(data as Record<string, unknown>);
}

export async function removeMapDrawStroke(
  strokeId: string,
  sessionId: string,
): Promise<void> {
  const { supabase } = await assertSessionGm(sessionId);
  const { error } = await (supabase as any)
    .from("session_map_draw_strokes")
    .delete()
    .eq("id", strokeId)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
}

export async function clearMapDrawStrokes(input: {
  sessionId: string;
  battlemapId?: string | null;
  worldMapId?: string | null;
}): Promise<void> {
  const { supabase } = await assertSessionGm(input.sessionId);

  let q = (supabase as any)
    .from("session_map_draw_strokes")
    .delete()
    .eq("session_id", input.sessionId);

  if (input.battlemapId) {
    q = q.eq("battlemap_id", input.battlemapId);
  } else if (input.worldMapId) {
    q = q.eq("world_map_id", input.worldMapId);
  } else {
    throw new Error("Zielkarte fehlt.");
  }

  const { error } = await q;
  if (error) throw new Error(error.message);
}

/** Löscht den zuletzt angelegten Stroke auf der Zielkarte. */
export async function undoLastMapDrawStroke(input: {
  sessionId: string;
  battlemapId?: string | null;
  worldMapId?: string | null;
}): Promise<string | null> {
  const { supabase } = await assertSessionGm(input.sessionId);

  let q = (supabase as any)
    .from("session_map_draw_strokes")
    .select("id")
    .eq("session_id", input.sessionId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.battlemapId) {
    q = q.eq("battlemap_id", input.battlemapId);
  } else if (input.worldMapId) {
    q = q.eq("world_map_id", input.worldMapId);
  } else {
    throw new Error("Zielkarte fehlt.");
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const id = String((data as { id: string }).id);
  await removeMapDrawStroke(id, input.sessionId);
  return id;
}
