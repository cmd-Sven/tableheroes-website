"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OnboardingPayload = {
  experience_level: "Neuling" | "Erfahren" | "Veteran";
  previous_games: string;
  motivation: string;
  codex_agreed: boolean;
  tech_requirements_agreed: boolean;
};

/**
 * Speichert die Onboarding-Daten des Users und setzt den Status auf "pending"
 * (= wartet auf Admin-Freigabe).
 */
export async function submitOnboarding(
  payload: OnboardingPayload
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Nicht authentifiziert." };
  }

  // Validierung
  const validLevels = ["Neuling", "Erfahren", "Veteran"];
  if (!validLevels.includes(payload.experience_level)) {
    return { success: false, error: "Ungültiges Erfahrungslevel." };
  }
  if (!payload.previous_games?.trim()) {
    return {
      success: false,
      error: "Bitte gib an, welche Spiele du bereits gespielt hast.",
    };
  }
  if (!payload.motivation?.trim()) {
    return { success: false, error: "Bitte gib deine Motivation an." };
  }
  if (!payload.codex_agreed) {
    return {
      success: false,
      error: "Du musst den TableHeroes-Kodex akzeptieren.",
    };
  }
  if (!payload.tech_requirements_agreed) {
    return {
      success: false,
      error: "Bitte bestätige die technischen Voraussetzungen.",
    };
  }

  const dataToSave = {
    experience_level: payload.experience_level,
    previous_games: payload.previous_games.trim(),
    motivation: payload.motivation.trim(),
    codex_agreed: true,
    tech_requirements_agreed: true,
    status: "pending",
  };

  console.log("Onboarding Data to Save:", dataToSave);

  const { error } = await (supabase.from("users") as any)
    .update(dataToSave)
    .eq("id", user.id);

  if (error) {
    console.error("[submitOnboarding]", error);
    return {
      success: false,
      error: "Onboarding konnte nicht gespeichert werden.",
    };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

/**
 * Prüft, ob der aktuelle User das Onboarding bereits abgeschlossen hat.
 */
export async function getOnboardingStatus(): Promise<{
  completed: boolean;
  status: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { completed: false, status: null };

  const { data } = await (supabase.from("users") as any)
    .select("codex_agreed, status")
    .eq("id", user.id)
    .maybeSingle();

  const row = data as { codex_agreed?: boolean; status?: string } | null;
  return {
    completed: !!row?.codex_agreed,
    status: row?.status ?? null,
  };
}
