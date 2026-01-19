"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ImportantPerson = {
  name: string;
  relation: string;
  age: number;
  alignment: string;
  npc_id?: string | null;
};

type SubmitCharacterApplicationData = {
  campaignId: string;
  // Step 1
  name: string;
  class: string;
  race: string;
  level: number;
  avatar_url?: string;
  age?: number;
  physical_traits?: string;
  personality_adjectives?: string[];
  // Step 2
  backstory_summary?: string;
  profession?: string;
  faction_id?: string | null; // Strict: Nur ID, keine neuen Namen
  current_location_id?: string | null; // Parent Location
  temp_location_name?: string | null; // Optional: Detail-Ort
  // Step 3
  goals?: string;
  fears?: string;
  important_people?: ImportantPerson[];
};

export async function submitCharacterApplication(data: SubmitCharacterApplicationData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  // Validation
  if (!data.name || !data.class || !data.race) {
    throw new Error("Name, Klasse und Rasse sind Pflichtfelder.");
  }

  // Prüfe ob campaignId vorhanden ist (Legacy-Check)
  if (!data.campaignId) {
    throw new Error("Kampagnen-ID ist erforderlich.");
  }

  // Fraktionen: Strict Mode (nur ID, keine neuen Namen)
  const factionId = data.faction_id || null;

  // Orte: Hybrid (Parent + optional Detail)
  const locationId = data.current_location_id || null;
  const tempLocationName = data.temp_location_name || null;

  // Filtere leere Strings aus personality_adjectives
  const personalityAdjectives = data.personality_adjectives
    ? data.personality_adjectives.filter((adj) => adj.trim().length > 0)
    : null;

  // Insert character
  const { data: character, error } = await (supabase.from("characters") as any)
    .insert({
      user_id: user.id,
      name: data.name,
      class: data.class,
      race: data.race,
      level: data.level,
      avatar_url: data.avatar_url || null,
      age: data.age || null,
      physical_traits: data.physical_traits || null,
      personality_adjectives: personalityAdjectives,
      backstory_summary: data.backstory_summary || null,
      profession: data.profession || null,
      goals: data.goals || null,
      fears: data.fears || null,
      important_people: data.important_people && data.important_people.length > 0 
        ? data.important_people 
        : null,
      // Fraktion: Strict (nur ID)
      faction_id: factionId,
      // Ort: Hybrid (Parent + optional Detail)
      current_location_id: locationId,
      temp_location_name: tempLocationName,
      campaign_id: data.campaignId, // Zugewiesen zur Kampagne
      status: "In_Review", // Neuer Status
    })
    .select()
    .single();

  if (error) {
    console.error("Create Character Application Error:", error);
    throw new Error(error.message);
  }

  // Update campaign_members Status zu "In_Review"
  // (Die Bewerbung existiert bereits mit Status "Drafting")
  const { error: applicationError } = await (supabase.from("campaign_members") as any)
    .update({ status: "In_Review" })
    .eq("campaign_id", data.campaignId)
    .eq("user_id", user.id)
    .eq("character_id", character.id);

  if (applicationError) {
    console.error("Create Application Error:", applicationError);
    throw new Error(applicationError.message);
  }

  revalidatePath(`/dashboard/campaigns/${data.campaignId}`);
  revalidatePath("/dashboard");

  return { success: true, characterId: character.id };
}

