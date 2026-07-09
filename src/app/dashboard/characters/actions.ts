"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  evaluateCharacterDeletionState,
  type CharacterDeletionState,
} from "@/src/lib/characters/character-deletion";

/**
 * @deprecated Diese Funktion ist veraltet. Charaktere können nur noch innerhalb einer Kampagne erstellt werden.
 * Nutze stattdessen `submitCharacterApplication` aus `application-actions.ts`.
 *
 * Diese Funktion wurde abgesichert, um zu verhindern, dass kontextlose Charaktere erstellt werden.
 */
export async function createCharacter(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const class_name = formData.get("class") as string;
  const race = formData.get("race") as string;
  const level = parseInt(formData.get("level") as string) || 1;
  const avatar_url = formData.get("avatar_url") as string;
  const backstory_summary = formData.get("backstory_summary") as string;
  const goals = formData.get("goals") as string;
  const fears = formData.get("fears") as string;
  const important_people = formData.get("important_people") as string;
  const rivals = formData.get("rivals") as string;
  const faction_membership = formData.get("faction_membership") as string;
  const profession = formData.get("profession") as string;
  const campaign_id = formData.get("campaign_id") as string | null;

  if (!name || !class_name || !race) {
    throw new Error("Name, Klasse und Rasse sind Pflichtfelder.");
  }

  if (!campaign_id) {
    throw new Error(
      "Charaktere können nur innerhalb einer Kampagne erstellt werden. Bitte bewerbe dich zuerst bei einer Kampagne.",
    );
  }

  const { error } = await (supabase.from("characters") as any).insert({
    user_id: user.id,
    name: name,
    class: class_name,
    race: race,
    level: level,
    avatar_url: avatar_url || null,
    campaign_id: campaign_id,
    backstory_summary: backstory_summary || null,
    goals: goals || null,
    fears: fears || null,
    important_people: important_people || null,
    rivals: rivals || null,
    faction_membership: faction_membership || null,
    profession: profession || null,
  });

  if (error) {
    console.error("Create Character Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function getCharacterDeletionState(
  characterId: string,
): Promise<CharacterDeletionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      canDelete: false,
      isCampaignLinked: false,
      reason: "Nicht authentifiziert.",
    };
  }

  const { data: characterRaw } = await (supabase.from("characters") as any)
    .select("id, user_id, campaign_id, status")
    .eq("id", characterId)
    .maybeSingle();

  const character = characterRaw as {
    id: string;
    user_id: string;
    campaign_id: string;
    status: string | null;
  } | null;

  if (!character || character.user_id !== user.id) {
    return {
      canDelete: false,
      isCampaignLinked: false,
      reason: "Keine Berechtigung.",
    };
  }

  const { data: memberRaw } = await (supabase.from("campaign_members") as any)
    .select("character_id, status")
    .eq("campaign_id", character.campaign_id)
    .eq("user_id", user.id)
    .maybeSingle();

  return evaluateCharacterDeletionState(
    character,
    memberRaw as { character_id?: string | null; status?: string | null } | null,
  );
}

export async function deleteCharacter(characterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: characterRaw } = await (supabase.from("characters") as any)
    .select("id, user_id, campaign_id, status")
    .eq("id", characterId)
    .single();

  const character = characterRaw as {
    id: string;
    user_id: string;
    campaign_id: string;
    status: string | null;
  } | null;

  if (!character || character.user_id !== user.id) {
    throw new Error("Keine Berechtigung: Dieser Charakter gehört dir nicht.");
  }

  const { data: memberRaw } = await (supabase.from("campaign_members") as any)
    .select("character_id, status")
    .eq("campaign_id", character.campaign_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const deletionState = evaluateCharacterDeletionState(
    character,
    memberRaw as { character_id?: string | null; status?: string | null } | null,
  );

  if (!deletionState.canDelete) {
    throw new Error(
      deletionState.reason ??
        "Dieser Charakter ist mit einer Kampagne verknüpft und kann nicht gelöscht werden.",
    );
  }

  const { error } = await (supabase.from("characters") as any)
    .delete()
    .eq("id", characterId);

  if (error) {
    console.error("Delete Character Error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/characters");
}
