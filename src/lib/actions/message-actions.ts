"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type {
  GMNotification,
  GMRecipientCampaign,
  PlayerMessage,
} from "@/src/lib/queries/message-queries";

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
 * Setzt `is_read = true` und `read_at = now()` für eine Nachricht.
 * Nur erlaubt, wenn der User Empfänger ist (recipient_id = user.id) oder bei Broadcast.
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

  const { data: message } = await (supabase.from("messages") as any)
    .select("id, recipient_id, read_at, type")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    return { success: false, error: "Nachricht nicht gefunden." };
  }

  if (message.read_at) {
    return { success: true };
  }

  // Direktnachricht: Nur wenn recipient_id === user.id
  if (message.recipient_id) {
    if (message.recipient_id !== user.id) {
      return { success: false, error: "Keine Berechtigung." };
    }

    const { error } = await (supabase.from("messages") as any)
      .update({ read_at: now, is_read: true })
      .eq("id", messageId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("[markMessageAsRead:direct]", error);
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await (supabase.from("messages") as any)
      .update({ read_at: now, is_read: true })
      .eq("id", messageId)
      .is("recipient_id", null);

    if (error) {
      console.error("[markMessageAsRead:broadcast]", error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
  return { success: true };
}

// ============================================================================
// 5. Delete Message
// ============================================================================

/**
 * Löscht eine Nachricht. Nur erlaubt wenn recipient_id === user.id (Empfänger darf seine Kopie löschen).
 * Bei Broadcast (recipient_id null) wird nicht gelöscht – nur Direktnachrichten.
 */
export async function deleteMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht authentifiziert." };

  const { data: message } = await (supabase.from("messages") as any)
    .select("id, recipient_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) {
    return { success: false, error: "Nachricht nicht gefunden." };
  }

  // Nur eigene Nachrichten (Empfänger) dürfen gelöscht werden
  if (message.recipient_id !== user.id) {
    return { success: false, error: "Keine Berechtigung." };
  }

  const { error } = await (supabase.from("messages") as any)
    .delete()
    .eq("id", messageId)
    .eq("recipient_id", user.id);

  if (error) {
    console.error("[deleteMessage]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
  return { success: true };
}

/**
 * Löscht alle gelesenen Nachrichten des Users (recipient_id = user.id).
 */
export async function deleteAllReadMessages(
  userId: string
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { success: false, error: "Nicht autorisiert." };
  }

  const { data: rows, error: selectError } = await (supabase.from("messages") as any)
    .select("id")
    .eq("recipient_id", userId)
    .not("read_at", "is", null);

  if (selectError) {
    return { success: false, error: selectError.message };
  }

  const ids = ((rows as any[]) || []).map((r: any) => r.id);
  if (ids.length === 0) {
    return { success: true, deleted: 0 };
  }

  const { error: deleteError } = await (supabase.from("messages") as any)
    .delete()
    .eq("recipient_id", userId)
    .not("read_at", "is", null);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/messages");
  return { success: true, deleted: ids.length };
}
