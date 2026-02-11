"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// Types
// ============================================================================

export type GMNotification = {
  id: string;
  type:
    | "application"
    | "character_update"
    | "session_completed"
    | "system";
  message: string;
  /** Link-Ziel (z.B. /dashboard/campaigns/xyz/gm-inbox) */
  href: string | null;
  campaignId: string | null;
  campaignName: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
};

export type GMRecipientCampaign = {
  id: string;
  name: string;
  members: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    characterName: string | null;
  }[];
};

// ============================================================================
// 1. GM Notifications – Synthetisiert aus bestehenden Daten
// ============================================================================

/**
 * Lädt die neuesten Benachrichtigungen für den GM.
 * Generiert werden diese aus:
 * - Neue Bewerbungen (campaign_members status = 'Applied')
 * - Ausstehende Charakter-Genehmigungen (characters status = 'Pending')
 * - Abgeschlossene Sessions (sessions status = 'Completed', letzte 7 Tage)
 */
export async function getGMNotifications(
  userId: string
): Promise<GMNotification[]> {
  const supabase = await createClient();
  const notifications: GMNotification[] = [];

  // 1a. GM-Kampagnen-IDs abrufen
  const { data: gmCampaigns } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("gm_id", userId);

  const campaignList = (gmCampaigns as any[]) || [];
  if (campaignList.length === 0) return [];

  const campaignIds = campaignList.map((c: any) => c.id as string);
  const campaignMap = new Map<string, string>(
    campaignList.map((c: any) => [c.id, c.name])
  );

  // 1b. Neue Bewerbungen (Applied)
  const { data: applicationsRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("id, campaign_id, user_id, created_at, users ( username, avatar_url )")
    .in("campaign_id", campaignIds)
    .eq("status", "Applied")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const app of (applicationsRaw as any[]) || []) {
    const username = (app.users as any)?.username ?? "Unbekannt";
    const campaignName = campaignMap.get(app.campaign_id) ?? "Kampagne";
    notifications.push({
      id: `app-${app.id}`,
      type: "application",
      message: `Neue Bewerbung von ${username} für „${campaignName}"`,
      href: `/dashboard/campaigns/${app.campaign_id}/gm-inbox`,
      campaignId: app.campaign_id,
      campaignName,
      actorName: username,
      actorAvatarUrl: (app.users as any)?.avatar_url ?? null,
      createdAt: app.created_at,
    });
  }

  // 1c. Ausstehende Charaktere (Pending Approval)
  const { data: pendingCharsRaw } = await (
    supabase.from("characters") as any
  )
    .select(
      "id, name, campaign_id, user_id, updated_at, users ( username, avatar_url )"
    )
    .in("campaign_id", campaignIds)
    .eq("status", "Pending")
    .order("updated_at", { ascending: false })
    .limit(10);

  for (const char of (pendingCharsRaw as any[]) || []) {
    const username = (char.users as any)?.username ?? "Unbekannt";
    const campaignName = campaignMap.get(char.campaign_id) ?? "Kampagne";
    notifications.push({
      id: `char-${char.id}`,
      type: "character_update",
      message: `Charakterbogen „${char.name}" von ${username} wartet auf Freigabe`,
      href: `/dashboard/campaigns/${char.campaign_id}/gm-inbox`,
      campaignId: char.campaign_id,
      campaignName,
      actorName: username,
      actorAvatarUrl: (char.users as any)?.avatar_url ?? null,
      createdAt: char.updated_at ?? new Date().toISOString(),
    });
  }

  // 1d. Kürzlich abgeschlossene Sessions (letzte 7 Tage)
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: completedSessionsRaw } = await (
    supabase.from("sessions") as any
  )
    .select("id, title, campaign_id, end_time")
    .in("campaign_id", campaignIds)
    .eq("status", "Completed")
    .gte("end_time", oneWeekAgo)
    .order("end_time", { ascending: false })
    .limit(5);

  for (const sess of (completedSessionsRaw as any[]) || []) {
    const campaignName = campaignMap.get(sess.campaign_id) ?? "Kampagne";
    notifications.push({
      id: `sess-${sess.id}`,
      type: "session_completed",
      message: `Session „${sess.title || "Unbenannt"}" in ${campaignName} wurde abgeschlossen`,
      href: `/dashboard/campaigns/${sess.campaign_id}`,
      campaignId: sess.campaign_id,
      campaignName,
      actorName: null,
      actorAvatarUrl: null,
      createdAt: sess.end_time ?? new Date().toISOString(),
    });
  }

  // Sortieren: neueste zuerst
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return notifications.slice(0, 15);
}

