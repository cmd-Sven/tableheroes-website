"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeCharacterOnboarding,
  generateCharacterQuest,
} from "./ai-actions";
import { createQuest } from "./quest-actions";
import {
  CampaignMembershipSchema,
  CampaignSchema,
} from "@/src/lib/validations/schemas";
import {
  addBerlinCalendarDays,
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

  const dayNames = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];

  let cursor = nextBerlinScheduleOccurrence(schedule_day, hours, minutes, now);

  while (cursor <= endDate) {
    const dateKey = getBerlinDateKey(cursor);

    if (!existingDates.has(dateKey)) {
      const startTime = cursor;
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

      sessionsToInsert.push({
        campaign_id: campaignId,
        title: `Session – ${dayNames[schedule_day]}`,
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
    dayNames[schedule_day],
  );

  return { created, skipped: existingDates.size, realigned };
}

async function realignAutoGeneratedSessionTimes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  hours: number,
  minutes: number,
  durationHours: number,
  dayLabel: string,
): Promise<number> {
  const now = new Date();
  const expectedTitle = `Session – ${dayLabel}`;

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
    if (row.title !== expectedTitle) continue;

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

export async function acceptApplication(memberId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify GM ownership
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM.");
  }

  // Fetch the membership to get character_id
  const { data: membershipRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("id, character_id, user_id")
    .eq("id", memberId)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const membership = membershipRaw as {
    id: string;
    character_id: string | null;
    user_id: string;
  } | null;

  if (!membership) {
    throw new Error("Membership not found.");
  }

  // Update membership status to "Drafting" (neuer Workflow)
  const { error: memberError } = await (
    supabase.from("campaign_members") as any
  )
    .update({ status: "Drafting" })
    .eq("id", memberId);

  if (memberError) {
    console.error("Accept Application Error:", memberError);
    throw new Error(memberError.message);
  }

  // Assign character to campaign
  if (membership.character_id) {
    const { error: charError } = await (supabase.from("characters") as any)
      .update({ campaign_id: campaignId })
      .eq("id", membership.character_id);

    if (charError) {
      console.error("Assign Character Error:", charError);
      throw new Error(charError.message);
    }

    // Fetch character data for onboarding analysis
    const { data: characterRaw } = await (supabase.from("characters") as any)
      .select("*")
      .eq("id", membership.character_id)
      .single();

    // Expliziter Cast für Character-Daten
    const character = characterRaw as {
      id: string;
      name: string | null;
      class: string | null;
      race: string | null;
      level: number | null;
      backstory_summary: string | null;
      goals: string | null;
      fears: string | null;
      important_people: any;
      rivals: string | null;
      faction_membership: string | null;
      profession: string | null;
    } | null;

    if (character) {
      // Analyze character and create personal quest
      try {
        const analysis = await analyzeCharacterOnboarding(campaignId, {
          name: character.name || "",
          class: character.class || "",
          race: character.race || "",
          level: character.level || 1,
          backstory_summary: character.backstory_summary || undefined,
          goals: character.goals || undefined,
          fears: character.fears || undefined,
          important_people: character.important_people || undefined,
          rivals: character.rivals || undefined,
          faction_membership: character.faction_membership || undefined,
          profession: character.profession || undefined,
        });

        // Create Personal Quest
        if (analysis.personal_quest) {
          await createQuest({
            campaign_id: campaignId,
            title: analysis.personal_quest.title,
            type: analysis.personal_quest.type || "Character Arc",
            status: "Active",
            description: analysis.personal_quest.description,
            rewards: analysis.personal_quest.rewards,
            gm_notes: analysis.personal_quest.gm_notes,
            is_revealed: false,
          });
        }

        // -----------------------------------------------------------
        // KI HOOK: Automatische Quest-Generierung (RPC-basiert)
        // -----------------------------------------------------------
        // Zusätzlich zur Personal Quest: Erstelle Location, NPC und Quest via RPC
        if (
          character.backstory_summary &&
          character.backstory_summary.length > 20
        ) {
          try {
            console.log(
              "Starte KI-Quest-Generierung für Character:",
              membership.character_id,
            );

            await generateCharacterQuest(
              membership.character_id,
              campaignId,
              character.backstory_summary,
            );

            console.log("KI-Quest-Bundle erfolgreich erstellt");
          } catch (questGenError) {
            // WICHTIG: Wir fangen Fehler hier ab.
            // Wenn die KI fehlschlägt, soll der Spieler trotzdem akzeptiert bleiben!
            console.error(
              "Warnung: Automatische Quest-Bundle konnte nicht erstellt werden:",
              questGenError,
            );
          }
        }
        // -----------------------------------------------------------

        // Return analysis results for UI
        return {
          success: true,
          characterName: character.name || "Unbekannt",
          questTitle: analysis.personal_quest?.title,
          suggestedNPCs: analysis.suggested_npcs || [],
          suggestedLocations: analysis.suggested_locations || [],
        };
      } catch (analysisError) {
        console.error("Character Onboarding Analysis Error:", analysisError);
        // Don't fail the acceptance if analysis fails
        // Return basic success
        return {
          success: true,
          characterName: character.name || "Unbekannt",
        };
      }
    }
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard", "layout");

  return { success: true };
}

export async function rejectApplication(memberId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify GM ownership
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM.");
  }

  // Delete application
  const { error } = await (supabase.from("campaign_members") as any)
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Reject Application Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/gm-inbox`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/gm-inbox");
}

export async function removeMember(memberId: string, campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify GM ownership
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM.");
  }

  // Delete member
  const { error } = await (supabase.from("campaign_members") as any)
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Remove Member Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

export async function updateMemberRank(
  campaignId: string,
  targetUserId: string,
  rank: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const parsed = CampaignSchema.pick({
    id: true,
    gm_id: true,
    owner_id: true,
  }).safeParse(campaignRaw);

  if (
    !parsed.success ||
    (parsed.data.gm_id !== user.id && parsed.data.owner_id !== user.id)
  ) {
    throw new Error("Unauthorized: You are not the GM or owner.");
  }

  const { error } = await (supabase.from("campaign_members") as any)
    .update({ campaign_rank: rank || null })
    .eq("campaign_id", campaignId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Update Member Rank Error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
}

// ============================================================================
// PLAYER NOTIFICATION SYSTEM
// ============================================================================

export async function markAcceptanceAsSeen(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership (user can only mark their own acceptances as seen)
  const { data: membershipRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("user_id")
    .eq("id", memberId)
    .single();

  // Expliziter Cast, um 'never' zu verhindern
  const membership = membershipRaw as { user_id: string } | null;

  if (!membership || membership.user_id !== user.id) {
    throw new Error("Unauthorized: Not your membership.");
  }

  // Mark as seen
  const { error } = await (supabase.from("campaign_members") as any)
    .update({ has_seen_acceptance: true })
    .eq("id", memberId);

  if (error) {
    console.error("Mark Acceptance As Seen Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

// ============================================================================
// REPAIR: campaign_members.character_id für akzeptierte Mitglieder
// ============================================================================

/**
 * GM: Verknüpft fehlenden Charakter mit campaign_members (user_id + campaign_id).
 * Findet Charakter mit status Active/Alive/Approved und setzt character_id.
 */
export async function repairMemberCharacterLink(
  campaignId: string,
  userId: string,
  memberId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || (campaign as { gm_id: string }).gm_id !== user.id) {
    throw new Error("Nur der GM kann die Verknüpfung reparieren.");
  }

  let { data: char } = await (supabase.from("characters") as any)
    .select("id, name")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .in("status", ["Active", "Approved", "Pending_Approval"])
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!char) {
    const res = await (supabase.from("characters") as any)
      .select("id, name")
      .eq("user_id", userId)
      .in("status", ["Active", "Approved", "Pending_Approval"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    char = res.data;
  }

  if (!char) {
    throw new Error("Kein freigegebener Charakter für diesen Spieler gefunden.");
  }

  const { data: updated, error } = await (supabase.from("campaign_members") as any)
    .update({ character_id: (char as { id: string }).id })
    .eq("id", memberId)
    .eq("campaign_id", campaignId)
    .select("id, character_id");

  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) {
    throw new Error("Verknüpfung konnte nicht gespeichert werden (keine Zeile aktualisiert).");
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true, characterId: (char as { id: string }).id };
}

// ============================================================================
// DELETE CAMPAIGN
// ============================================================================

export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Verify GM ownership
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id, name")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({
    id: true,
    gm_id: true,
    name: true,
  }).safeParse(campaignRaw);

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Nicht autorisiert: Du bist nicht der GM dieser Kampagne.");
  }

  // Delete campaign (CASCADE should handle related data)
  const { error } = await (supabase.from("campaigns") as any)
    .delete()
    .eq("id", campaignId);

  if (error) {
    console.error("Delete Campaign Error:", error);
    throw new Error(error.message);
  }

  // Revalidate all relevant pages
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/");

  // Return success for client-side redirect handling
  return { success: true };
}

// ============================================================================
// Update Campaign Description (Rich-Text HTML)
// ============================================================================

export async function updateCampaignDescription(
  campaignId: string,
  htmlContent: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht authentifiziert." };

  // GM-Check
  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign || campaign.gm_id !== user.id) {
    return { success: false, error: "Nur der Spielleiter kann die Beschreibung bearbeiten." };
  }

  const { sanitizeDescriptionHtml } = await import("@/src/lib/sanitize-description-html");
  const clean = sanitizeDescriptionHtml(htmlContent);

  const { error } = await (supabase.from("campaigns") as any)
    .update({ description: clean })
    .eq("id", campaignId);

  if (error) {
    console.error("[updateCampaignDescription]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}
