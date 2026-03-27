import { createClient } from "@/src/lib/supabase/server";
import type { NewsPost } from "@/src/lib/constants/news";

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
        "id, title, category, content, image_url, is_published, show_on_dashboard, show_on_landingpage, created_at, updated_at",
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