// ============================================================================
// 2. GM Recipients – Kampagnen + akzeptierte Spieler
// ============================================================================

/**
 * Lädt alle Kampagnen des GMs mit deren bestätigten Mitgliedern.
 * Dient als Empfänger-Auswahl für den Messenger.
 */
export async function getGMRecipients(
  userId: string
): Promise<GMRecipientCampaign[]> {
  const supabase = await createClient();

  // GM-Kampagnen
  const { data: gmCampaigns } = await (supabase.from("campaigns") as any)
    .select("id, name")
    .eq("gm_id", userId)
    .order("name", { ascending: true });

  const campaignList = (gmCampaigns as any[]) || [];
  if (campaignList.length === 0) return [];

  const campaignIds = campaignList.map((c: any) => c.id as string);

  // Alle akzeptierten Mitglieder dieser Kampagnen (ohne den GM selbst)
  const { data: membersRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select(
      `
      campaign_id,
      user_id,
      users ( id, username, avatar_url ),
      characters ( name )
    `
    )
    .in("campaign_id", campaignIds)
    .eq("status", "Accepted")
    .neq("user_id", userId);

  const membersMap = new Map<
    string,
    {
      userId: string;
      username: string;
      avatarUrl: string | null;
      characterName: string | null;
    }[]
  >();

  for (const m of (membersRaw as any[]) || []) {
    const cId = m.campaign_id as string;
    if (!membersMap.has(cId)) membersMap.set(cId, []);
    membersMap.get(cId)!.push({
      userId: (m.users as any)?.id ?? m.user_id,
      username: (m.users as any)?.username ?? "Unbekannt",
      avatarUrl: (m.users as any)?.avatar_url ?? null,
      characterName: (m.characters as any)?.name ?? null,
    });
  }

  return campaignList.map((c: any) => ({
    id: c.id,
    name: c.name ?? "Kampagne",
    members: membersMap.get(c.id) ?? [],
  }));
}

// ============================================================================
// 3. Send Message
// ============================================================================

export type SendMessageInput = {
  /** 'broadcast' oder 'direct' */
  type: "broadcast" | "direct";
  /** Bei broadcast: campaignId, bei direct: recipientUserId */
  campaignId?: string;
  recipientUserId?: string;
  subject: string;
  content: string;
  /** 'normal' oder 'high' */
  priority?: "normal" | "high";
};

/**
 * Versendet eine Nachricht. Bei 'campaign_broadcast' wird eine Nachricht
 * an alle akzeptierten Spieler der Kampagne erstellt.
 * Bei 'direct' an einen einzelnen Spieler.
 *
 * Schreibt in die `messages`-Tabelle.
 * Falls die Tabelle noch nicht existiert, wird ein hilfreicher Fehler ausgegeben.
 */
export async function sendMessage(
  input: SendMessageInput
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht authentifiziert." };

  if (!input.subject?.trim()) {
    return { success: false, error: "Bitte gib einen Betreff ein." };
  }
  if (!input.content?.trim()) {
    return { success: false, error: "Bitte gib eine Nachricht ein." };
  }

  const priority = input.priority ?? "normal";

  // GM-Check: User muss Kampagnen leiten
  const { data: gmCampaigns } = await (supabase.from("campaigns") as any)
    .select("id")
    .eq("gm_id", user.id);

  const gmCampaignIds = new Set(
    ((gmCampaigns as any[]) || []).map((c: any) => c.id as string)
  );

  if (gmCampaignIds.size === 0) {
    return {
      success: false,
      error: "Du leitest keine Kampagnen.",
    };
  }

  if (input.type === "broadcast") {
    // ── Kampagnen-Rundbrief: eine Zeile mit recipient_id = null ──
    if (!input.campaignId || !gmCampaignIds.has(input.campaignId)) {
      return {
        success: false,
        error: "Ungültige Kampagne oder du bist nicht der GM.",
      };
    }

    // Prüfe ob es Spieler gibt
    const { data: members } = await (
      supabase.from("campaign_members") as any
    )
      .select("user_id")
      .eq("campaign_id", input.campaignId)
      .eq("status", "Accepted")
      .neq("user_id", user.id);

    const memberCount = ((members as any[]) || []).length;
    if (memberCount === 0) {
      return {
        success: false,
        error: "Keine bestätigten Spieler in dieser Kampagne.",
      };
    }

    const { error } = await (supabase.from("messages") as any).insert({
      sender_id: user.id,
      recipient_id: null,
      campaign_id: input.campaignId,
      subject: input.subject.trim(),
      content: input.content.trim(),
      type: "broadcast",
      priority,
    });

    if (error) {
      console.error("[sendMessage:broadcast]", error);
      return {
        success: false,
        error: error.message ?? "Nachricht konnte nicht gesendet werden.",
      };
    }

    revalidatePath("/dashboard");
    return { success: true, count: memberCount };
  }

  // ── Direktnachricht ──
  if (!input.recipientUserId) {
    return { success: false, error: "Kein Empfänger angegeben." };
  }

  // Prüfen, ob der Empfänger in einer der GM-Kampagnen ist
  const { data: membership } = await (
    supabase.from("campaign_members") as any
  )
    .select("user_id, campaign_id")
    .eq("user_id", input.recipientUserId)
    .eq("status", "Accepted")
    .in("campaign_id", Array.from(gmCampaignIds))
    .limit(1);

  if (!membership || (membership as any[]).length === 0) {
    return {
      success: false,
      error: "Der Spieler ist in keiner deiner Kampagnen.",
    };
  }

  const { error } = await (supabase.from("messages") as any).insert({
    sender_id: user.id,
    recipient_id: input.recipientUserId,
    campaign_id: input.campaignId ?? null,
    subject: input.subject.trim(),
    content: input.content.trim(),
    type: "direct",
    priority,
  });

  if (error) {
    console.error("[sendMessage:direct]", error);
    return {
      success: false,
      error: error.message ?? "Nachricht konnte nicht gesendet werden.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true, count: 1 };
}

// ============================================================================
// 4. Mark Message as Read
// ============================================================================

/**
 * Setzt `read_at` auf now() für eine Nachricht.
 *
 * - Direktnachrichten: Update nur wenn recipient_id == user.id
 * - Broadcasts (recipient_id IS NULL): Erstelle/Update einen Eintrag in
 *   `message_reads` ODER setze direkt read_at (falls kein separater Tracker).
 *
 * Aktuell: Einfaches Update auf der messages-Zeile, mit separatem Handling
 * für direct vs. broadcast.
 */
export async function markMessageAsRead(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht authentifiziert." };

  const now = new Date().toISOString();

  // Zuerst die Nachricht laden, um den Typ zu prüfen
  const { data: message } = await (supabase.from("messages") as any)
    .select("id, recipient_id, read_at, type")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    return { success: false, error: "Nachricht nicht gefunden." };
  }

  // Schon gelesen? Dann nichts tun.
  if (message.read_at) {
    return { success: true };
  }

  // Direktnachricht: Nur updaten wenn der User der Empfänger ist
  if (message.recipient_id) {
    if (message.recipient_id !== user.id) {
      return { success: false, error: "Keine Berechtigung." };
    }

    const { error } = await (supabase.from("messages") as any)
      .update({ read_at: now })
      .eq("id", messageId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("[markMessageAsRead:direct]", error);
      return { success: false, error: error.message };
    }
  } else {
    // Broadcast: read_at direkt auf der Zeile setzen
    // (Hinweis: bei mehreren Empfängern wäre eine message_reads-Tabelle besser)
    const { error } = await (supabase.from("messages") as any)
      .update({ read_at: now })
      .eq("id", messageId)
      .is("recipient_id", null);

    if (error) {
      console.error("[markMessageAsRead:broadcast]", error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ============================================================================
// 5. Get Player Messages
// ============================================================================

export type PlayerMessage = {
  id: string;
  subject: string;
  content: string;
  type: "broadcast" | "direct";
  priority: "normal" | "high";
  senderName: string;
  senderAvatarUrl: string | null;
  campaignId: string | null;
  campaignName: string | null;
  createdAt: string;
  readAt: string | null;
};

/**
 * Lädt alle Nachrichten für einen Spieler:
 * - Direktnachrichten (recipient_id = userId)
 * - Broadcasts aus Kampagnen, in denen der User Mitglied ist
 */
export async function getPlayerMessages(
  userId: string
): Promise<PlayerMessage[]> {
  const supabase = await createClient();

  // Kampagnen, in denen der User Mitglied ist
  const { data: memberRows } = await (
    supabase.from("campaign_members") as any
  )
    .select("campaign_id")
    .eq("user_id", userId)
    .eq("status", "Accepted");

  const campaignIds = ((memberRows as any[]) || []).map(
    (m: any) => m.campaign_id as string
  );

  // Direkte Nachrichten
  const { data: directRaw } = await (supabase.from("messages") as any)
    .select(
      "id, subject, content, type, priority, sender_id, campaign_id, created_at, read_at, users:sender_id ( username, avatar_url )"
    )
    .eq("recipient_id", userId)
    .eq("type", "direct")
    .order("created_at", { ascending: false })
    .limit(20);

  // Broadcasts aus den Kampagnen des Users
  let broadcastRaw: any[] = [];
  if (campaignIds.length > 0) {
    const { data } = await (supabase.from("messages") as any)
      .select(
        "id, subject, content, type, priority, sender_id, campaign_id, created_at, read_at, users:sender_id ( username, avatar_url )"
      )
      .is("recipient_id", null)
      .eq("type", "broadcast")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false })
      .limit(20);
    broadcastRaw = (data as any[]) || [];
  }

  // Kampagnennamen laden
  const allCampaignIds = [
    ...new Set([
      ...((directRaw as any[]) || [])
        .map((m: any) => m.campaign_id)
        .filter(Boolean),
      ...broadcastRaw.map((m: any) => m.campaign_id).filter(Boolean),
    ]),
  ];

  const campaignNameMap = new Map<string, string>();
  if (allCampaignIds.length > 0) {
    const { data: cData } = await (supabase.from("campaigns") as any)
      .select("id, name")
      .in("id", allCampaignIds);
    for (const c of (cData as any[]) || []) {
      campaignNameMap.set(c.id, c.name);
    }
  }

  // Zusammenführen und mappen
  const allMessages = [...((directRaw as any[]) || []), ...broadcastRaw];

  const mapped: PlayerMessage[] = allMessages.map((m: any) => ({
    id: m.id,
    subject: m.subject ?? "",
    content: m.content ?? "",
    type: m.type === "broadcast" ? "broadcast" : "direct",
    priority: m.priority === "high" ? "high" : "normal",
    senderName: (m.users as any)?.username ?? "Spielleiter",
    senderAvatarUrl: (m.users as any)?.avatar_url ?? null,
    campaignId: m.campaign_id ?? null,
    campaignName: m.campaign_id
      ? campaignNameMap.get(m.campaign_id) ?? null
      : null,
    createdAt: m.created_at,
    readAt: m.read_at ?? null,
  }));

  // Sortieren nach Datum (neueste zuerst)
  mapped.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return mapped.slice(0, 20);
}
