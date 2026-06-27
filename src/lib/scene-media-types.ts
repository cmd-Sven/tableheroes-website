export const SCENE_MEDIA_CATEGORIES = [
  "NPC",
  "Lore",
  "Stadt",
  "Region",
  "Quest",
  "Beast",
  "Monster",
  "Fraktion",
  "Sonstiges",
] as const;

export type SceneMediaCategory = (typeof SCENE_MEDIA_CATEGORIES)[number];

export type CampaignSceneMedia = {
  id: string;
  campaign_id: string;
  title: string;
  image_url: string;
  image_storage_path: string | null;
  category: SceneMediaCategory | string;
  gm_notes: string | null;
  player_notes: string | null;
  image_is_ai_generated: boolean;
  image_upload_rights_confirmed: boolean | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SceneMediaAppearance = {
  id: string;
  scene_media_id: string;
  session_id: string;
  archive_id: string | null;
  npc_ids: string[];
  location_lore_id: string | null;
  location_name: string | null;
  shown_at: string;
  scene?: Pick<CampaignSceneMedia, "id" | "title" | "image_url" | "category">;
  session_name?: string | null;
};

export type SceneGalleryEntry = {
  id: string;
  title: string;
  image_url: string;
  category: string;
  npc_ids: string[];
  location_lore_id: string | null;
  location_name: string | null;
  shown_at: string;
};
