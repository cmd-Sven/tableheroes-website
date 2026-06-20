const MODULE_ID = "tableheroes-bridge";

export function getModuleSettings() {
  const baseUrl = String(game.settings.get(MODULE_ID, "apiBaseUrl") ?? "").replace(/\/$/, "");
  const apiKey = String(game.settings.get(MODULE_ID, "apiKey") ?? "").trim();
  const refreshMinutes = Number(game.settings.get(MODULE_ID, "refreshMinutes") ?? 5);
  return {
    baseUrl,
    apiKey,
    refreshMinutes: Number.isFinite(refreshMinutes) ? Math.max(1, refreshMinutes) : 5,
  };
}

export function settingsConfigured() {
  const { baseUrl, apiKey } = getModuleSettings();
  return Boolean(baseUrl && apiKey);
}

/**
 * @param {string} foundryActorId
 * @returns {Promise<object>}
 */
export async function fetchActorProfile(foundryActorId) {
  const { baseUrl, apiKey } = getModuleSettings();
  if (!baseUrl || !apiKey) {
    throw new Error("Table Heroes API ist nicht konfiguriert.");
  }

  const url = new URL(`${baseUrl}/api/v1/foundry-sync/profile`);
  url.searchParams.set("foundry_actor_id", foundryActorId);
  url.searchParams.set("achievements_limit", "8");
  url.searchParams.set("points_log_limit", "5");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-tableheroes-api-key": apiKey,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  const player = Array.isArray(data.players) ? data.players[0] : null;
  return {
    campaign: {
      id: data.campaign_id,
      name: data.campaign_name,
      dashboard_url: data.dashboard_url,
      points_catalog_url: data.points_catalog_url,
    },
    player,
  };
}
