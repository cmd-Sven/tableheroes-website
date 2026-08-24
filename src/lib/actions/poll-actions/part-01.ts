/**
 * poll-actions — part 1: createCampaignPoll, updateCampaignPoll, publishCampaignPoll, closeCampaignPoll, PollDurationPreset, PollOptionInput.
 */
"use server";

import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  MAX_POLL_FREE_TEXT_LENGTH,
  MAX_POLL_OPTIONS,
  POLL_VOTE_POINTS,
} from "@/src/lib/constants/poll";
import type { PollStatus } from "@/src/lib/queries/poll-queries";

export type PollDurationPreset = "24h" | "48h" | "72h" | "7d" | "14d";

export type PollOptionInput = {
  id?: string;
  label: string;
};

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
  userId: string,
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

function normalizeOptionLabels(labels: string[]): string[] {
  return labels.map((l) => l.trim()).filter((l) => l.length > 0);
}

function validatePollOptions(labels: string[]): string | null {
  if (labels.length < 2) {
    return "Mindestens zwei Antwortmöglichkeiten erforderlich.";
  }
  if (labels.length > MAX_POLL_OPTIONS) {
    return `Maximal ${MAX_POLL_OPTIONS} Antwortmöglichkeiten.`;
  }
  return null;
}

export async function awardPollParticipationPoints(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  pollId: string,
  campaignId: string,
  question: string,
  points: number,
): Promise<number> {
  const { data: existing } = await (
    admin.from("campaign_poll_participation" as any) as any
  )
    .select("poll_id")
    .eq("poll_id", pollId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return 0;

  const { error: partError } = await (
    admin.from("campaign_poll_participation" as any) as any
  ).insert({ poll_id: pollId, user_id: userId });

  if (partError) {
    if (partError.code === "23505") return 0;
    console.error("[poll] participation", partError);
    return 0;
  }

  const reason = `Umfrage: ${question.slice(0, 80)}`;
  const { error: pointsError } = await (admin as any).rpc("award_points_safe", {
    target_user_id: userId,
    points_amount: points,
    award_reason: reason,
    awarded_by: null,
    related_campaign_id: campaignId,
    catalog_id: null,
  });

  if (pointsError) {
    console.error("[poll] points", pointsError);
  }

  return points;
}

export async function createCampaignPoll(
  campaignId: string,
  question: string,
  optionLabels: string[],
  duration: PollDurationPreset,
  publishImmediately = false,
  allowMultiple = false,
  allowFreeText = false,
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

  const labels = normalizeOptionLabels(optionLabels);
  const optionError = validatePollOptions(labels);
  if (optionError) return { success: false, error: optionError };

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
      allow_multiple: allowMultiple,
      allow_free_text: allowFreeText,
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

  const { error: optError } = await (
    supabase.from("campaign_poll_options" as any) as any
  ).insert(optionRows);
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

export async function updateCampaignPoll(
  pollId: string,
  campaignId: string,
  question: string,
  options: PollOptionInput[],
  allowMultiple: boolean,
  allowFreeText: boolean,
  duration?: PollDurationPreset,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const gmCheck = await assertCampaignGm(supabase, campaignId, user.id);
  if (!gmCheck.ok) return { success: false, error: gmCheck.error };

  const { data: poll } = await (supabase.from("campaign_polls" as any) as any)
    .select("id, status, closes_at")
    .eq("id", pollId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!poll) return { success: false, error: "Umfrage nicht gefunden." };

  const status = (poll as { status: PollStatus }).status;
  if (status === "closed") {
    return { success: false, error: "Beendete Umfragen können nicht bearbeitet werden." };
  }

  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length < 3) {
    return { success: false, error: "Die Frage muss mindestens 3 Zeichen haben." };
  }

  const normalizedOptions = options
    .map((o) => ({ id: o.id, label: o.label.trim() }))
    .filter((o) => o.label.length > 0);
  const optionError = validatePollOptions(normalizedOptions.map((o) => o.label));
  if (optionError) return { success: false, error: optionError };

  const updatePayload: Record<string, unknown> = {
    question: trimmedQuestion,
    allow_multiple: allowMultiple,
    allow_free_text: allowFreeText,
    updated_at: new Date().toISOString(),
  };

  if (duration) {
    updatePayload.closes_at = computeClosesAt(duration);
  } else if (status === "draft") {
    const closesAt = (poll as { closes_at: string }).closes_at;
    if (new Date(closesAt).getTime() <= Date.now()) {
      updatePayload.closes_at = computeClosesAt("48h");
    }
  }

  const { error: pollError } = await (supabase.from("campaign_polls" as any) as any)
    .update(updatePayload)
    .eq("id", pollId);

  if (pollError) {
    console.error("[updateCampaignPoll]", pollError);
    return { success: false, error: "Umfrage konnte nicht gespeichert werden." };
  }

  const { data: existingOptions } = await (
    supabase.from("campaign_poll_options" as any) as any
  )
    .select("id, label, sort_order")
    .eq("poll_id", pollId)
    .order("sort_order", { ascending: true });

  const existing = (existingOptions as { id: string; label: string }[]) || [];
  const keptIds = new Set<string>();

  for (let i = 0; i < normalizedOptions.length; i++) {
    const { id: existingId, label } = normalizedOptions[i];

    if (existingId && existing.some((e) => e.id === existingId)) {
      keptIds.add(existingId);
      await (supabase.from("campaign_poll_options" as any) as any)
        .update({ label, sort_order: i })
        .eq("id", existingId)
        .eq("poll_id", pollId);
    } else {
      const { data: inserted } = await (
        supabase.from("campaign_poll_options" as any) as any
      )
        .insert({ poll_id: pollId, label, sort_order: i })
        .select("id")
        .single();
      if (inserted) keptIds.add((inserted as { id: string }).id);
    }
  }

  const toDelete = existing.filter((e) => !keptIds.has(e.id)).map((e) => e.id);
  if (toDelete.length > 0) {
    await (supabase.from("campaign_poll_options" as any) as any)
      .delete()
      .in("id", toDelete)
      .eq("poll_id", pollId);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function publishCampaignPoll(
  pollId: string,
  campaignId: string,
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
      error: "Die Laufzeit ist abgelaufen. Bitte passe die Laufzeit an.",
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
  campaignId: string,
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
