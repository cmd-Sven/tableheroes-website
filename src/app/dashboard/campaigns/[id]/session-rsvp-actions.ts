"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RsvpStatus = "Zusage" | "Absage" | "Via Online";

/** Mindestens ein Charakter-Datensatz für die Kampagne (über Mitgliedschaft oder user_id+campaign_id). */
async function playerHasCharacterForCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  campaignId: string
): Promise<boolean> {
  const { data: m } = await (supabase.from("campaign_members") as any)
    .select("character_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  if ((m as { character_id?: string | null } | null)?.character_id) {
    const { data: ch } = await (supabase.from("characters") as any)
      .select("id")
      .eq("id", (m as { character_id: string }).character_id)
      .maybeSingle();
    return !!ch;
  }
  const { data: chRows } = await (supabase.from("characters") as any)
    .select("id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .limit(1);
  return Array.isArray(chRows) && chRows.length > 0;
}

/**
 * Spieler setzt seine RSVP für eine Session.
 * Bei is_live Sessions: nur 1 "Via Online" Platz – prüfen ob bereits vergeben.
 * @param context Optional: campaignId, isLive – aus dem Frontend, um Session-SELECT zu vermeiden (RLS kann Spieler blockieren).
 */
export async function setSessionRsvp(
  sessionId: string,
  rsvpStatus: RsvpStatus,
  context?: { campaignId: string; isLive: boolean }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht authentifiziert." };

  let campaignId: string;
  let isLive: boolean;

  if (context) {
    campaignId = context.campaignId;
    isLive = context.isLive;
    // Prüfen: User muss Kampagnenmitglied sein
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .in("status", ["Accepted", "Approved", "Drafting", "In_Review"])
      .maybeSingle();
    if (!member) {
      return { success: false, error: "Keine Berechtigung für diese Kampagne." };
    }
  } else {
    const { data: session, error } = await (supabase.from("sessions") as any)
      .select("id, campaign_id, is_live")
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error("[setSessionRsvp] Session-Load-Fehler:", error);
      return { success: false, error: "Session nicht gefunden." };
    }
    if (!session) return { success: false, error: "Session nicht gefunden." };
    campaignId = session.campaign_id as string;
    isLive = session.is_live !== false;
  }

  const { data: campaignRow } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .maybeSingle();
  const isCampaignGm = (campaignRow as { gm_id?: string } | null)?.gm_id === user.id;

  const hasChar = await playerHasCharacterForCampaign(supabase, user.id, campaignId);
  if (!hasChar && !isCampaignGm) {
    return {
      success: false,
      error:
        "Rückmeldung zu Terminen ist erst möglich, wenn du einen Charakter für diese Kampagne erstellt hast.",
    };
  }

  if (rsvpStatus === "Via Online" && isLive) {
    const { data: existingViaOnline } = await (supabase.from("session_rsvps") as any)
      .select("id")
      .eq("session_id", sessionId)
      .eq("rsvp_status", "Via Online")
      .neq("user_id", user.id)
      .maybeSingle();

    if (existingViaOnline) {
      return { success: false, error: "Der Online-Platz ist bereits vergeben." };
    }
  }

  const nowIso = new Date().toISOString();

  const { data: existingRsvp } = await (supabase.from("session_rsvps") as any)
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  let writeError: { message: string; code?: string } | null = null;

  if (existingRsvp?.id) {
    const { error } = await (supabase.from("session_rsvps") as any)
      .update({ rsvp_status: rsvpStatus, updated_at: nowIso })
      .eq("id", existingRsvp.id)
      .eq("user_id", user.id);
    writeError = error ?? null;
  } else {
    const { error } = await (supabase.from("session_rsvps") as any).insert({
      session_id: sessionId,
      user_id: user.id,
      rsvp_status: rsvpStatus,
      updated_at: nowIso,
    });
    writeError = error ?? null;
    if (writeError?.message?.includes("duplicate") || writeError?.code === "23505") {
      const { error: retryErr } = await (supabase.from("session_rsvps") as any)
        .update({ rsvp_status: rsvpStatus, updated_at: nowIso })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);
      writeError = retryErr ?? null;
    }
  }

  if (writeError) {
    console.error("[setSessionRsvp] DB:", writeError);
    return { success: false, error: writeError.message || "Rückmeldung konnte nicht gespeichert werden." };
  }

  revalidatePath("/dashboard");
  if (campaignId) revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/sessions");
  return { success: true };
}

/**
 * GM bestätigt einen Spieler manuell.
 */
export async function setGmConfirmed(
  sessionId: string,
  userId: string,
  confirmed: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht authentifiziert." };

  const { data: session } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  if (!session) return { success: false, error: "Session nicht gefunden." };

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", session.campaign_id)
    .single();

  if (!campaign || (campaign as any).gm_id !== user.id) {
    return { success: false, error: "Nur der GM kann bestätigen." };
  }

  const { data: existing } = await (supabase.from("session_rsvps") as any)
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await (supabase.from("session_rsvps") as any)
      .update({ gm_confirmed: confirmed, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await (supabase.from("session_rsvps") as any).insert({
      session_id: sessionId,
      user_id: userId,
      rsvp_status: "Zusage",
      gm_confirmed: confirmed,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  return { success: true };
}

/**
 * GM setzt Anmeldefrist und is_live für eine Session.
 */
export async function updateSessionRsvpSettings(
  sessionId: string,
  rsvpDeadlineDays: 1 | 2 | 3 | null,
  isLive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht authentifiziert." };

  const { data: session, error: sessionErr } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !session) {
    console.error("[updateSessionRsvpSettings] Session:", sessionErr);
    return { success: false, error: sessionErr?.message || "Session nicht gefunden." };
  }

  const { data: campaign, error: campErr } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", session.campaign_id)
    .maybeSingle();

  if (campErr || !campaign || (campaign as any).gm_id !== user.id) {
    return { success: false, error: "Nur der GM kann Einstellungen ändern." };
  }

  const patch: Record<string, unknown> = { is_live: isLive };
  if (rsvpDeadlineDays === null) {
    patch.rsvp_deadline_days = null;
  } else {
    patch.rsvp_deadline_days = rsvpDeadlineDays;
  }

  const { error } = await (supabase.from("sessions") as any)
    .update(patch)
    .eq("id", sessionId);

  if (error) {
    console.error("[updateSessionRsvpSettings] Update:", error);
    const msg = error.message || "";
    if (msg.includes("rsvp_deadline_days") || msg.includes("is_live") || msg.includes("column")) {
      return {
        success: false,
        error:
          "Datenbank-Spalten fehlen (rsvp_deadline_days / is_live). Bitte Migration 20260226100000_session_rsvps_and_settings.sql in Supabase ausführen.",
      };
    }
    return { success: false, error: msg || "Einstellungen konnten nicht gespeichert werden." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  return { success: true };
}
