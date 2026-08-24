/**
 * useLiveSessionLocation — Location changes, stage clear on travel, and background reset.
 */
"use client";

import type { MutableRefObject } from "react";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import type { LiveState, LoreLocationOption } from "./live-session-types";

type Params = {
  liveState: LiveState | null;
  liveStateRef: MutableRefObject<LiveState | null>;
  loreLocationOptions: LoreLocationOption[];
  allSceneMedia: StageSceneMediaItem[];
  updateLiveState: (patch: Partial<LiveState>, baseOverride?: LiveState) => void;
  writeSystemLog: (type: string, text: string) => void;
};

export function useLiveSessionLocation({
  liveState,
  liveStateRef,
  loreLocationOptions,
  allSceneMedia,
  updateLiveState,
  writeSystemLog,
}: Params) {
  function getLocationBackground(option: LoreLocationOption | undefined) {
    return option?.default_image_url || option?.image_url || null;
  }

  function clearStageOnLocationChange(base: LiveState): Partial<LiveState> | null {
    const hadNpcs = (base.visible_npc_ids || []).length > 0;
    const hadFactions = (base.visible_faction_ids || []).length > 0;
    const hadScene = !!base.active_scene_media_id;
    if (!hadNpcs && !hadFactions && !hadScene) return null;

    if (hadScene) {
      const scene = allSceneMedia.find(
        (entry) => String(entry.id) === String(base.active_scene_media_id),
      );
      writeSystemLog(
        "scene_remove",
        `Die Szene „${scene?.title ?? "Unbekannt"}“ verlässt die Bühne – der Ort wechselt.`,
      );
    }
    if (hadNpcs || hadFactions) {
      writeSystemLog(
        "stage_clear",
        "NSCs und Fraktionen verlassen die Bühne – ein neuer Ort beginnt.",
      );
    }

    return {
      visible_npc_ids: [],
      visible_faction_ids: [],
      active_scene_media_id: null,
    };
  }

  function changeSessionLocation(locationId: string) {
    const base = liveStateRef.current;
    if (!base) return;

    const nextLocationId = locationId || null;
    const currentLocationId = base.current_location_lore_id ?? null;
    const locationChanged =
      String(nextLocationId ?? "") !== String(currentLocationId ?? "");

    if (!locationId) {
      const stagePatch = locationChanged ? clearStageOnLocationChange(base) : null;
      updateLiveState({
        current_location_lore_id: null,
        ...(stagePatch ?? {}),
      });
      return;
    }

    const option = loreLocationOptions.find((entry) => entry.id === locationId);
    const locationName = option?.name ?? liveState?.current_location ?? "Unbekannter Ort";
    const autoBackground = getLocationBackground(option);
    const manualOverride = liveStateRef.current?.is_background_manual_override === true;
    const patch: Partial<LiveState> = {
      current_location_lore_id: locationId,
      current_location: locationName,
    };

    if (!manualOverride && autoBackground) {
      patch.background_url = autoBackground;
    }

    if (locationChanged) {
      const stagePatch = clearStageOnLocationChange(base);
      if (stagePatch) Object.assign(patch, stagePatch);
    }

    updateLiveState(patch);
    writeSystemLog(
      "location_change",
      !manualOverride && autoBackground
        ? `Die Umgebung verändert sich und ${locationName} breitet sich vor euch aus.`
        : `Die Gruppe erreicht: ${locationName}.`,
    );
  }

  function resetBackgroundToLocationDefault() {
    const locationId = liveStateRef.current?.current_location_lore_id;
    const option = loreLocationOptions.find((entry) => entry.id === locationId);
    const autoBackground = getLocationBackground(option);
    updateLiveState({
      is_background_manual_override: false,
      background_url: autoBackground,
    });
    writeSystemLog(
      "background_reset",
      option?.name
        ? `Die Umgebung verändert sich und ${option.name} breitet sich vor euch aus.`
        : "Der Bühnenhintergrund folgt wieder dem Orts-Standard.",
    );
  }

  return {
    getLocationBackground,
    clearStageOnLocationChange,
    changeSessionLocation,
    resetBackgroundToLocationDefault,
  };
}
