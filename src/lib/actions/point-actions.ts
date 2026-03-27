"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getPointsLog } from "@/src/lib/queries/point-queries";
import type { PointLogEntry } from "@/src/lib/types/point-log";

// PointLogEntry nicht re-exportieren: In "use server"-Modulen kann Turbopack
// `export type { … }` fälschlich als Laufzeit-Export auswerten → ReferenceError.

// ============================================================================
// Types
// ============================================================================

export type MemberDetailData = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
  achievements: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    pointsAwarded: number;
  }>;
  pointsLog: PointLogEntry[];
  nextSessionStatus: "accepted" | "declined" | "pending" | null;
};

// ============================================================================
// Get Extended Member Details for GM
// ============================================================================

export async function getMemberDetails(
  userId: string,
  campaignId: string
): Promise<{ success: boolean; data?: MemberDetailData; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet." };

  // GM-Check
  const { data: campaignData } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaignData || (campaignData as any).gm_id !== user.id) {
    return {
      success: false,
      error: "Nur der Spielleiter kann Mitglieder-Details einsehen.",
    };
  }

  // Fetch user data
  const { data: userData, error: userError } = await (
    supabase.from("users") as any
  )
    .select("id, username, avatar_url, total_points")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !userData) {
    return { success: false, error: "Spieler nicht gefunden." };
  }

  // Fetch achievements
  const { data: achData, error: achError } = await (supabase.from("user_achievements") as any)
    .select(
      "id, awarded_at, achievements:achievement_id ( id, name, image_url, points_awarded )"
    )
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false });

  if (achError) {
    console.error("[getMemberDetails] Fehler beim Laden der Achievements:", achError);
  }

  const achievements = ((achData as any[]) || [])
    .filter((row: any) => row.achievements)
    .map((row: any) => ({
      id: row.achievements.id,
      name: row.achievements.name,
      imageUrl: row.achievements.image_url ?? null,
      pointsAwarded: row.achievements.points_awarded ?? 0,
    }));

  console.log("[getMemberDetails] Achievements geladen für User:", userId, "Anzahl:", achievements.length);

  // Fetch points log
  const pointsLog = await getPointsLog(userId, 5);
  console.log("[getMemberDetails] Points Log geladen für User:", userId, "Anzahl:", pointsLog.length);

  // Fetch next session status
  const { data: nextSessionData } = await (
    supabase.from("campaign_sessions") as any
  )
    .select(
      "id, scheduled_for, session_participants!inner ( id, user_id, status )"
    )
    .eq("campaign_id", campaignId)
    .gte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  let nextSessionStatus: "accepted" | "declined" | "pending" | null = null;
  if (nextSessionData && (nextSessionData as any).session_participants) {
    const participants = Array.isArray((nextSessionData as any).session_participants)
      ? (nextSessionData as any).session_participants
      : [(nextSessionData as any).session_participants];

    const userParticipation = participants.find(
      (p: any) => p.user_id === userId
    );
    if (userParticipation) {
      const status = userParticipation.status?.toLowerCase();
      if (status === "accepted") nextSessionStatus = "accepted";
      else if (status === "declined") nextSessionStatus = "declined";
      else nextSessionStatus = "pending";
    } else {
      nextSessionStatus = "pending";
    }
  }

  return {
    success: true,
    data: {
      userId: (userData as any).id,
      username: (userData as any).username ?? "Unbekannt",
      avatarUrl: (userData as any).avatar_url ?? null,
      totalPoints: Number((userData as any).total_points) || 0,
      achievements,
      pointsLog,
      nextSessionStatus,
    },
  };
}

// ============================================================================
// Adjust Member Points (GM Only)
// ============================================================================

export async function adjustMemberPoints(
  targetUserId: string,
  campaignId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string; newTotal?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet." };

  // Validierung
  if (!Number.isInteger(amount) || amount === 0) {
    return { success: false, error: "Betrag muss eine Ganzzahl ≠ 0 sein." };
  }
  if (!reason.trim() || reason.trim().length < 3) {
    return { success: false, error: "Bitte gib einen Grund an (mind. 3 Zeichen)." };
  }
  if (reason.trim().length > 200) {
    return { success: false, error: "Grund zu lang (max. 200 Zeichen)." };
  }

  // GM-Check: Ist der ausführende User der GM dieser Kampagne?
  const { data: campaignData } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaignData || (campaignData as any).gm_id !== user.id) {
    return {
      success: false,
      error: "Nur der Spielleiter kann Punkte verteilen.",
    };
  }

  // Member-Check: Ist targetUser in der Kampagne?
  const { data: memberData } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", targetUserId)
    .eq("status", "Accepted")
    .maybeSingle();

  if (!memberData) {
    return {
      success: false,
      error: "Dieser Spieler ist nicht in der Kampagne.",
    };
  }

  // Hole aktuelle Punkte
  const { data: userData } = await (supabase.from("users") as any)
    .select("total_points")
    .eq("id", targetUserId)
    .single();

  const currentPoints = Number((userData as any)?.total_points) || 0;
  const newTotal = Math.max(0, currentPoints + amount);

  // WICHTIG: Erst Log erstellen, dann Punkte updaten
  // So können wir bei einem Log-Fehler abbrechen, bevor Punkte verteilt werden
  const { error: logError } = await (supabase.from("points_log") as any).insert({
    user_id: targetUserId,
    amount,
    reason: reason.trim(),
    created_by: user.id, // Spaltenname: created_by (nicht granted_by)
    campaign_id: campaignId,
  });

  if (logError) {
    console.error("[adjustMemberPoints:log] Fehler beim Erstellen des Log-Eintrags:", logError);
    return { 
      success: false, 
      error: `Fehler beim Erstellen des Log-Eintrags: ${logError.message}` 
    };
  }

  console.log("[adjustMemberPoints] ✓ points_log Eintrag erstellt für User:", targetUserId, "Betrag:", amount, "Grund:", reason.trim());

  // Update total_points (nur wenn Log erfolgreich war)
  const { error: updateError } = await (supabase.from("users") as any)
    .update({ total_points: newTotal })
    .eq("id", targetUserId);

  if (updateError) {
    console.error("[adjustMemberPoints:update] Fehler beim Update:", updateError);
    return { success: false, error: updateError.message };
  }

  console.log("[adjustMemberPoints] ✓ Punkte aktualisiert für User:", targetUserId, currentPoints, "→", newTotal);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true, newTotal };
}

