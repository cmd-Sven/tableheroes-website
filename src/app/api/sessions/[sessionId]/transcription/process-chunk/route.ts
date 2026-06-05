import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { authorizeTranscriptionGm } from "@/src/lib/session-chronicle/transcription-server";
import { processTranscriptionChunk } from "@/src/lib/session-chronicle/process-chunk";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  let body: { chunkIndex?: number; force?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const chunkIndex = Number(body.chunkIndex);
  if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: "chunkIndex ungültig." }, { status: 400 });
  }

  const supabase = await createClient();
  const auth = await authorizeTranscriptionGm(supabase, sessionId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const result = await processTranscriptionChunk(sessionId, chunkIndex, {
    force: body.force === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message, chunkIndex: result.chunkIndex }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    chunkIndex: result.chunkIndex,
    transcriptLength: result.transcriptLength,
    skipped: result.skipped ?? false,
    newNpcs: result.summary.spontaneous_npcs.length,
    newLocations: result.summary.spontaneous_locations.length,
    newQuests: result.summary.spontaneous_quests.length,
  });
}
