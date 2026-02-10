/** News-Kategorien für das Admin-CMS (nicht "use server"). */
export const NEWS_CATEGORIES = [
  "Web-Update",
  "Neue Kampagne",
  "Event",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsPost = {
  id: string;
  title: string;
  category: string;
  content: string | null;
  image_url: string | null;
  is_published: boolean;
  show_on_dashboard: boolean;
  show_on_landingpage: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type NewsPostInsert = {
  title: string;
  category: string;
  content?: string | null;
  image_url?: string | null;
  is_published?: boolean;
  show_on_dashboard?: boolean;
  show_on_landingpage?: boolean;
};
