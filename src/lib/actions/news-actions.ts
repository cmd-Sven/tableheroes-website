"use server";

import fs from "fs";
import path from "path";
import { after } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/server";
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

async function loadNewsPostForDiscord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<NewsPost | null> {
  const { data: post } = await (supabase.from("news_posts") as any)
    .select(
      "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at",
    )
    .eq("id", id)
    .single();
  return (post as NewsPost) ?? null;
}

export async function sendNewsPostToDiscord(
  id: string,
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
    return { success: false, error: "Nur Admins können News an Discord senden." };
  }

  const post = await loadNewsPostForDiscord(supabase, id);
  if (!post) return { success: false, error: "News nicht gefunden." };
  if (!post.is_published) {
    return { success: false, error: "Nur veröffentlichte News können gesendet werden." };
  }

  const { notifyNewsPublished } = await import("@/src/lib/integrations/discord/notify");
  const result = await notifyNewsPublished(post);
  return result.ok
    ? { success: true }
    : { success: false, error: result.error ?? "Discord-Versand fehlgeschlagen." };
}

export async function createNewsPost(
  input: NewsPostInsert
): Promise<{ success: boolean; id?: string; error?: string; discordWarning?: string }> {
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

  const postId = (data as any)?.id as string | undefined;
  let discordWarning: string | undefined;

  if (postId && input.is_published) {
    const { notifyNewsPublished } = await import("@/src/lib/integrations/discord/notify");
    const post = await loadNewsPostForDiscord(supabase, postId);
    if (post) {
      const discord = await notifyNewsPublished(post);
      if (!discord.ok) {
        discordWarning = discord.error ?? "Discord-Versand fehlgeschlagen.";
      }
    }

    after(async () => {
      const admin = createAdminClient();
      const { notifyNewsPublishedEmails } = await import("@/src/lib/email/dispatch");
      await notifyNewsPublishedEmails({
        supabase: admin,
        newsPostId: postId,
        title: input.title?.trim() ?? "Neue News",
      });
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/news");
  revalidatePath("/dashboard/admin/news");
  return { success: true, id: postId, discordWarning };
}

export async function updateNewsPost(
  id: string,
  input: Partial<NewsPostInsert>
): Promise<{ success: boolean; error?: string; discordWarning?: string }> {
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

  const { data: beforeRow } = await (supabase.from("news_posts") as any)
    .select("is_published")
    .eq("id", id)
    .single();
  const wasPublished = !!(beforeRow as { is_published?: boolean } | null)?.is_published;

  const { error } = await (supabase.from("news_posts") as any)
    .update(updates)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  let discordWarning: string | undefined;
  const post = await loadNewsPostForDiscord(supabase, id);
  const newlyPublished = !!post?.is_published && !wasPublished;

  if (newlyPublished && post) {
    const { notifyNewsPublished } = await import("@/src/lib/integrations/discord/notify");
    const discord = await notifyNewsPublished(post);
    if (!discord.ok) {
      discordWarning = discord.error ?? "Discord-Versand fehlgeschlagen.";
    }

    after(async () => {
      const admin = createAdminClient();
      const { notifyNewsPublishedEmails } = await import("@/src/lib/email/dispatch");
      await notifyNewsPublishedEmails({
        supabase: admin,
        newsPostId: id,
        title: post.title?.trim() ?? "Neue News",
      });
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/news");
  revalidatePath("/dashboard/admin/news");
  return { success: true, discordWarning };
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
