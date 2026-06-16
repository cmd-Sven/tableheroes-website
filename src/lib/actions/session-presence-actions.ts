"use server";

import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { isSessionStatusLive } from "@/src/lib/session-status";
import { normalizeUserIdList } from "@/src/lib/session-participation/resolve-participants";

/** Spieler hat die Live-Session-Seite geöffnet — für Teilnahme-Punkte persistieren. */
export async function registerSessionOnlinePresence(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
  } | null;

  if (!session || !isSessionStatusLive(session.status)) {
    return { ok: false, error: "Session ist nicht live." };
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .maybeSingle();

  if (
    isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    return { ok: true };
  }

  const { data: membership } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", session.campaign_id)
    .eq("user_id", user.id)
    .in("status", ["Approved", "Active"])
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Kein Kampagnenmitglied." };
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    return { ok: true };
  }

  const { data: liveRaw } = await (admin.from("session_live_states") as any)
    .select("online_present_user_ids")
    .eq("session_id", sessionId)
    .maybeSingle();

  const current = normalizeUserIdList(
    (liveRaw as { online_present_user_ids?: unknown } | null)?.online_present_user_ids,
  );
  if (current.includes(user.id)) {
    return { ok: true };
  }

  const { error } = await (admin.from("session_live_states") as any)
    .update({ online_present_user_ids: [...current, user.id] })
    .eq("session_id", sessionId);

  if (error?.message?.includes("online_present_user_ids")) {
    return { ok: true };
  }
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
