"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  POLL_VOTE_POINTS,
  type PollStatus,
} from "@/src/lib/queries/poll-queries";

export type PollDurationPreset = "24h" | "48h" | "72h" | "7d" | "14d";

const DURATION_HOURS: Record<PollDurationPreset, number> = {
  "24h": 24,
  "48h": 48,
  "72h": 72,
  "7d": 24 * 7,
  "14d": 24 * 14,
};

async function assertCampaignGm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!data) return { ok: false, error: "Kampagne nicht gefunden." };
  const row = data as { gm_id?: string; owner_id?: string };
  if (row.gm_id !== userId && row.owner_id !== userId) {
    return { ok: false, error: "Nur der Spielleiter kann Umfragen verwalten." };
  }
  return { ok: true };
}

function computeClosesAt(duration: PollDurationPreset): string {
  const hours = DURATION_HOURS[duration] ?? 48;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function createCampaignPoll(
  campaignId: string,
  question: string,
  optionLabels: string[],
  duration: PollDurationPreset,
  publishImmediately = false
): Promise<{ success: boolean; pollId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const gmCheck = await assertCampaignGm(supabase, campaignId, user.id);
  if (!gmCheck.ok) return { success: false, error: gmCheck.error };

  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length < 3) {
    return { success: false, error: "Die Frage muss mindestens 3 Zeichen haben." };
  }

  const labels = optionLabels
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (labels.length < 2) {
    return { success: false, error: "Mindestens zwei Antwortmöglichkeiten erforderlich." };
  }
  if (labels.length > 8) {
    return { success: false, error: "Maximal acht Antwortmöglichkeiten." };
  }

  const closesAt = computeClosesAt(duration);
  const nowIso = new Date().toISOString();

  const { data: poll, error: pollError } = await (
    supabase.from("campaign_polls" as any) as any
  )
    .insert({
      campaign_id: campaignId,
      question: trimmedQuestion,
      status: publishImmediately ? "published" : "draft",
      closes_at: closesAt,
      created_by: user.id,
      published_at: publishImmediately ? nowIso : null,
      points_per_vote: POLL_VOTE_POINTS,
    })
    .select("id")
    .single();

  if (pollError || !poll) {
    console.error("[createCampaignPoll]", pollError);
    return { success: false, error: "Umfrage konnte nicht erstellt werden." };
  }

  const pollId = (poll as { id: string }).id;
  const optionRows = labels.map((label, i) => ({
    poll_id: pollId,
    label,
    sort_order: i,
  }));

  const { error: optError } = await (supabase.from("campaign_poll_options" as any) as any).insert(
    optionRows
  );
  if (optError) {
    console.error("[createCampaignPoll] options", optError);
    await (supabase.from("campaign_polls" as any) as any).delete().eq("id", pollId);
    return { success: false, error: "Antwortoptionen konnten nicht gespeichert werden." };
  }

  if (publishImmediately) {
    after(async () => {
      const admin = createAdminClient();
      const { notifyPollPublishedEmails } = await import("@/src/lib/email/dispatch");
      await notifyPollPublishedEmails({
        supabase: admin,
        campaignId,
        pollId,
        question: trimmedQuestion,
      });
    });
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true, pollId };
}

