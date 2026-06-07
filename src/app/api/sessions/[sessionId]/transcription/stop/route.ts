import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { stopTranscriptionRecording } from "@/src/lib/session-chronicle/transcription-server";
import { schedulePendingTranscriptionChunksProcessing } from "@/src/lib/session-chronicle/process-chunk";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await stopTranscriptionRecording(supabase, sessionId);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  schedulePendingTranscriptionChunksProcessing(sessionId);

  return NextResponse.json({ success: true, status: result.status });
}
