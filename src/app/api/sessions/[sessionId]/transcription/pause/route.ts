import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { setTranscriptionPaused } from "@/src/lib/session-chronicle/transcription-server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  let body: { paused?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await setTranscriptionPaused(supabase, sessionId, body.paused === true);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ success: true, status: result.status });
}