export async function publishCampaignPoll(
  pollId: string,
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const gmCheck = await assertCampaignGm(supabase, campaignId, user.id);
  if (!gmCheck.ok) return { success: false, error: gmCheck.error };

  const { data: poll } = await (supabase.from("campaign_polls" as any) as any)
    .select("id, status, closes_at, question")
    .eq("id", pollId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!poll) return { success: false, error: "Umfrage nicht gefunden." };
  if ((poll as { status: PollStatus }).status !== "draft") {
    return { success: false, error: "Nur Entwürfe können veröffentlicht werden." };
  }

  const closesAt = (poll as { closes_at: string }).closes_at;
  if (new Date(closesAt).getTime() <= Date.now()) {
    return {
      success: false,
      error: "Die Laufzeit ist abgelaufen. Bitte erstelle die Umfrage neu.",
    };
  }

  const { error } = await (supabase.from("campaign_polls" as any) as any)
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pollId);

  if (error) {
    console.error("[publishCampaignPoll]", error);
    return { success: false, error: "Veröffentlichung fehlgeschlagen." };
  }

  const question = String((poll as { question?: string }).question ?? "").trim();
  after(async () => {
    const admin = createAdminClient();
    const { notifyPollPublishedEmails } = await import("@/src/lib/email/dispatch");
    await notifyPollPublishedEmails({
      supabase: admin,
      campaignId,
      pollId,
      question: question || "Neue Umfrage",
    });
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function closeCampaignPoll(
  pollId: string,
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const gmCheck = await assertCampaignGm(supabase, campaignId, user.id);
  if (!gmCheck.ok) return { success: false, error: gmCheck.error };

  const { error } = await (supabase.from("campaign_polls" as any) as any)
    .update({
      status: "closed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pollId)
    .eq("campaign_id", campaignId)
    .in("status", ["draft", "published"]);

  if (error) {
    console.error("[closeCampaignPoll]", error);
    return { success: false, error: "Umfrage konnte nicht beendet werden." };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function voteCampaignPoll(
  pollId: string,
  optionId: string
): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: poll } = await (supabase.from("campaign_polls" as any) as any)
    .select("id, campaign_id, question, status, closes_at, points_per_vote")
    .eq("id", pollId)
    .maybeSingle();

  if (!poll) return { success: false, error: "Umfrage nicht gefunden." };

  const p = poll as {
    campaign_id: string;
    question: string;
    status: PollStatus;
    closes_at: string;
    points_per_vote: number;
  };

  if (p.status !== "published") {
    return { success: false, error: "Diese Umfrage ist nicht mehr aktiv." };
  }
  if (new Date(p.closes_at).getTime() <= Date.now()) {
    return { success: false, error: "Die Abstimmungsfrist ist abgelaufen." };
  }

  const { data: member } = await (supabase.from("campaign_members") as any)
    .select("id")
    .eq("campaign_id", p.campaign_id)
    .eq("user_id", user.id)
    .in("status", ["Approved", "Active"])
    .maybeSingle();
  if (!member) {
    return { success: false, error: "Keine Berechtigung für diese Kampagne." };
  }

  const { data: option } = await (supabase.from("campaign_poll_options" as any) as any)
    .select("id")
    .eq("id", optionId)
    .eq("poll_id", pollId)
    .maybeSingle();
  if (!option) {
    return { success: false, error: "Ungültige Antwortoption." };
  }

  const { data: existing } = await (supabase.from("campaign_poll_votes" as any) as any)
    .select("id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { success: false, error: "Du hast bereits abgestimmt." };
  }

  const { error: voteError } = await (admin.from("campaign_poll_votes" as any) as any).insert({
    poll_id: pollId,
    option_id: optionId,
    user_id: user.id,
  });

  if (voteError) {
    if (voteError.code === "23505") {
      return { success: false, error: "Du hast bereits abgestimmt." };
    }
    console.error("[voteCampaignPoll] insert", voteError);
    return { success: false, error: "Abstimmung fehlgeschlagen." };
  }

  const points = Number(p.points_per_vote) || POLL_VOTE_POINTS;
  const reason = `Umfrage: ${p.question.slice(0, 80)}`;

  const { error: pointsError } = await (admin as any).rpc("award_points_safe", {
    target_user_id: user.id,
    points_amount: points,
    award_reason: reason,
    awarded_by: null,
    related_campaign_id: p.campaign_id,
    catalog_id: null,
  });

  if (pointsError) {
    console.error("[voteCampaignPoll] points", pointsError);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${p.campaign_id}`);
  return { success: true, pointsAwarded: points };
}
