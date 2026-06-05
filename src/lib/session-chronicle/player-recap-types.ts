import type { PlayerRecapPayload } from "./types";

export type PlayerRecapStatus = "draft" | "published";

/** Gespeichert in session_archives.player_recap (JSONB). */
export type PlayerRecapRecord = {
  status: PlayerRecapStatus;
  published_at?: string | null;
  recap: PlayerRecapPayload;
};

export function emptyPlayerRecapPayload(): PlayerRecapPayload {
  return {
    summary_md: "",
    sections: {
      npcs: [],
      locations: [],
      factions: [],
      quests_new: [],
      quests_completed: [],
      combat_outcomes: [],
      loot: [],
      decisions: [],
    },
    link_entities: [],
    generated_at: new Date().toISOString(),
  };
}
