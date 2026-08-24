/**
 * poll-actions — part 2: submitCampaignPollResponse, voteCampaignPoll.
 */
"use server";

import { awardPollParticipationPoints } from "./part-01";
import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  MAX_POLL_FREE_TEXT_LENGTH,
  MAX_POLL_OPTIONS,
  POLL_VOTE_POINTS,
} from "@/src/lib/constants/poll";
import type { PollStatus } from "@/src/lib/queries/poll-queries";

export async function submitCampaignPollResponse(
  pollId: string,
  optionIds: string[],
  freeText?: string,
): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: poll } = await (supabase.from("campaign_polls" as any) as any)
    .select(
      "id, campaign_id, question, status, closes_at, points_per_vote, allow_multiple, allow_free_text",
    )
    .eq("id", pollId)
    .maybeSingle();

  if (!poll) return { success: false, error: "Umfrage nicht gefunden." };

  const p = poll as {
    campaign_id: string;
    question: string;
    status: PollStatus;
    closes_at: string;
    points_per_vote: number;
    allow_multiple: boolean;
    allow_free_text: boolean;
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

  const uniqueOptionIds = [...new Set(optionIds)];
  if (!p.allow_multiple && uniqueOptionIds.length > 1) {
    return { success: false, error: "Nur eine Antwort erlaubt." };
  }

  const trimmedText = (freeText ?? "").trim();
  if (trimmedText.length > MAX_POLL_FREE_TEXT_LENGTH) {
    return {
      success: false,
      error: `Freitext darf maximal ${MAX_POLL_FREE_TEXT_LENGTH} Zeichen haben.`,
    };
  }

  if (!p.allow_free_text && trimmedText.length > 0) {
    return { success: false, error: "Freitext ist für diese Umfrage nicht erlaubt." };
  }

  if (uniqueOptionIds.length === 0 && trimmedText.length === 0) {
    return { success: false, error: "Bitte wähle mindestens eine Antwort." };
  }

  if (uniqueOptionIds.length > 0) {
    const { data: validOptions } = await (
      supabase.from("campaign_poll_options" as any) as any
    )
      .select("id")
      .eq("poll_id", pollId)
      .in("id", uniqueOptionIds);

    if (((validOptions as any[]) || []).length !== uniqueOptionIds.length) {
      return { success: false, error: "Ungültige Antwortoption." };
    }
  }

  const { data: existingVotes } = await (
    admin.from("campaign_poll_votes" as any) as any
  )
    .select("id, option_id")
    .eq("poll_id", pollId)
    .eq("user_id", user.id);

  const existingOptionIds = new Set(
    ((existingVotes as { option_id: string }[]) || []).map((v) => v.option_id),
  );
  const targetOptionIds = new Set(uniqueOptionIds);

  const toRemove = ((existingVotes as { id: string; option_id: string }[]) || [])
    .filter((v) => !targetOptionIds.has(v.option_id))
    .map((v) => v.id);

  if (toRemove.length > 0) {
    await (admin.from("campaign_poll_votes" as any) as any)
      .delete()
      .in("id", toRemove);
  }

  const toAdd = uniqueOptionIds.filter((id) => !existingOptionIds.has(id));
  if (toAdd.length > 0) {
    const { error: voteError } = await (admin.from("campaign_poll_votes" as any) as any).insert(
      toAdd.map((optionId) => ({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id,
      })),
    );
    if (voteError) {
      console.error("[submitCampaignPollResponse] votes", voteError);
      return { success: false, error: "Abstimmung fehlgeschlagen." };
    }
  }

  if (p.allow_free_text) {
    if (trimmedText.length > 0) {
      const { data: existingText } = await (
        admin.from("campaign_poll_text_responses" as any) as any
      )
        .select("id")
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingText) {
        await (admin.from("campaign_poll_text_responses" as any) as any)
          .update({ response_text: trimmedText })
          .eq("poll_id", pollId)
          .eq("user_id", user.id);
      } else {
        const { error: textError } = await (
          admin.from("campaign_poll_text_responses" as any) as any
        ).insert({
          poll_id: pollId,
          user_id: user.id,
          response_text: trimmedText,
        });
        if (textError) {
          console.error("[submitCampaignPollResponse] text", textError);
          return { success: false, error: "Freitext konnte nicht gespeichert werden." };
        }
      }
    } else {
      await (admin.from("campaign_poll_text_responses" as any) as any)
        .delete()
        .eq("poll_id", pollId)
        .eq("user_id", user.id);
    }
  }

  const points = Number(p.points_per_vote) || POLL_VOTE_POINTS;
  const pointsAwarded = await awardPollParticipationPoints(
    admin,
    user.id,
    pollId,
    p.campaign_id,
    p.question,
    points,
  );

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${p.campaign_id}`);
  return { success: true, pointsAwarded: pointsAwarded || undefined };
}

/** @deprecated Nutze submitCampaignPollResponse */
export async function voteCampaignPoll(
  pollId: string,
  optionId: string,
): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
  return submitCampaignPollResponse(pollId, [optionId]);
}
