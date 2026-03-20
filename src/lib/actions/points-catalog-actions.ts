"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  type: "physical" | "achievement";
  image_url: string | null;
  achievement_id: string | null;
  achievement_name?: string | null;
  created_at: string;
};

/** Lädt alle Katalog-Einträge (für Spieler und GM). */
export async function getPointsCatalog(): Promise<CatalogItem[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase.from("points_catalog") as any)
    .select(
      "id, name, description, points_cost, type, image_url, achievement_id, created_at, achievements:achievement_id ( name )"
    )
    .order("points_cost", { ascending: true });

  if (error) {
    console.error("[getPointsCatalog] Fehler:", error);
    return [];
  }

  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    points_cost: Number(row.points_cost) || 0,
    type: row.type ?? "physical",
    image_url: row.image_url ?? null,
    achievement_id: row.achievement_id ?? null,
    achievement_name: (row.achievements as any)?.name ?? null,
    created_at: row.created_at,
  }));
}

/** GM: Erstellt einen Katalog-Eintrag. */
export async function createCatalogItem(
  name: string,
  description: string | null,
  pointsCost: number,
  type: "physical" | "achievement",
  imageUrl: string | null,
  achievementId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as any)?.primary_role;
  if (role !== "GameMaster" && role !== "Admin") {
    return { success: false, error: "Nur GMs können den Punktekatalog verwalten." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName) return { success: false, error: "Name ist erforderlich." };
  if (!Number.isInteger(pointsCost) || pointsCost <= 0) {
    return { success: false, error: "Punktekosten müssen eine positive Zahl sein." };
  }
  if (type === "achievement" && !achievementId) {
    return { success: false, error: "Bei Achievement-Belohnung muss ein Achievement gewählt werden." };
  }

  const { error } = await (supabase.from("points_catalog") as any).insert({
    name: trimmedName,
    description: description?.trim() || null,
    points_cost: pointsCost,
    type,
    image_url: imageUrl?.trim() || null,
    achievement_id: type === "achievement" ? achievementId : null,
    created_by: user.id,
  });

  if (error) {
    console.error("[createCatalogItem]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/points/catalog");
  revalidatePath("/dashboard/gm/points-catalog");
  return { success: true };
}

/** GM: Aktualisiert einen Katalog-Eintrag. */
export async function updateCatalogItem(
  id: string,
  name: string,
  description: string | null,
  pointsCost: number,
  type: "physical" | "achievement",
  imageUrl: string | null,
  achievementId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as any)?.primary_role;
  if (role !== "GameMaster" && role !== "Admin") {
    return { success: false, error: "Nur GMs können den Punktekatalog verwalten." };
  }

  const trimmedName = name?.trim();
  if (!trimmedName) return { success: false, error: "Name ist erforderlich." };
  if (!Number.isInteger(pointsCost) || pointsCost <= 0) {
    return { success: false, error: "Punktekosten müssen eine positive Zahl sein." };
  }
  if (type === "achievement" && !achievementId) {
    return { success: false, error: "Bei Achievement-Belohnung muss ein Achievement gewählt werden." };
  }

  const { error } = await (supabase.from("points_catalog") as any)
    .update({
      name: trimmedName,
      description: description?.trim() || null,
      points_cost: pointsCost,
      type,
      image_url: imageUrl?.trim() || null,
      achievement_id: type === "achievement" ? achievementId : null,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateCatalogItem]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/points/catalog");
  revalidatePath("/dashboard/gm/points-catalog");
  return { success: true };
}

/** GM: Löscht einen Katalog-Eintrag. */
export async function deleteCatalogItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const role = (profile as any)?.primary_role;
  if (role !== "GameMaster" && role !== "Admin") {
    return { success: false, error: "Nur GMs können den Punktekatalog verwalten." };
  }

  const { error } = await (supabase.from("points_catalog") as any)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteCatalogItem]", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/points/catalog");
  revalidatePath("/dashboard/gm/points-catalog");
  return { success: true };
}

/** Spieler: Löst eine Belohnung ein (Punkte ausgeben). */
export async function redeemCatalogItem(
  catalogItemId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { success: false, error: "Nicht autorisiert." };
  }

  const { data: item, error: itemErr } = await (
    supabase.from("points_catalog") as any
  )
    .select("id, name, points_cost, type, achievement_id, achievements:achievement_id ( name )")
    .eq("id", catalogItemId)
    .single();

  if (itemErr || !item) {
    return { success: false, error: "Belohnung nicht gefunden." };
  }

  const cost = Number(item.points_cost) || 0;
  if (cost <= 0) return { success: false, error: "Ungültige Belohnung." };

  const { data: userData } = await (supabase.from("users") as any)
    .select("total_points")
    .eq("id", userId)
    .single();

  const currentPoints = Number((userData as any)?.total_points) || 0;
  if (currentPoints < cost) {
    return {
      success: false,
      error: `Du hast nur ${currentPoints} Punkte. Diese Belohnung kostet ${cost} Punkte.`,
    };
  }

  const newTotal = Math.max(0, currentPoints - cost);
  const reason = `Belohnung eingelöst: ${item.name}`;

  // 1. points_log Eintrag (negativer Betrag)
  const { error: logErr } = await (supabase.from("points_log") as any).insert({
    user_id: userId,
    amount: -cost,
    reason,
    created_by: user.id,
    catalog_item_id: catalogItemId,
  });

  if (logErr) {
    console.error("[redeemCatalogItem] points_log Fehler:", logErr);
    return { success: false, error: logErr.message };
  }

  // 2. total_points reduzieren
  const { error: updateErr } = await (supabase.from("users") as any)
    .update({ total_points: newTotal })
    .eq("id", userId);

  if (updateErr) {
    console.error("[redeemCatalogItem] Update Fehler:", updateErr);
    return { success: false, error: updateErr.message };
  }

  // 3. Bei type=achievement: Achievement verleihen (über Namen)
  if (item.type === "achievement" && item.achievement_id) {
    const achName = (item.achievements as any)?.name;
    if (achName) {
      const { awardAchievement } = await import("./achievement-actions");
      await awardAchievement(userId, achName, user.id, true);
    }
  }

  revalidatePath("/dashboard/points");
  revalidatePath("/dashboard/points/catalog");
  revalidatePath("/dashboard");
  return { success: true };
}