// ============================================================================
// Distribute Group Points (GM Only - Bulk Reward)
// ============================================================================

export async function distributeGroupPoints(
  campaignId: string,
  amount: number,
  reason: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  affectedCount?: number;
  failedUsers?: string[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet." };

  // Validierung
  if (!Number.isInteger(amount) || amount === 0) {
    return { success: false, error: "Betrag muss eine Ganzzahl ≠ 0 sein." };
  }
  if (!reason.trim() || reason.trim().length < 3) {
    return { success: false, error: "Bitte gib einen Grund an (mind. 3 Zeichen)." };
  }
  if (reason.trim().length > 200) {
    return { success: false, error: "Grund zu lang (max. 200 Zeichen)." };
  }

  // GM-Check: Ist der ausführende User der GM dieser Kampagne?
  const { data: campaignData } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaignData || (campaignData as any).gm_id !== user.id) {
    return {
      success: false,
      error: "Nur der Spielleiter kann Gruppen-Belohnungen verteilen.",
    };
  }

  // Hole alle akzeptierten Mitglieder
  const { data: membersData, error: membersError } = await (
    supabase.from("campaign_members") as any
  )
    .select("user_id")
    .eq("campaign_id", campaignId)
    .eq("status", "Accepted");

  if (membersError) {
    console.error("[distributeGroupPoints:members]", membersError);
    return { success: false, error: "Fehler beim Laden der Mitglieder." };
  }

  const members = (membersData as any[]) || [];
  if (members.length === 0) {
    return { success: false, error: "Keine akzeptierten Mitglieder in dieser Kampagne." };
  }

  const userIds = members.map((m: any) => m.user_id);

  // Bulk-Update: Erhöhe total_points für alle Mitglieder
  // WICHTIG: Wir können nicht garantieren, dass alle Updates atomar sind,
  // aber wir versuchen es so sicher wie möglich zu machen
  const failedUsers: string[] = [];
  let successCount = 0;

  // Schritt 1: Hole aktuelle Punkte für alle User
  const { data: usersData, error: usersError } = await (
    supabase.from("users") as any
  )
    .select("id, total_points, username")
    .in("id", userIds);

  if (usersError) {
    console.error("[distributeGroupPoints:users]", usersError);
    return { success: false, error: "Fehler beim Laden der Spieler-Daten." };
  }

  const users = (usersData as any[]) || [];

  // Schritt 2: Update jeden User einzeln (für Fehlerbehandlung)
  const logEntries: any[] = [];

  for (const userData of users) {
    const userId = userData.id;
    const currentPoints = Number(userData.total_points) || 0;
    const newTotal = Math.max(0, currentPoints + amount);

    // Update total_points
    const { error: updateError } = await (supabase.from("users") as any)
      .update({ total_points: newTotal })
      .eq("id", userId);

    if (updateError) {
      console.error(`[distributeGroupPoints:update:${userId}]`, updateError);
      failedUsers.push(userData.username || userId);
      continue; // Nächster User
    }

    // Erfolg: Bereite Log-Eintrag vor
    logEntries.push({
      user_id: userId,
      amount,
      reason: reason.trim(),
      created_by: user.id,
      campaign_id: campaignId,
    });

    successCount++;
  }

  // Schritt 3: Bulk-Insert für points_log (alle auf einmal)
  if (logEntries.length > 0) {
    const { error: logError } = await (supabase.from("points_log") as any)
      .insert(logEntries);

    if (logError) {
      console.error("[distributeGroupPoints:log] Fehler beim Bulk-Insert:", logError);
      // Punkte wurden bereits verteilt, nur Log-Fehler
    } else {
      console.log("[distributeGroupPoints] ✓", logEntries.length, "points_log Einträge erstellt");
    }
  }

  console.log("[distributeGroupPoints] Abgeschlossen:", successCount, "erfolgreich,", failedUsers.length, "fehlgeschlagen");

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");

  if (successCount === 0) {
    return { 
      success: false, 
      error: "Keine Punkte konnten verteilt werden.",
      failedUsers,
    };
  }

  if (failedUsers.length > 0) {
    return {
      success: true,
      affectedCount: successCount,
      failedUsers,
      error: `${successCount} Spieler belohnt, aber ${failedUsers.length} fehlgeschlagen.`,
    };
  }

  return { 
    success: true, 
    affectedCount: successCount,
  };
}
