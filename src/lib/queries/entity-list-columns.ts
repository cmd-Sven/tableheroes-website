/** Listen-Queries: genug für Cards/Filter, ohne schwere JSON/Text-Walls. */

export const NPC_LIST_SELECT = [
  "id",
  "world_id",
  "name",
  "title",
  "role",
  "race",
  "status",
  "description",
  "appearance",
  "personality_traits",
  "gm_notes",
  "image_url",
  "image_display",
  "faction_id",
  "current_location_id",
  "home_location_id",
  "shop_id",
  "is_merchant",
  "allow_pc_onboarding",
  "alignment",
  "created_at",
].join(", ");

/** Session-Stage: nur Felder die LiveSessionBoard mappt. */
export const NPC_SESSION_STAGE_SELECT = [
  "id",
  "name",
  "title",
  "description",
  "image_url",
  "is_merchant",
  "shop_id",
  "faction_id",
  "current_location_id",
  "home_location_id",
].join(", ");

export const LORE_LIST_SELECT = [
  "id",
  "world_id",
  "name",
  "type",
  "description",
  "gm_notes",
  "image_url",
  "default_image_url",
  "image_display",
  "additional_images",
  "parent_id",
  "culture_id",
  "race_ids",
  "language_ids",
  "religion_ids",
  "allow_pc_origin",
  "created_at",
].join(", ");

export const FACTION_LIST_SELECT = [
  "id",
  "world_id",
  "name",
  "type",
  "description",
  "gm_notes",
  "image_url",
  "image_display",
  "banner_url",
  "banner_display",
  "current_status",
  "alignment",
  "allow_pc_join_on_creation",
  "hq_location_id",
  "location_id",
  "lore_id",
  "created_at",
].join(", ");

export const SCENE_MEDIA_SESSION_SELECT = [
  "id",
  "title",
  "image_url",
  "category",
  "player_notes",
  "image_is_ai_generated",
  "sort_order",
].join(", ");

export const BESTARIUM_SESSION_SELECT = [
  "id",
  "name",
  "creature_type",
  "image_url",
  "physical_description",
  "challenge_rating",
  "known_loot",
].join(", ");
