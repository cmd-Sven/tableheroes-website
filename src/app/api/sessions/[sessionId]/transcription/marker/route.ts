import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { appendLiveMarker } from "@/src/lib/session-chronicle/transcription-server";
import type { LiveMarkerType } from "@/src/lib/session-chronicle/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  let body: {
    type?: LiveMarkerType;
    at_ms?: number;
    label?: string;
    chunk_index?: number;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (
    body.type !== "npc" &&
    body.type !== "location" &&
    body.type !== "quest" &&
    body.type !== "pause" &&
    body.type !== "gm_action"
  ) {
    return NextResponse.json({ error: "Ungültiger Marker-Typ." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await appendLiveMarker(
    supabase,
    sessionId,
    {
      type: body.type,
      at_ms: Number(body.at_ms ?? 0),
      label: body.label?.trim() || undefined,
    },
    body.chunk_index != null ? Number(body.chunk_index) : undefined,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    chunkIndex: result.chunkIndex,
    markers: result.markers,
  });
}
