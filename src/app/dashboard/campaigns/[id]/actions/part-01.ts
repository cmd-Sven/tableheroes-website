/**
 * actions — part 1: updateCampaignSchedule, generateRecurringSessions, applyToCampaign, applyToCampaignWithCharacter.
 */
"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeCharacterOnboarding,
  generateCharacterQuest,
} from "../ai-actions";
import { createQuest } from "../quest-actions";
import {
  CampaignMembershipSchema,
  CampaignSchema,
} from "@/src/lib/validations/schemas";
import {
  addBerlinCalendarDays,
  APP_TIMEZONE,
  berlinLocalToUtc,
  getBerlinDateKey,
  getBerlinParts,
  nextBerlinScheduleOccurrence,
} from "@/src/lib/datetime/berlin";

// ============================================================================
// RECURRING SESSION SCHEDULE
// ============================================================================

export async function updateCampaignSchedule(
  campaignId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM of this campaign.");
  }

  const intervalVal = formData.get("schedule_interval") as string;
  const dayVal = formData.get("schedule_day") as string;
  const timeVal = formData.get("schedule_time") as string;
  const durationVal = formData.get("schedule_duration_hours") as string;
  const frequencyNote = formData.get("frequency") as string;

  const scheduleInterval = intervalVal || null;
  const scheduleDay =
    scheduleInterval && dayVal !== "" ? parseInt(dayVal, 10) : null;
  const scheduleTime = scheduleInterval && timeVal ? timeVal : null;
  const scheduleDuration =
    scheduleInterval && durationVal ? parseInt(durationVal, 10) : 4;

  const { error } = await (supabase.from("campaigns") as any)
    .update({
      schedule_interval: scheduleInterval,
      schedule_day: scheduleDay,
      schedule_time: scheduleTime,
      schedule_duration_hours: scheduleDuration,
      frequency: frequencyNote || null,
    })
    .eq("id", campaignId);

  if (error) {
    console.error("Update Campaign Schedule Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function generateRecurringSessions(
  campaignId: string,
  weeksAhead = 8,
): Promise<{ created: number; skipped: number; realigned: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select(
      "id, gm_id, schedule_day, schedule_time, schedule_interval, schedule_duration_hours",
    )
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM of this campaign.");
  }

  const {
    schedule_day,
    schedule_time,
    schedule_interval,
    schedule_duration_hours,
  } = campaign as {
    schedule_day: number | null;
    schedule_time: string | null;
    schedule_interval: string | null;
    schedule_duration_hours: number | null;
  };

  if (
    schedule_day === null ||
    schedule_day === undefined ||
    !schedule_time ||
    !schedule_interval
  ) {
    throw new Error(
      "Kein vollständiger Spielplan konfiguriert. Bitte Wochentag, Uhrzeit und Intervall einstellen.",
    );
  }

  const duration = schedule_duration_hours ?? 4;
  const [hours, minutes] = schedule_time.split(":").map(Number);

  // Existing sessions for deduplication (only future ones)
  const now = new Date();
  const { data: existingSessions } = await (supabase.from("sessions") as any)
    .select("start_time")
    .eq("campaign_id", campaignId)
    .gte("start_time", now.toISOString());

  const existingDates = new Set(
    ((existingSessions as any[]) ?? []).map((s: any) => getBerlinDateKey(s.start_time)),
  );

  const sessionsToInsert: Array<{
    campaign_id: string;
    title: string;
    type: string;
    start_time: string;
    end_time: string;
    status: string;
  }> = [];

  const stepDays =
    schedule_interval === "weekly"
      ? 7
      : schedule_interval === "biweekly"
        ? 14
        : 28;

  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() + weeksAhead * 7);

  function autoSessionTitle(startTime: Date): string {
    const dateLabel = new Intl.DateTimeFormat("de-DE", {
      timeZone: APP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(startTime);
    return `Session – ${dateLabel}`;
  }

  let cursor = nextBerlinScheduleOccurrence(schedule_day, hours, minutes, now);

  while (cursor <= endDate) {
    const dateKey = getBerlinDateKey(cursor);

    if (!existingDates.has(dateKey)) {
      const startTime = cursor;
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

      sessionsToInsert.push({
        campaign_id: campaignId,
        title: autoSessionTitle(startTime),
        type: "GameSession",
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "Scheduled",
      });
    }

    cursor = addBerlinCalendarDays(cursor, stepDays);
  }

  let created = 0;
  if (sessionsToInsert.length > 0) {
    const { error } = await (supabase.from("sessions") as any).insert(
      sessionsToInsert,
    );
    if (error) {
      console.error("Generate Recurring Sessions Error:", error);
      throw new Error(error.message);
    }
    created = sessionsToInsert.length;
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/");

  const realigned = await realignAutoGeneratedSessionTimes(
    supabase,
    campaignId,
    hours,
    minutes,
    duration,
  );

  return { created, skipped: existingDates.size, realigned };
}

async function realignAutoGeneratedSessionTimes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  hours: number,
  minutes: number,
  durationHours: number,
): Promise<number> {
  const now = new Date();

  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("id, start_time, title, status, schedule_customized")
    .eq("campaign_id", campaignId)
    .eq("status", "Scheduled")
    .gte("start_time", now.toISOString());

  let fixed = 0;
  for (const row of (sessionsRaw as Array<{
    id: string;
    start_time: string;
    title: string | null;
    schedule_customized?: boolean;
  }>) ?? []) {
    if (row.schedule_customized) continue;
    const title = String(row.title ?? "").trim();
    if (!/^Session\s*[–-]\s*/.test(title)) continue;

    const bp = getBerlinParts(new Date(row.start_time));
    const correctedStart = berlinLocalToUtc(bp.year, bp.month, bp.day, hours, minutes);
    if (correctedStart.toISOString() === row.start_time) continue;

    const correctedEnd = new Date(
      correctedStart.getTime() + durationHours * 60 * 60 * 1000,
    );

    const { error } = await (supabase.from("sessions") as any)
      .update({
        start_time: correctedStart.toISOString(),
        end_time: correctedEnd.toISOString(),
      })
      .eq("id", row.id);

    if (!error) fixed += 1;
  }

  return fixed;
}

// ============================================================================
// APPLICATION SYSTEM
// ============================================================================

// Neue Funktion: Bewerbung mit optionalem Charakter
export async function applyToCampaign(
  campaignId: string,
  message?: string,
  characterId?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Wenn characterId übergeben wurde, prüfe ob der Charakter dem User gehört
  if (characterId) {
    const { data: characterRaw } = await (supabase.from("characters") as any)
      .select("user_id, campaign_id")
      .eq("id", characterId)
      .single();

    // Expliziter Cast, um 'never' zu verhindern
    const character = characterRaw as {
      id: string;
      user_id: string;
      campaign_id: string | null;
    } | null;

    if (!character || character.user_id !== user.id) {
      throw new Error("Nicht autorisiert: Dieser Charakter gehört dir nicht.");
    }

    if (character.campaign_id !== null) {
      throw new Error(
        "Dieser Charakter ist bereits einer Kampagne zugeordnet.",
      );
    }
  }

  // Check if already a member
  const { data: existingRaw } = await (supabase.from("campaign_members") as any)
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const existing = existingRaw as { id: string; status: string } | null;

  if (existing) {
    if (existing.status === "Applied") {
      throw new Error("Du hast dich bereits beworben.");
    }
    if (existing.status === "Approved" || existing.status === "Active") {
      throw new Error("Du bist bereits Mitglied dieser Kampagne.");
    }
  }

  // Daten für Insert vorbereiten
  const membershipToInsert = {
    campaign_id: campaignId,
    user_id: user.id,
    role: "Player" as const,
    status: "Applied" as const,
    application_message: message || null,
    character_id: characterId || null,
  };

  // Zentrale Validierung mit Zod (ohne id, da diese von der DB vergeben wird)
  const parsed = CampaignMembershipSchema.omit({ id: true }).safeParse(
    membershipToInsert,
  );

  if (!parsed.success) {
    console.error(
      "CampaignMembership Validation Error:",
      parsed.error.flatten(),
    );
    throw new Error("Ungültige Bewerbungsdaten. Bitte versuche es erneut.");
  }

  // Insert application WITH optional character_id
  const { error } = await (supabase.from("campaign_members") as any).insert(
    parsed.data,
  );

  if (error) {
    console.error("Apply to Campaign Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

// Alte Funktion (deprecated, für Rückwärtskompatibilität)
export async function applyToCampaignWithCharacter(
  campaignId: string,
  message: string,
  characterId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify character ownership
  const { data: characterRaw } = await (supabase.from("characters") as any)
    .select("user_id, campaign_id")
    .eq("id", characterId)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const character = characterRaw as {
    id: string;
    user_id: string;
    campaign_id: string | null;
  } | null;

  if (!character || character.user_id !== user.id) {
    throw new Error("Unauthorized: Not your character.");
  }

  if (character.campaign_id !== null) {
    throw new Error("Dieser Charakter ist bereits einer Kampagne zugeordnet.");
  }

  // Check if already a member
  const { data: existingRaw } = await (supabase.from("campaign_members") as any)
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const existing = existingRaw as { id: string; status: string } | null;

  if (existing) {
    if (existing.status === "Applied") {
      throw new Error("Du hast dich bereits beworben.");
    }
    if (existing.status === "Approved" || existing.status === "Active") {
      throw new Error("Du bist bereits Mitglied dieser Kampagne.");
    }
  }

  // Insert application
  const { error } = await (supabase.from("campaign_members") as any).insert({
    campaign_id: campaignId,
    user_id: user.id,
    character_id: characterId,
    status: "Applied",
    role: "Player",
    application_message: message,
  });

  if (error) {
    console.error("Apply to Campaign Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}
