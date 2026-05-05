"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getPointsLog } from "@/src/lib/queries/point-queries";
import type { PointLogEntry } from "@/src/lib/types/point-log";
import {
  isSessionStatusLive,
  isSessionStatusScheduled,
  isSessionStatusTerminal,
} from "@/src/lib/session-status";

// PointLogEntry nicht re-exportieren: In "use server"-Modulen kann Turbopack
// `export type { … }` fälschlich als Laufzeit-Export auswerten → ReferenceError.

async function awardPointsSafe(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    targetUserId: string;
    amount: number;
    reason: string;
    awardedBy: string | null;
    campaignId: string | null;
    catalogId?: string | null;
  },
): Promise<{ newTotal: number | null; error?: string }> {
  const { data, error } = await (supabase as any).rpc("award_points_safe", {
    target_user_id: args.targetUserId,
    points_amount: args.amount,
    award_reason: args.reason,
    awarded_by: args.awardedBy,
    related_campaign_id: args.campaignId,
    catalog_id: args.catalogId ?? null,
  });

  if (error) return { newTotal: null, error: error.message };
  return { newTotal: typeof data === "number" ? data : Number(data) };
}

// ============================================================================
// Types
// ============================================================================

export type MemberDetailCharacter = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  status?: string | null;
  biography?: string | null;
  avatarUrl?: string | null;
};

export type MemberDetailData = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** Lebenslang verdiente Punkte fuer Level/Rang-Fortschritt. */
  lifetimePoints: number;
  /** Aktuell ausgebbares Punkteguthaben. */
  totalPoints: number;
  achievements: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    pointsAwarded: number;
  }>;
  pointsLog: PointLogEntry[];
  nextSessionStatus: "accepted" | "declined" | "pending" | null;
  /** Charakter dieser Kampagne (falls vorhanden) */
  character: MemberDetailCharacter | null;
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

  const { data: membership } = await (supabase.from("campaign_members") as any)
    .select("id, character_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .in("status", [
      "Approved",
      "Active",
      "Drafting",
      "In_Review",
      "Changes_Proposed",
    ])
    .maybeSingle();

  if (!membership) {
    return {
      success: false,
      error: "Dieser Nutzer ist kein Mitglied dieser Kampagne.",
    };
  }

  // Fetch user data
  const { data: userData, error: userError } = await (
    supabase.from("users") as any
  )
    .select("id, username, avatar_url, total_points, lifetime_points")
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

  // Kampagnen-Charakter (Mitgliedschaft oder Fallback user_id + campaign_id)
  let character: MemberDetailCharacter | null = null;
  const charId = (membership as { character_id?: string | null }).character_id;
  if (charId) {
    const { data: ch } = await (supabase.from("characters") as any)
      .select(
        "id, name, class, race, level, status, biography, avatar_url",
      )
      .eq("id", charId)
      .maybeSingle();
    if (ch) {
      character = {
        id: ch.id,
        name: ch.name ?? "Unbenannt",
        class: ch.class ?? "",
        race: ch.race ?? "",
        level: Number(ch.level) || 1,
        status: ch.status ?? null,
        biography: ch.biography ?? null,
        avatarUrl: ch.avatar_url ?? null,
      };
    }
  }
  if (!character) {
    const { data: chRows } = await (supabase.from("characters") as any)
      .select(
        "id, name, class, race, level, status, biography, avatar_url",
      )
      .eq("user_id", userId)
      .eq("campaign_id", campaignId)
      .limit(1);
    const ch = Array.isArray(chRows) ? chRows[0] : null;
    if (ch) {
      character = {
        id: ch.id,
        name: ch.name ?? "Unbenannt",
        class: ch.class ?? "",
        race: ch.race ?? "",
        level: Number(ch.level) || 1,
        status: ch.status ?? null,
        biography: ch.biography ?? null,
        avatarUrl: ch.avatar_url ?? null,
      };
    }
  }

  // Nächster Termin + RSVP (Tabelle sessions / session_rsvps)
  let nextSessionStatus: "accepted" | "declined" | "pending" | null = null;
  const { data: sessionRows } = await (supabase.from("sessions") as any)
    .select("id, start_time, status")
    .eq("campaign_id", campaignId)
    .order("start_time", { ascending: true })
    .limit(25);

  const upcoming = ((sessionRows as any[]) || []).find((s) => {
    if (isSessionStatusTerminal(s.status)) return false;
    if (isSessionStatusLive(s.status)) return true;
    if (isSessionStatusScheduled(s.status)) return true;
    return false;
  });

  if (upcoming?.id) {
    const { data: rsvpRow } = await (supabase.from("session_rsvps") as any)
      .select("rsvp_status")
      .eq("session_id", upcoming.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!rsvpRow) {
      nextSessionStatus = "pending";
    } else {
      const st = String((rsvpRow as any).rsvp_status ?? "");
      if (st === "Absage") nextSessionStatus = "declined";
      else if (st === "Zusage" || st === "Via Online")
        nextSessionStatus = "accepted";
      else nextSessionStatus = "pending";
    }
  }

  return {
    success: true,
    data: {
      userId: (userData as any).id,
      username: (userData as any).username ?? "Unbekannt",
      avatarUrl: (userData as any).avatar_url ?? null,
      lifetimePoints: Number((userData as any).lifetime_points) || 0,
      totalPoints: Number((userData as any).total_points) || 0,
      achievements,
      pointsLog,
      nextSessionStatus,
      character,
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
    .in("status", ["Approved", "Active"])
    .maybeSingle();

  if (!memberData) {
    return {
      success: false,
      error: "Dieser Spieler ist nicht in der Kampagne.",
    };
  }

  const admin = createAdminClient();
  const result = await awardPointsSafe(admin, {
    targetUserId,
    amount,
    reason: reason.trim(),
    awardedBy: user.id,
    campaignId,
  });

  if (result.error) {
    console.error("[adjustMemberPoints:rpc] Fehler beim atomaren Punkte-Update:", result.error);
    return { success: false, error: result.error };
  }

  console.log("[adjustMemberPoints] ✓ Punkte atomar aktualisiert für User:", targetUserId, "Betrag:", amount, "Neuer Stand:", result.newTotal);

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true, newTotal: result.newTotal ?? undefined };
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
    .in("status", ["Approved", "Active"]);

  if (membersError) {
    console.error("[distributeGroupPoints:members]", membersError);
    return { success: false, error: "Fehler beim Laden der Mitglieder." };
  }

  const members = (membersData as any[]) || [];
  if (members.length === 0) {
    return { success: false, error: "Keine akzeptierten Mitglieder in dieser Kampagne." };
  }

  const failedUsers: string[] = [];
  let successCount = 0;

  const userIds = members.map((m: any) => m.user_id);
  const { data: usersData, error: usersError } = await (
    supabase.from("users") as any
  )
    .select("id, username")
    .in("id", userIds);

  if (usersError) {
    console.error("[distributeGroupPoints:users]", usersError);
    return { success: false, error: "Fehler beim Laden der Spieler-Daten." };
  }

  const users = (usersData as any[]) || [];
  const admin = createAdminClient();

  for (const userData of users) {
    const userId = userData.id;
    const result = await awardPointsSafe(admin, {
      targetUserId: userId,
      amount,
      reason: reason.trim(),
      awardedBy: user.id,
      campaignId,
    });

    if (result.error) {
      console.error(`[distributeGroupPoints:rpc:${userId}]`, result.error);
      failedUsers.push(userData.username || userId);
      continue;
    }

    successCount++;
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
