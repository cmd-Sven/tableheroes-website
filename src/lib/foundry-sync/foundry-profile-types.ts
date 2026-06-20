export type FoundryProfileAchievement = {
  id: string;
  name: string;
  points_awarded: number;
  awarded_at: string;
  image_url: string | null;
};

export type FoundryProfilePointsLogEntry = {
  amount: number;
  reason: string;
  created_at: string;
};

export type FoundryProfileCurrency = {
  gp: number;
  sp: number;
  cp: number;
  ep: number;
  pp: number;
};

export type FoundryProfilePortrait = {
  url: string | null;
  storage_path: string | null;
  updated_at: string | null;
};

export type FoundryPlayerProfile = {
  foundry_actor_id: string;
  character_id: string | null;
  character_name: string | null;
  user_id: string | null;
  username: string | null;
  mapped: boolean;
  points: {
    total: number;
    lifetime: number;
    rank_label: string;
    level: number;
    next_level_at: number | null;
  } | null;
  achievements: FoundryProfileAchievement[];
  recent_points: FoundryProfilePointsLogEntry[];
  wealth: FoundryProfileCurrency | null;
  portrait: FoundryProfilePortrait | null;
};

export type FoundryProfileResponse = {
  ok: true;
  endpoint: "foundry-profile";
  campaign_id: string;
  campaign_name: string | null;
  dashboard_url: string;
  points_catalog_url: string;
  players: FoundryPlayerProfile[];
};
