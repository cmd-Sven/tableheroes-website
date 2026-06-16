import { createAdminClient, createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { awardAchievement } from "@/src/lib/actions/achievement-actions";
import {
  buildSessionExtraPointsReason,
  buildSessionParticipationReason,
  SESSION_PARTICIPATION_BASE_POINTS,
} from "@/src/lib/session-participation/constants";
import type { SettleSessionParticipationInput } from "./participation-types";

export type {
  SessionParticipationAchievementInput,
  SessionParticipationExtraInput,
  SettleSessionParticipationInput,
} from "./participation-types";

async function awardPointsSafe(
  supabase: ReturnType<typeof createAdminClient>,
  args: {
    targetUserId: string;
    amount: number;
    reason: string;
    awardedBy: string;
    campaignId: string;
  },
): Promise<{ error?: string }> {
  const { error } = await (supabase as any).rpc("award_points_safe", {
    target_user_id: args.targetUserId,
    points_amount: args.amount,
    award_reason: args.reason,
    awarded_by: args.awardedBy,
    related_campaign_id: args.campaignId,
    catalog_id: null,
  });
  if (error) return { error: error.message };
  return {};
}

export async function settleSessionParticipationRewards(
  sessionId: string,
  input: SettleSessionParticipationInput,
): Promise<
  | {
      ok: true;
      baseAwarded: number;
      extraAwarded: number;
      achievementsAwarded: number;
      alreadySettled?: boolean;
      pointsSkippedDueToConfig?: boolean;
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht authentifiziert." };

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, title, status, participation_rewards_settled_at")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    title: string | null;
    status: string;
    participation_rewards_settled_at: string | null;
  } | null;

  if (!session) return { ok: false, error: "Session nicht gefunden." };

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    return { ok: false, error: "Nur der GM kann Teilnahme-Punkte vergeben." };
  }

  if (session.participation_rewards_settled_at) {
    return {
      ok: true,
      baseAwarded: 0,
      extraAwarded: 0,
      achievementsAwarded: 0,
      alreadySettled: true,
    };
  }

  const participantIds = Array.from(
    new Set(input.participantUserIds.map(String).filter(Boolean)),
  );

  if (participantIds.length === 0 && !(input.extras?.length || input.achievements?.length)) {
    await (supabase.from("sessions") as any)
      .update({ participation_rewards_settled_at: new Date().toISOString() })
      .eq("id", sessionId);
    return {
      ok: true,
      baseAwarded: 0,
      extraAwarded: 0,
      achievementsAwarded: 0,
    };
  }

  const { data: membersRaw } = await (supabase.from("campaign_members") as any)
    .select("user_id")
    .eq("campaign_id", session.campaign_id)
    .in("status", ["Approved", "Active"]);

  const allowedUserIds = new Set(
    ((membersRaw as Array<{ user_id: string }> | null) ?? []).map((m) =>
      String(m.user_id),
    ),
  );

  const gmIds = new Set(
    [
      (campaignRaw as { gm_id?: string | null }).gm_id,
      (campaignRaw as { owner_id?: string | null }).owner_id,
    ]
      .filter(Boolean)
      .map(String),
  );

  const admin = tryCreateAdminClient();
  const wantsPointAwards =
    participantIds.some((userId) => allowedUserIds.has(userId) && !gmIds.has(userId)) ||
    (input.extras ?? []).some((extra) => {
      const userId = String(extra.userId ?? "");
      const points = Math.round(Number(extra.points));
      return (
        userId &&
        allowedUserIds.has(userId) &&
        !gmIds.has(userId) &&
        Number.isFinite(points) &&
        points !== 0
      );
    }) ||
    (input.achievements ?? []).some((row) => {
      const userId = String(row.userId ?? "");
      const achievementId = String(row.achievementId ?? "");
      return userId && achievementId && allowedUserIds.has(userId) && !gmIds.has(userId);
    });

  if (!admin && wantsPointAwards) {
    console.warn(
      "[settleSessionParticipationRewards] SUPABASE_SERVICE_ROLE_KEY fehlt — Teilnahme-Punkte werden übersprungen.",
    );
  }

  const markSettled = async () => {
    const { error: markError } = await (supabase.from("sessions") as any)
      .update({ participation_rewards_settled_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (
      markError &&
      !String(markError.message).includes("participation_rewards_settled_at")
    ) {
      return { ok: false as const, error: markError.message };
    }
    return { ok: true as const };
  };

  if (!admin) {
    const marked = await markSettled();
    if (!marked.ok) return marked;

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);

    return {
      ok: true,
      baseAwarded: 0,
      extraAwarded: 0,
      achievementsAwarded: 0,
      pointsSkippedDueToConfig: wantsPointAwards,
    };
  }

  const baseReason = buildSessionParticipationReason(session.title, sessionId);
  let baseAwarded = 0;
  let extraAwarded = 0;
  let achievementsAwarded = 0;

  for (const userId of participantIds) {
    if (!allowedUserIds.has(userId) || gmIds.has(userId)) continue;
    const result = await awardPointsSafe(admin, {
      targetUserId: userId,
      amount: SESSION_PARTICIPATION_BASE_POINTS,
      reason: baseReason,
      awardedBy: user.id,
      campaignId: session.campaign_id,
    });
    if (result.error) {
      return { ok: false, error: result.error };
    }
    baseAwarded += 1;
  }

  for (const extra of input.extras ?? []) {
    const userId = String(extra.userId ?? "");
    const points = Math.round(Number(extra.points));
    if (!userId || !allowedUserIds.has(userId) || gmIds.has(userId)) continue;
    if (!Number.isFinite(points) || points === 0) continue;
    if (!extra.reason?.trim() || extra.reason.trim().length < 3) {
      return { ok: false, error: "Extrapunkte brauchen einen Grund (mind. 3 Zeichen)." };
    }

    const result = await awardPointsSafe(admin, {
      targetUserId: userId,
      amount: points,
      reason: buildSessionExtraPointsReason(session.title, extra.reason.trim()),
      awardedBy: user.id,
      campaignId: session.campaign_id,
    });
    if (result.error) {
      return { ok: false, error: result.error };
    }
    extraAwarded += 1;
  }

  for (const row of input.achievements ?? []) {
    const userId = String(row.userId ?? "");
    const achievementId = String(row.achievementId ?? "");
    if (!userId || !achievementId || !allowedUserIds.has(userId) || gmIds.has(userId)) {
      continue;
    }

    const { data: achRaw } = await (supabase.from("achievements") as any)
      .select("name")
      .eq("id", achievementId)
      .maybeSingle();

    const achievementName = (achRaw as { name?: string } | null)?.name;
    if (!achievementName) continue;

    const result = await awardAchievement(userId, achievementName, user.id);
    if (result.error) {
      return { ok: false, error: result.error };
    }
    if (result.awarded) achievementsAwarded += 1;
  }

  const marked = await markSettled();
  if (!marked.ok) return marked;

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${session.campaign_id}`);

  return {
    ok: true,
    baseAwarded,
    extraAwarded,
    achievementsAwarded,
  };
}
