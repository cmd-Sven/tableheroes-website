import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { uploadTranscriptionChunk } from "@/src/lib/session-chronicle/transcription-server";
import { AUDIO_CHUNK_OVERLAP_MS } from "@/src/lib/session-chronicle/constants";
import { scheduleTranscriptionChunkProcessing } from "@/src/lib/session-chronicle/process-chunk";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData erwartet." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Audio-Datei fehlt." }, { status: 400 });
  }

  const chunkIndex = Number(formData.get("chunkIndex"));
  if (!Number.isFinite(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ error: "chunkIndex ungültig." }, { status: 400 });
  }

  const durationMs = Number(formData.get("durationMs") ?? 0);
  const overlapMs = Number(formData.get("overlapMs") ?? AUDIO_CHUNK_OVERLAP_MS);
  const mimeType =
    (typeof formData.get("mimeType") === "string"
      ? String(formData.get("mimeType"))
      : null) || audio.type || "audio/webm";
  const liveMarkersJson =
    typeof formData.get("liveMarkers") === "string"
      ? String(formData.get("liveMarkers"))
      : null;

  const supabase = await createClient();
  const result = await uploadTranscriptionChunk(supabase, sessionId, {
    chunkIndex,
    durationMs: Number.isFinite(durationMs) ? durationMs : 0,
    overlapMs: Number.isFinite(overlapMs) ? overlapMs : AUDIO_CHUNK_OVERLAP_MS,
    audio,
    mimeType,
    liveMarkersJson,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  scheduleTranscriptionChunkProcessing(sessionId, result.chunkIndex);

  return NextResponse.json({
    success: true,
    storagePath: result.storagePath,
    chunkIndex: result.chunkIndex,
  });
}
