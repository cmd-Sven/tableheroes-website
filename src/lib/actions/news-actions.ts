"use server";

import fs from "fs";
import path from "path";
import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  NEWS_CATEGORIES,
  type NewsPost,
  type NewsPostInsert,
} from "@/src/lib/constants/news";

const NEWS_IMAGE_DIR = path.join(process.cwd(), "public", "images", "news");
const NEWS_IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

/** Normalisiert Bild-URLs für News: */
function normalizeNewsImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Externe oder absolute Pfade unverändert lassen
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  // Reiner Dateiname -> /images/news/[dateiname]
  return `/images/news/${trimmed}`;
}

/** Scannt public/images/news/ und gibt alle Bild-Dateinamen zurück (sortiert). Für Admin-Dropdown. */
export async function getNewsImageFilenames(): Promise<string[]> {
  try {
    if (!fs.existsSync(NEWS_IMAGE_DIR)) return [];
    const entries = fs.readdirSync(NEWS_IMAGE_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const lower = name.toLowerCase();
        return NEWS_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Für Dashboard-Card: 3 neueste, veröffentlicht + show_on_dashboard. Liefert hasNewContent, wenn der neueste Post jünger ist als last_news_view. */
export async function getNewsForDashboard(userId: string): Promise<{
  posts: NewsPost[];
  hasNewContent: boolean;
}> {
  const supabase = await createClient();
  const [userRes, postsRes] = await Promise.all([
    (supabase.from("users") as any)
      .select("last_news_view")
      .eq("id", userId)
      .maybeSingle(),
    (supabase.from("news_posts") as any)
      .select(
        "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at"
      )
      .eq("is_published", true)
      .eq("show_on_dashboard", true)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const posts = (postsRes.data as any[]) || [];
  if (postsRes.error) return { posts: [], hasNewContent: false };
  const lastView = (userRes.data as any)?.last_news_view ?? null;
  const newestAt = posts[0]?.created_at ?? null;
  const hasNewContent =
    !!newestAt && (!lastView || new Date(newestAt) > new Date(lastView));
  return { posts, hasNewContent };
}

/** Öffentliche Landingpage: max. 3 veröffentlichte News, die auf der Landingpage angezeigt werden sollen. */
export async function getLandingPageNews(): Promise<NewsPost[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("news_posts") as any)
    .select(
      "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at"
    )
    .eq("is_published", true)
    .eq("show_on_landingpage", true)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) return [];
  return (data as any[]) || [];
}

/** Admin: Alle News-Posts. */
export async function getAllNewsPosts(): Promise<NewsPost[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("news_posts") as any)
    .select(
      "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as any[]) || [];
}

/** Mitglieder-Archiv: alle veröffentlichten News. */
export async function getAllPublishedNews(): Promise<NewsPost[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("news_posts") as any)
    .select(
      "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as any[]) || [];
}

/** Einzelnen Post laden (für Modal/Detail). */
export async function getNewsPostById(id: string): Promise<NewsPost | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("news_posts") as any)
    .select(
      "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as NewsPost;
}

export async function createNewsPost(
  input: NewsPostInsert
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();
  if (
    (profile as any)?.primary_role !== "Admin" &&
    !(profile as any)?.is_super_admin
  ) {
    return { success: false, error: "Nur Admins können News erstellen." };
  }

  const { data, error } = await (supabase.from("news_posts") as any)
    .insert({
      title: input.title?.trim() ?? "",
      category: input.category ?? NEWS_CATEGORIES[0],
      content: input.content?.trim() || null,
      image_url: normalizeNewsImageUrl(input.image_url),
      is_published: input.is_published ?? false,
      show_on_dashboard: input.show_on_dashboard ?? false,
      show_on_landingpage: input.show_on_landingpage ?? false,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/news");
  revalidatePath("/dashboard/admin/news");
  return { success: true, id: (data as any)?.id };
}

export async function updateNewsPost(
  id: string,
  input: Partial<NewsPostInsert>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();
  if (
    (profile as any)?.primary_role !== "Admin" &&
    !(profile as any)?.is_super_admin
  ) {
    return { success: false, error: "Nur Admins können News bearbeiten." };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.category !== undefined) updates.category = input.category;
  if (input.content !== undefined)
    updates.content = input.content?.trim() || null;
  if (input.image_url !== undefined)
    updates.image_url = normalizeNewsImageUrl(input.image_url);
  if (input.is_published !== undefined)
    updates.is_published = input.is_published;
  if (input.show_on_dashboard !== undefined)
    updates.show_on_dashboard = input.show_on_dashboard;
  if (input.show_on_landingpage !== undefined)
    updates.show_on_landingpage = input.show_on_landingpage;

  const { error } = await (supabase.from("news_posts") as any)
    .update(updates)
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/news");
  revalidatePath("/dashboard/admin/news");
  return { success: true };
}

export async function deleteNewsPost(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  const { data: profile } = await (supabase.from("users") as any)
    .select("primary_role, is_super_admin")
    .eq("id", user.id)
    .single();
  if (
    (profile as any)?.primary_role !== "Admin" &&
    !(profile as any)?.is_super_admin
  ) {
    return { success: false, error: "Nur Admins können News löschen." };
  }

  const { error } = await (supabase.from("news_posts") as any)
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/news");
  revalidatePath("/dashboard/admin/news");
  return { success: true };
}
