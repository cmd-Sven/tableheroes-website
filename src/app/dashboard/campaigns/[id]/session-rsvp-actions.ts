"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RsvpStatus = "Zusage" | "Absage" | "Via Online";

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
      .in("status", ["Accepted", "Approved", "Active", "Drafting", "In_Review"])
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

  const { error } = await (supabase.from("session_rsvps") as any)
    .upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        rsvp_status: rsvpStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,user_id" }
    );

  if (error) return { success: false, error: error.message };
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
    return { success: false, error: "Nur der GM kann Einstellungen ändern." };
  }

  const { error } = await (supabase.from("sessions") as any)
    .update({
      rsvp_deadline_days: rsvpDeadlineDays,
      is_live: isLive,
    })
    .eq("id", sessionId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);
  return { success: true };
}
