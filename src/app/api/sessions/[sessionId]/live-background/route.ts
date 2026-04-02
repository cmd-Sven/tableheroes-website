import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { persistSessionLiveBackground } from "@/src/lib/persist-session-live-background";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

/**
 * POST { backgroundUrl: string | null } — GM setzt Session-Hintergrund.
 * Absichtlich keine Server Action: vermeidet den RSC-Refresh der aktuellen Seite (Next 16).
 */
export async function POST(request: Request, context: Ctx) {
  const { sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  let body: { backgroundUrl?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const result = await persistSessionLiveBackground(
    supabase,
    user.id,
    sessionId,
    body.backgroundUrl ?? null,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    backgroundUrl: result.backgroundUrl,
  });
}
