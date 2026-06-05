import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { startTranscriptionSession } from "@/src/lib/session-chronicle/transcription-server";
import type { TranscriptionMode } from "@/src/lib/session-chronicle/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  let body: {
    mode?: TranscriptionMode;
    recordingNoticeAcknowledged?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (body.mode !== "table" && body.mode !== "jitsi") {
    return NextResponse.json({ error: "Modus (table|jitsi) fehlt." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await startTranscriptionSession(
    supabase,
    sessionId,
    body.mode,
    body.recordingNoticeAcknowledged === true,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    transcriptionSession: result.transcriptionSession,
  });
}
