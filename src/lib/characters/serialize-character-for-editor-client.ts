import { serializeForClient } from "@/src/lib/serialize-for-flight";

const DROP_KEYS = new Set([
  "modification_log",
  "__proto__",
  "constructor",
]);

/** Nur diese Keys dürfen in die Flight-Payload — verhindert Abstürze durch unbekannte / exotische DB-Spalten. */
const ALLOWED_EDITOR_KEYS = new Set([
  "id",
  "name",
  "class",
  "race",
  "level",
  "status",
  "biography",
  "avatar_url",
  "avatar_storage_path",
  "avatar_display",
  "token_url",
  "token_storage_path",
  "condition_tokens",
  "alignment",
  "sheet_synced_at",
  "bio_family",
  "bio_occupation",
  "bio_appearance",
  "character_flaws",
  "culture_lore_id",
  "languages",
  "faction_membership",
  "current_location_id",
  "character_relationships",
  "experience_points",
  "pocket_gold",
  /** Anzeige-Namen (Joins aus campaign-detail-load, nicht in GM-Select) */
  "culture_name",
  "faction_name",
  "location_name",
  "language_names",
]);

/**
 * Bereitet eine Charakterzeile aus Supabase für RSC → Client (GM-/Spieler-Editor) auf:
 * entfernt schwere / riskante Felder, normalisiert Beziehungen und JSONB-artige Werte,
 * danach Flight-sichere Serialisierung.
 */
export function serializeCharacterForEditorClient(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(raw)) {
    if (DROP_KEYS.has(key)) continue;
    if (!ALLOWED_EDITOR_KEYS.has(key)) continue;
    out[key] = val;
  }

  if (!Array.isArray(out.character_relationships)) {
    out.character_relationships = [];
  }

  out.character_relationships = (out.character_relationships as unknown[])
    .filter((rel) => rel != null && typeof rel === "object")
    .map((rel) => {
        const r = rel as Record<string, unknown>;
        const npcs = r.npcs;
        let npcOut: Record<string, unknown> | null = null;
        if (npcs != null && typeof npcs === "object") {
          const n = npcs as Record<string, unknown>;
          npcOut = {
            id: String(n.id ?? ""),
            name: String(n.name ?? ""),
            role: n.role != null ? String(n.role) : null,
            title: n.title != null ? String(n.title) : null,
          };
        }
        return {
          id: r.id != null ? String(r.id) : "",
          relationship_type: String(r.relationship_type ?? ""),
          description: r.description != null ? String(r.description) : null,
          npcs: npcOut,
        };
      });

  if (out.languages == null) {
    out.languages = [];
  } else if (!Array.isArray(out.languages)) {
    out.languages = [];
  } else {
    out.languages = (out.languages as unknown[]).map((x) => String(x));
  }

  if (out.language_names == null) {
    out.language_names = [];
  } else if (!Array.isArray(out.language_names)) {
    out.language_names = [];
  } else {
    out.language_names = (out.language_names as unknown[]).map((x) => String(x));
  }
  if (out.culture_name != null) out.culture_name = String(out.culture_name);
  if (out.faction_name != null) out.faction_name = String(out.faction_name);
  if (out.location_name != null) out.location_name = String(out.location_name);

  if (out.name != null) out.name = String(out.name);
  if (out.class != null) out.class = String(out.class);
  if (out.race != null) out.race = String(out.race);
  if (out.level != null) {
    const lv = Math.round(Number(out.level));
    out.level = Number.isFinite(lv) ? Math.max(1, lv) : 1;
  } else {
    out.level = 1;
  }
  if (out.biography != null) out.biography = String(out.biography);
  if (out.avatar_url != null) out.avatar_url = String(out.avatar_url);
  if (out.avatar_storage_path != null) {
    out.avatar_storage_path = String(out.avatar_storage_path);
  }
  if (out.token_url != null) out.token_url = String(out.token_url);
  if (out.token_storage_path != null) {
    out.token_storage_path = String(out.token_storage_path);
  }
  if (out.status != null) out.status = String(out.status);
  if (out.culture_lore_id != null) out.culture_lore_id = String(out.culture_lore_id);
  if (out.faction_membership != null) {
    out.faction_membership = String(out.faction_membership);
  }
  if (out.current_location_id != null) {
    out.current_location_id = String(out.current_location_id);
  }

  const xp = Number(out.experience_points);
  out.experience_points = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const pg = Number(out.pocket_gold);
  out.pocket_gold = Number.isFinite(pg) ? Math.max(0, Math.floor(pg)) : 0;

  if (out.avatar_display != null && typeof out.avatar_display === "string") {
    try {
      out.avatar_display = JSON.parse(out.avatar_display) as unknown;
    } catch {
      out.avatar_display = null;
    }
  }

  for (const k of Object.keys(out)) {
    if (!ALLOWED_EDITOR_KEYS.has(k)) delete out[k];
  }

  return serializeForClient(out) as Record<string, unknown>;
}
