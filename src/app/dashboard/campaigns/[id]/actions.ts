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

export async function togglePublishStatus(
  campaignId: string,
  currentState: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM of this campaign.");
  }

  // Toggle is_published
  const { error } = await (supabase.from("campaigns") as any)
    .update({ is_published: !currentState })
    .eq("id", campaignId);

  if (error) {
    console.error("Toggle Publish Error:", error);
    throw new Error(error.message);
  }

  // Revalidate pages
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/"); // Landing page
}

export async function updateCampaignDetails(
  campaignId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Validierung mit Zod
  const parsed = CampaignSchema.pick({ id: true, gm_id: true }).safeParse(
    campaignRaw,
  );

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM of this campaign.");
  }

  // Extract form data
  const banner_url = formData.get("banner_url") as string;
  const frequency = formData.get("frequency") as string;
  const looking_for = formData.get("looking_for") as string;
  const house_rules = formData.get("house_rules") as string;

  // Update campaign
  const { error } = await (supabase.from("campaigns") as any)
    .update({
      banner_url: banner_url || null,
      frequency: frequency || null,
      looking_for: looking_for || null,
      house_rules: house_rules || null,
    })
    .eq("id", campaignId);

  if (error) {
    console.error("Update Campaign Details Error:", error);
    throw new Error(error.message);
  }

  // Revalidate pages
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}`); // Public page
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
    if (existing.status === "Applied" || existing.status === "Pending") {
      throw new Error("Du hast dich bereits beworben.");
    }
    if (existing.status === "Accepted") {
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
    if (existing.status === "Accepted") {
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
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  const parsed = CampaignSchema.pick({
    id: true,
    gm_id: true,
  }).safeParse(campaignRaw);

  if (!parsed.success || parsed.data.gm_id !== user.id) {
    throw new Error("Unauthorized: You are not the GM.");
  }

  const { error } = await (supabase.from("users") as any)
    .update({ current_rank: rank || null })
    .eq("id", targetUserId);

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

  // Serverseitige Sanitization (XSS-Schutz)
  const sanitizeHtml = (await import("sanitize-html")).default;
  const clean = sanitizeHtml(htmlContent, {
    allowedTags: [
      "h1", "h2", "h3", "p", "br",
      "strong", "b", "em", "i",
      "ul", "ol", "li",
      "blockquote",
    ],
    allowedAttributes: {},
    allowedClasses: {},
  });

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
