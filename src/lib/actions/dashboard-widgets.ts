"use server";

import { createClient } from "@/src/lib/supabase/server";
import fs from "fs";
import path from "path";
import type { LoreSnippet } from "@/src/lib/types/dashboard-widgets";

const LORE_TEASER_LENGTH = 150;
const COMIC_IMAGE_DIR = path.join(process.cwd(), "public", "images", "comic");
const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

/**
 * Lädt einen zufälligen Lore-Eintrag aus world_lore, der is_revealed === true ist
 * und zu einer Kampagne gehört, in der der Spieler Mitglied ist.
 * hasNewContent: true, wenn der Eintrag jünger ist als last_lore_view.
 */
export async function getRandomLoreSnippet(userId: string): Promise<{
  snippet: LoreSnippet | null;
  hasNewContent: boolean;
}> {
  const supabase = await createClient();

  const { data: userRow } = await (supabase.from("users") as any)
    .select("last_lore_view")
    .eq("id", userId)
    .maybeSingle();
  const lastView = (userRow as any)?.last_lore_view ?? null;

  const { data: memberships } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .eq("status", "Accepted");

  const campaignIds = [
    ...new Set(
      ((memberships as any[]) || [])
        .map((m: any) => m.campaign_id)
        .filter(Boolean)
    ),
  ];
  if (campaignIds.length === 0) return { snippet: null, hasNewContent: false };

  const { data: loreRows } = await (supabase.from("world_lore") as any)
    .select("id, name, description, campaign_id, updated_at, created_at")
    .in("campaign_id", campaignIds)
    .eq("is_revealed", true)
    .limit(50);

  const list = (loreRows as any[]) || [];
  if (list.length === 0) return { snippet: null, hasNewContent: false };

  const picked = list[Math.floor(Math.random() * list.length)];
  const campaignId = picked.campaign_id;
  const contentAt = picked.updated_at ?? picked.created_at ?? null;
  const hasNewContent =
    !!contentAt && (!lastView || new Date(contentAt) > new Date(lastView));

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("name")
    .eq("id", campaignId)
    .single();

  const rawDescription = picked.description ?? "";
  const teaser =
    rawDescription.length <= LORE_TEASER_LENGTH
      ? rawDescription
      : rawDescription.slice(0, LORE_TEASER_LENGTH).trim() + "…";

  const snippet: LoreSnippet = {
    id: picked.id,
    name: picked.name ?? "Lore",
    teaser: teaser || "Keine Beschreibung.",
    campaignId,
    campaignName: (campaign as any)?.name ?? "Kampagne",
  };
  return { snippet, hasNewContent };
}

/**
 * Scannt public/images/comic/ und gibt alle Bild-Dateinamen zurück (sortiert).
 */
function getComicFilenames(): string[] {
  try {
    if (!fs.existsSync(COMIC_IMAGE_DIR)) return [];
    const entries = fs.readdirSync(COMIC_IMAGE_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const lower = name.toLowerCase();
        return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Wählt basierend auf dem aktuellen Datum (Tag als Seed) ein Bild aus dem Comic-Ordner.
 * Alle Spieler sehen am selben Tag denselben Comic.
 */
export async function getDailyComic(): Promise<{
  filename: string | null;
  src: string | null;
}> {
  const filenames = getComicFilenames();
  if (filenames.length === 0) return { filename: null, src: null };

  const today = new Date();
  const dateSeed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const index = dateSeed % filenames.length;
  const filename = filenames[index];
  return {
    filename,
    src: `/images/comic/${encodeURIComponent(filename)}`,
  };
}
