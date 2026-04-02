import { isCampaignGm } from "@/src/lib/campaign-gm";

type SupabaseLike = {
  from: (t: string) => any;
};

/**
 * GM: session_live_states.background_url setzen (ohne revalidatePath / Server-Action).
 * Von API-Route und optional anderen Server-Kontexten nutzbar.
 */
export async function persistSessionLiveBackground(
  supabase: SupabaseLike,
  userId: string,
  sessionId: string,
  backgroundUrl: string | null,
): Promise<
  | { ok: true; backgroundUrl: string | null }
  | { ok: false; message: string; status: number }
> {
  const { data: sessionRaw, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;
  if (sessionError || !session) {
    return { ok: false, message: "Session nicht gefunden.", status: 404 };
  }

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  if (!isCampaignGm(campaign, userId)) {
    return { ok: false, message: "Nur der GM kann den Hintergrund ändern.", status: 403 };
  }

  const trimmed =
    backgroundUrl != null && String(backgroundUrl).trim() !== ""
      ? String(backgroundUrl).trim()
      : null;

  const { data: existing } = await supabase
    .from("session_live_states")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const { error: upErr } = await supabase
      .from("session_live_states")
      .update({ background_url: trimmed })
      .eq("session_id", sessionId);
    if (upErr) {
      if (
        upErr.message?.includes("background_url") ||
        upErr.message?.includes("column")
      ) {
        return {
          ok: false,
          message:
            "Spalte background_url fehlt. Bitte Migration session_live_states_background_url ausführen.",
          status: 500,
        };
      }
      return { ok: false, message: upErr.message || "Speichern fehlgeschlagen.", status: 500 };
    }
  } else {
    // Minimaler Insert: vermeidet PostgREST-Fehler, wenn optionale Spalten in der DB fehlen
    // (Schema-Cache). Weitere Spalten setzen Migration / ensureSessionPrepLiveState.
    const { error: insErr } = await supabase.from("session_live_states").insert({
      session_id: sessionId,
      background_url: trimmed,
      scribe_id: userId,
    });
    if (insErr) {
      return {
        ok: false,
        message: insErr.message || "Live-Zustand konnte nicht angelegt werden.",
        status: 500,
      };
    }
  }

  return { ok: true, backgroundUrl: trimmed };
}
