"use client";

import {
  STREETS_VISIBLE_GM_KEY,
  STREETS_VISIBLE_PLAYER_KEY,
} from "./aurenfurt-streets";
import {
  WEATHER_FX_STORAGE_KEY,
  defaultWeatherFxPreference,
  parseStoredWeatherFx,
  type WeatherFxPreference,
} from "./aurenfurt-weather-fx";
import {
  browserDb,
  dbMessage,
  readLocal,
  rememberOnce,
  share,
  type CityMapLoad,
} from "./aurenfurt-city-map-db-shared";

const prefsLoads = new Map<string, Promise<CityMapLoad<ViewerPrefs>>>();

export type ViewerPrefs = {
  streetsVisible: boolean;
  buildingsVisible: boolean;
  poisVisible: boolean;
  wallsVisible: boolean;
  weather: WeatherFxPreference;
};

function defaultViewerPrefs(): ViewerPrefs {
  return {
    streetsVisible: true,
    buildingsVisible: true,
    poisVisible: true,
    wallsVisible: true,
    weather: defaultWeatherFxPreference(),
  };
}

const VIEWER_LOCAL_KEYS = [STREETS_VISIBLE_GM_KEY, STREETS_VISIBLE_PLAYER_KEY, WEATHER_FX_STORAGE_KEY];

function readImportedVisibility(isGm: boolean): boolean | null {
  const preferred = readLocal(isGm ? STREETS_VISIBLE_GM_KEY : STREETS_VISIBLE_PLAYER_KEY);
  const fallback = readLocal(isGm ? STREETS_VISIBLE_PLAYER_KEY : STREETS_VISIBLE_GM_KEY);
  const raw = preferred ?? fallback;
  if (raw == null) return null;
  return raw !== "0" && raw !== "false";
}

async function currentUserId(): Promise<string | { error: string }> {
  const { data, error } = await browserDb().auth.getUser();
  if (error) return { error: dbMessage(error) ?? "Anmeldung konnte nicht gelesen werden." };
  if (!data.user) return { error: "Für die Stadtkarte ist eine Anmeldung nötig." };
  return data.user.id;
}

export function loadCityMapViewerPrefs(worldId: string, isGm: boolean) {
  return share(prefsLoads, `${worldId}:${isGm ? "gm" : "view"}`, async () => {
    const userId = await currentUserId();
    if (typeof userId !== "string") {
      return {
        data: defaultViewerPrefs(),
        error: userId.error,
        saved: false,
      };
    }
    const { data, error } = await browserDb()
      .from("city_map_viewer_prefs")
      .select(
        "streets_visible, buildings_visible, pois_visible, walls_visible, weather_enabled, weather_mode",
      )
      .eq("world_id", worldId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return {
        data: defaultViewerPrefs(),
        error: dbMessage(error),
        saved: false,
      };
    }
    if (data) {
      rememberOnce(VIEWER_LOCAL_KEYS);
      return {
        data: {
          streetsVisible: data.streets_visible,
          buildingsVisible: data.buildings_visible,
          poisVisible: data.pois_visible,
          wallsVisible: data.walls_visible,
          weather: {
            enabled: data.weather_enabled,
            mode: data.weather_mode as WeatherFxPreference["mode"],
          },
        },
        error: null,
        saved: true,
      };
    }
    const weather = parseStoredWeatherFx(readLocal(WEATHER_FX_STORAGE_KEY));
    const streetsVisible = readImportedVisibility(isGm);
    const hasLocal =
      readLocal(WEATHER_FX_STORAGE_KEY) != null ||
      readLocal(STREETS_VISIBLE_GM_KEY) != null ||
      readLocal(STREETS_VISIBLE_PLAYER_KEY) != null;
    const prefs: ViewerPrefs = {
      ...defaultViewerPrefs(),
      streetsVisible: streetsVisible ?? true,
      weather: weather ?? defaultWeatherFxPreference(),
    };
    if (!hasLocal) {
      return { data: prefs, error: null, saved: false };
    }
    const saveError = await writeViewerPrefs(worldId, userId, prefs);
    if (saveError) {
      return {
        data: prefs,
        error: `Die Kartenansicht konnte nicht in die Datenbank übernommen werden: ${saveError}`,
        saved: false,
      };
    }
    rememberOnce(VIEWER_LOCAL_KEYS);
    return { data: prefs, error: null, saved: true };
  });
}

type ViewerFlagColumn = "streets_visible" | "buildings_visible" | "pois_visible" | "walls_visible";

async function upsertViewerPatch(
  worldId: string,
  patch: {
    streets_visible?: boolean;
    buildings_visible?: boolean;
    pois_visible?: boolean;
    walls_visible?: boolean;
    weather_enabled?: boolean;
    weather_mode?: string;
  },
): Promise<string | null> {
  const userId = await currentUserId();
  if (typeof userId !== "string") return userId.error;
  const { error } = await browserDb()
    .from("city_map_viewer_prefs")
    .upsert(
      {
        world_id: worldId,
        user_id: userId,
        ...patch,
      },
      { onConflict: "world_id,user_id" },
    );
  return dbMessage(error);
}

async function writeViewerPrefs(worldId: string, userId: string, prefs: ViewerPrefs): Promise<string | null> {
  const { error } = await browserDb().from("city_map_viewer_prefs").upsert(
    {
      world_id: worldId,
      user_id: userId,
      streets_visible: prefs.streetsVisible,
      buildings_visible: prefs.buildingsVisible,
      pois_visible: prefs.poisVisible,
      walls_visible: prefs.wallsVisible,
      weather_enabled: prefs.weather.enabled,
      weather_mode: prefs.weather.mode,
    },
    { onConflict: "world_id,user_id" },
  );
  return dbMessage(error);
}

export async function saveCityMapViewerFlag(
  worldId: string,
  column: ViewerFlagColumn,
  visible: boolean,
): Promise<string | null> {
  if (column === "streets_visible") return upsertViewerPatch(worldId, { streets_visible: visible });
  if (column === "buildings_visible") return upsertViewerPatch(worldId, { buildings_visible: visible });
  if (column === "pois_visible") return upsertViewerPatch(worldId, { pois_visible: visible });
  return upsertViewerPatch(worldId, { walls_visible: visible });
}

export async function saveCityMapStreetsVisible(worldId: string, streetsVisible: boolean): Promise<string | null> {
  return saveCityMapViewerFlag(worldId, "streets_visible", streetsVisible);
}

export async function saveCityMapWeather(worldId: string, weather: WeatherFxPreference): Promise<string | null> {
  return upsertViewerPatch(worldId, {
    weather_enabled: weather.enabled,
    weather_mode: weather.mode,
  });
}
