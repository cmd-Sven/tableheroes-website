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

function apiHeaders(includeJson = true) {
  const { apiKey } = getModuleSettings();
  const headers = { "x-tableheroes-api-key": apiKey };
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
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
    headers: { "x-tableheroes-api-key": apiKey },
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

/**
 * @param {Actor} actor
 * @param {"foundry_to_th" | "th_to_foundry"} direction
 */
export async function syncActorWealth(actor, direction) {
  const { baseUrl } = getModuleSettings();
  if (!baseUrl) throw new Error("Table Heroes API ist nicht konfiguriert.");

  const currency = readFoundryCurrency(actor);
  const body =
    direction === "foundry_to_th"
      ? { foundry_actor_id: actor.id, direction, currency }
      : { foundry_actor_id: actor.id, direction };

  const response = await fetch(`${baseUrl}/api/v1/foundry-sync/wealth`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }

  if (direction === "th_to_foundry" && data.currency) {
    await applyFoundryCurrency(actor, data.currency);
  }

  return data;
}

/**
 * @param {Actor} actor
 * @param {"foundry_to_th" | "th_to_foundry"} direction
 */
export async function syncActorPortrait(actor, direction) {
  const { baseUrl } = getModuleSettings();
  if (!baseUrl) throw new Error("Table Heroes API ist nicht konfiguriert.");

  if (direction === "th_to_foundry") {
    const response = await fetch(`${baseUrl}/api/v1/foundry-sync/portrait`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ foundry_actor_id: actor.id, direction }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }
    if (data.portrait?.url) {
      await actor.update({ img: data.portrait.url });
    }
    return data;
  }

  const img = actor.img;
  if (!img) throw new Error("Foundry-Actor hat kein Portrait.");

  const imageResponse = await fetch(img);
  if (!imageResponse.ok) {
    throw new Error("Foundry-Portrait konnte nicht gelesen werden.");
  }

  const blob = await imageResponse.blob();
  const form = new FormData();
  form.append("foundry_actor_id", actor.id);
  form.append("portrait", blob, "portrait.webp");

  const response = await fetch(`${baseUrl}/api/v1/foundry-sync/portrait`, {
    method: "POST",
    headers: { "x-tableheroes-api-key": getModuleSettings().apiKey },
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * @param {Actor} actor
 */
export async function syncActorXp(actor) {
  const { baseUrl } = getModuleSettings();
  if (!baseUrl) throw new Error("Table Heroes API ist nicht konfiguriert.");

  const details = actor.system?.details ?? {};
  const cls =
    typeof details.class === "string"
      ? details.class
      : details.class?.name ?? actor.system?.details?.class?.value ?? "Unbekannt";
  const level = Number(details.level ?? actor.system?.details?.level?.value ?? 0);
  const xp = Number(actor.system?.details?.xp?.value ?? actor.system?.details?.xp ?? 0);

  const response = await fetch(`${baseUrl}/api/v1/foundry-sync`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({
      foundry_actor_id: actor.id,
      class: String(cls),
      level: Math.max(0, Math.floor(level)),
      experience_points: Math.max(0, Math.floor(xp)),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  if (response.status === 202) {
    throw new Error(data.message || "Actor ist noch nicht zugeordnet.");
  }
  return data;
}

/**
 * @param {Actor} actor
 */
export function readFoundryCurrency(actor) {
  const c = actor.system?.currency ?? {};
  return {
    gp: Math.max(0, Math.floor(Number(c.gp) || 0)),
    sp: Math.max(0, Math.floor(Number(c.sp) || 0)),
    cp: Math.max(0, Math.floor(Number(c.cp) || 0)),
    ep: Math.max(0, Math.floor(Number(c.ep) || 0)),
    pp: Math.max(0, Math.floor(Number(c.pp) || 0)),
  };
}

/**
 * @param {Actor} actor
 * @param {{ gp: number, sp: number, cp: number, ep: number, pp: number }} currency
 */
export async function applyFoundryCurrency(actor, currency) {
  const next = {
    gp: Math.max(0, Math.floor(Number(currency.gp) || 0)),
    sp: Math.max(0, Math.floor(Number(currency.sp) || 0)),
    cp: Math.max(0, Math.floor(Number(currency.cp) || 0)),
    ep: Math.max(0, Math.floor(Number(currency.ep) || 0)),
    pp: Math.max(0, Math.floor(Number(currency.pp) || 0)),
  };
  await actor.update({ "system.currency": next });
}
