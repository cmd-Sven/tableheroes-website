import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/server";
import { readGuestSessionCookie } from "@/src/lib/session-guest-auth";
import { touchGuestSession } from "@/src/app/session/guest-actions";

export const dynamic = "force-dynamic";

/** Live-State für Gäste (Cookie-Auth, kein Supabase-Login). */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId fehlt." }, { status: 400 });
  }

  const guest = await readGuestSessionCookie();
  if (!guest || guest.sessionId !== sessionId) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: participant } = await (admin as any)
    .from("session_guest_participants")
    .select("id, display_name, slot_index")
    .eq("id", guest.guestId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ ok: false, error: "Gast nicht gefunden." }, { status: 403 });
  }

  const { data: liveState, error } = await (admin.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error || !liveState) {
    return NextResponse.json({ ok: false, error: "Live-Zustand nicht verfügbar." }, { status: 404 });
  }

  void touchGuestSession(guest.guestId, sessionId);

  const { data: sessionRaw } = await (admin.from("sessions") as any)
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    session_status: (sessionRaw as { status?: string } | null)?.status ?? "Live",
    live_state: liveState,
    guest: {
      id: guest.guestId,
      display_name: (participant as { display_name: string }).display_name,
      slot_index: (participant as { slot_index: number }).slot_index,
    },
  });
}
