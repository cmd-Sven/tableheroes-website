import { createAdminClient } from "@/src/lib/supabase/server";
import {
  foundryJson,
  foundryOptions,
  getFoundryApiKey,
  resolveFoundryApiCampaign,
} from "@/src/lib/foundry-sync/foundry-api";
import { loadFoundryCampaignProfiles } from "@/src/lib/foundry-sync/load-foundry-campaign-profiles";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[foundry-profile]";

export async function OPTIONS() {
  return foundryOptions();
}

/**
 * Spieler-Profile für Foundry VTT (Punkte, Rang, Achievements, letzte Buchungen).
 *
 * Query:
 * - foundry_actor_id (optional) — nur ein Actor
 * - achievements_limit (optional, default 8, max 20)
 * - points_log_limit (optional, default 5, max 10)
 */
export async function GET(request: Request) {
  const apiKey = getFoundryApiKey(request);
  if (!apiKey) {
    return foundryJson(
      { error: "Missing API key header: x-tableheroes-api-key" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const foundryActorId = url.searchParams.get("foundry_actor_id");
  const achievementsLimit = Number(url.searchParams.get("achievements_limit") ?? "8");
  const pointsLogLimit = Number(url.searchParams.get("points_log_limit") ?? "5");

  try {
    const supabase = createAdminClient();
    const auth = await resolveFoundryApiCampaign(supabase, apiKey);
    if (!auth.ok) {
      return foundryJson({ error: auth.error }, { status: auth.status });
    }

    const payload = await loadFoundryCampaignProfiles(supabase, auth.campaignId, {
      foundryActorId,
      achievementsLimit: Number.isFinite(achievementsLimit) ? achievementsLimit : 8,
      pointsLogLimit: Number.isFinite(pointsLogLimit) ? pointsLogLimit : 5,
    });

    return foundryJson(payload);
  } catch (e: unknown) {
    console.error(`${LOG_PREFIX} load failed`, e);
    return foundryJson(
      {
        error: e instanceof Error ? e.message : "Profile load failed.",
      },
      { status: 500 },
    );
  }
}
