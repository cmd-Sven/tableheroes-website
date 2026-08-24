/**
 * actions — part 2: acceptApplication, rejectApplication, removeMember, updateMemberRank, markAcceptanceAsSeen, repairMemberCharacterLink.
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
