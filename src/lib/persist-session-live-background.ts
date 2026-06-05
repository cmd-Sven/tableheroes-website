import { isCampaignGm } from "@/src/lib/campaign-gm";
import { createAdminClient } from "@/src/lib/supabase/server";

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

  let writeClient = supabase;
  try {
    writeClient = createAdminClient();
  } catch (error) {
    console.warn(
      "[persistSessionLiveBackground] Admin-Client nicht verfügbar, verwende RLS-Client.",
      error,
    );
  }

  const { data: existing } = await writeClient
    .from("session_live_states")
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const { error: upErr } = await writeClient
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
    const insertPayload = {
      session_id: sessionId,
      background_url: trimmed,
      weather: "Klar",
      temperature: "normal",
      temperature_value: 15,
      current_time: "Tag",
      current_location: null,
      journal_text: null,
      system_logs: [],
      visible_npc_ids: [],
      visible_faction_ids: [],
      is_background_manual_override: false,
      is_combat_mode: false,
      current_turn_index: 0,
      scribe_id: userId,
    };
    const { error: insErr } = await writeClient.from("session_live_states").insert(insertPayload);
    if (insErr) {
      console.error("Supabase Insert Error:", insErr);
      console.error("[persistSessionLiveBackground] Insert Context:", {
        payload: insertPayload,
        session,
        campaign,
        userId,
      });
      return {
        ok: false,
        message: insErr.message || "Live-Zustand konnte nicht angelegt werden.",
        status: 500,
      };
    }
  }

  return { ok: true, backgroundUrl: trimmed };
}
