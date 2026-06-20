import {
  calculateLevel,
  getPointsForNextLevel,
  getRankFromPoints,
} from "@/src/lib/utils/rank-utils";
import type {
  FoundryPlayerProfile,
  FoundryProfileResponse,
} from "./foundry-profile-types";

const DEFAULT_SITE_URL = "https://table-heroes.de";

type LoadOpts = {
  foundryActorId?: string | null;
  achievementsLimit?: number;
  pointsLogLimit?: number;
};

export async function loadFoundryCampaignProfiles(
  supabase: { from: (table: string) => unknown },
  campaignId: string,
  opts: LoadOpts = {},
): Promise<FoundryProfileResponse> {
  const achievementsLimit = Math.min(20, Math.max(0, opts.achievementsLimit ?? 8));
  const pointsLogLimit = Math.min(10, Math.max(0, opts.pointsLogLimit ?? 5));
  const actorFilter = opts.foundryActorId?.trim() || null;

  const { data: campaignRaw } = await (supabase as any)
    .from("campaigns")
    .select("name")
    .eq("id", campaignId)
    .maybeSingle();

  let mappingQuery = (supabase as any)
    .from("foundry_character_mapping")
    .select("foundry_actor_id, character_id")
    .eq("campaign_id", campaignId);

  if (actorFilter) {
    mappingQuery = mappingQuery.eq("foundry_actor_id", actorFilter);
  }

  const { data: mappingRows, error: mappingError } = await mappingQuery;
  if (mappingError) {
    throw new Error("Foundry mapping lookup failed.");
  }

  const mappings = (mappingRows ?? []) as Array<{
    foundry_actor_id: string;
    character_id: string | null;
  }>;

  const characterIds = [
    ...new Set(
      mappings.map((m) => m.character_id).filter((id): id is string => Boolean(id)),
    ),
  ];

  const characterById = new Map<
    string,
    { id: string; name: string | null; user_id: string | null }
  >();

  if (characterIds.length > 0) {
    const { data: characterRows } = await (supabase as any)
      .from("characters")
      .select("id, name, user_id")
      .eq("campaign_id", campaignId)
      .in("id", characterIds);

    for (const row of (characterRows ?? []) as Array<{
      id: string;
      name: string | null;
      user_id: string | null;
    }>) {
      characterById.set(String(row.id), {
        id: String(row.id),
        name: row.name != null ? String(row.name) : null,
        user_id: row.user_id != null ? String(row.user_id) : null,
      });
    }
  }

  const userIds = [
    ...new Set(
      [...characterById.values()]
        .map((c) => c.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const userById = new Map<
    string,
    { username: string | null; total_points: number; lifetime_points: number }
  >();

  if (userIds.length > 0) {
    const { data: userRows } = await (supabase as any)
      .from("users")
      .select("id, username, total_points, lifetime_points")
      .in("id", userIds);

    for (const row of (userRows ?? []) as Array<{
      id: string;
      username: string | null;
      total_points: number | null;
      lifetime_points: number | null;
    }>) {
      userById.set(String(row.id), {
        username: row.username != null ? String(row.username) : null,
        total_points: Number(row.total_points) || 0,
        lifetime_points: Number(row.lifetime_points) || 0,
      });
    }
  }

  const achievementsByUser = new Map<string, FoundryPlayerProfile["achievements"]>();
  if (achievementsLimit > 0 && userIds.length > 0) {
    const { data: achRows } = await (supabase as any)
      .from("user_achievements")
      .select(
        "user_id, awarded_at, achievements:achievement_id ( id, name, image_url, points_awarded )",
      )
      .in("user_id", userIds)
      .order("awarded_at", { ascending: false });

    for (const row of (achRows ?? []) as Array<{
      user_id: string;
      awarded_at: string;
      achievements: {
        id: string;
        name: string;
        image_url: string | null;
        points_awarded: number | null;
      } | null;
    }>) {
      const uid = String(row.user_id);
      if (!row.achievements) continue;
      const list = achievementsByUser.get(uid) ?? [];
      if (list.length >= achievementsLimit) continue;
      list.push({
        id: String(row.achievements.id),
        name: String(row.achievements.name ?? "Achievement"),
        points_awarded: Number(row.achievements.points_awarded) || 0,
        awarded_at: String(row.awarded_at),
        image_url: row.achievements.image_url ?? null,
      });
      achievementsByUser.set(uid, list);
    }
  }

  const pointsLogByUser = new Map<string, FoundryPlayerProfile["recent_points"]>();
  if (pointsLogLimit > 0 && userIds.length > 0) {
    await Promise.all(
      userIds.map(async (userId) => {
        const { data: logRows } = await (supabase as any)
          .from("points_log")
          .select("amount, reason, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(pointsLogLimit);

        pointsLogByUser.set(
          userId,
          ((logRows ?? []) as Array<{
            amount: number | null;
            reason: string | null;
            created_at: string;
          }>).map((entry) => ({
            amount: Number(entry.amount) || 0,
            reason: String(entry.reason ?? ""),
            created_at: String(entry.created_at),
          })),
        );
      }),
    );
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "");

  const players: FoundryPlayerProfile[] = mappings.map((mapping) => {
    const actorId = String(mapping.foundry_actor_id);
    const characterId = mapping.character_id ? String(mapping.character_id) : null;
    const character = characterId ? characterById.get(characterId) : null;
    const userId = character?.user_id ?? null;
    const user = userId ? userById.get(userId) : null;

    if (!characterId || !userId || !user) {
      return {
        foundry_actor_id: actorId,
        character_id: characterId,
        character_name: character?.name ?? null,
        user_id: userId,
        username: user?.username ?? null,
        mapped: false,
        points: null,
        achievements: [],
        recent_points: [],
      };
    }

    const lifetime = user.lifetime_points;
    const level = calculateLevel(lifetime);

    return {
      foundry_actor_id: actorId,
      character_id: characterId,
      character_name: character?.name ?? null,
      user_id: userId,
      username: user.username,
      mapped: true,
      points: {
        total: user.total_points,
        lifetime,
        rank_label: getRankFromPoints(lifetime),
        level,
        next_level_at: getPointsForNextLevel(level),
      },
      achievements: achievementsByUser.get(userId) ?? [],
      recent_points: pointsLogByUser.get(userId) ?? [],
    };
  });

  return {
    ok: true,
    endpoint: "foundry-profile",
    campaign_id: campaignId,
    campaign_name:
      (campaignRaw as { name?: string | null } | null)?.name != null
        ? String((campaignRaw as { name: string }).name)
        : null,
    dashboard_url: `${siteUrl}/dashboard/points`,
    points_catalog_url: `${siteUrl}/dashboard/points/catalog`,
    players,
  };
}
