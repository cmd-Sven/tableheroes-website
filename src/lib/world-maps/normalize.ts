import { parseGridConfig } from "@/src/lib/session/battlemap-grid";
import {
  isWorldMapIconKey,
  type WorldMap,
  type WorldMapMarker,
  type WorldMapMarkerNote,
  type WorldMapIconKey,
} from "./types";

export function normalizeWorldMap(row: Record<string, unknown>): WorldMap {
  return {
    id: String(row.id),
    world_id: String(row.world_id),
    title: String(row.title ?? "Weltkarte"),
    image_url: String(row.image_url ?? ""),
    image_storage_path:
      row.image_storage_path != null ? String(row.image_storage_path) : null,
    grid_config: parseGridConfig(row.grid_config),
    sort_order: Number(row.sort_order ?? 0),
    group_token_grid_x:
      row.group_token_grid_x != null && Number.isFinite(Number(row.group_token_grid_x))
        ? Number(row.group_token_grid_x)
        : null,
    group_token_grid_y:
      row.group_token_grid_y != null && Number.isFinite(Number(row.group_token_grid_y))
        ? Number(row.group_token_grid_y)
        : null,
    group_token_visible: row.group_token_visible !== false,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export function normalizeWorldMapMarker(row: Record<string, unknown>): WorldMapMarker {
  const iconRaw = row.icon != null ? String(row.icon) : "marker";
  const icon: WorldMapIconKey = isWorldMapIconKey(iconRaw) ? iconRaw : "marker";
  return {
    id: String(row.id),
    world_map_id: String(row.world_map_id),
    icon,
    name: String(row.name ?? "Markierung"),
    description: row.description != null ? String(row.description) : null,
    grid_x: Number(row.grid_x ?? 0),
    grid_y: Number(row.grid_y ?? 0),
    is_visible_to_players: row.is_visible_to_players === true,
    lore_id: row.lore_id != null ? String(row.lore_id) : null,
    npc_id: row.npc_id != null ? String(row.npc_id) : null,
    faction_id: row.faction_id != null ? String(row.faction_id) : null,
    creature_id: row.creature_id != null ? String(row.creature_id) : null,
    quest_id: row.quest_id != null ? String(row.quest_id) : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

export function normalizeWorldMapMarkerNote(
  row: Record<string, unknown>,
): WorldMapMarkerNote {
  return {
    id: String(row.id),
    marker_id: String(row.marker_id),
    body: String(row.body ?? ""),
    author_user_id: String(row.author_user_id),
    author_display_name:
      row.author_display_name != null ? String(row.author_display_name) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  };
}

/** Entity-Links für Modal/Tooltip — öffnen in neuem Tab. */
export function buildMarkerEntityLinks(
  marker: WorldMapMarker,
  ctx: { worldId: string; campaignId?: string | null },
): Array<{ type: string; id: string; label: string; href: string }> {
  const links: Array<{ type: string; id: string; label: string; href: string }> = [];
  const campaignId = ctx.campaignId;

  if (marker.lore_id) {
    links.push({
      type: "lore",
      id: marker.lore_id,
      label: "Lore",
      href: campaignId
        ? `/dashboard/campaigns/${campaignId}/lore/${marker.lore_id}`
        : `/dashboard/worlds/${ctx.worldId}/lore/${marker.lore_id}`,
    });
  }
  if (marker.npc_id) {
    links.push({
      type: "npc",
      id: marker.npc_id,
      label: "NPC",
      href: campaignId
        ? `/dashboard/campaigns/${campaignId}/npcs/${marker.npc_id}`
        : `/dashboard/worlds/${ctx.worldId}/npcs/${marker.npc_id}`,
    });
  }
  if (marker.faction_id) {
    links.push({
      type: "faction",
      id: marker.faction_id,
      label: "Fraktion",
      href: campaignId
        ? `/dashboard/campaigns/${campaignId}/factions/${marker.faction_id}`
        : `/dashboard/worlds/${ctx.worldId}/factions/${marker.faction_id}`,
    });
  }
  if (marker.creature_id) {
    links.push({
      type: "creature",
      id: marker.creature_id,
      label: "Bestarium",
      href: campaignId
        ? `/dashboard/campaigns/${campaignId}/bestarium/${marker.creature_id}`
        : `/dashboard/worlds/${ctx.worldId}/bestarium/${marker.creature_id}`,
    });
  }
  if (marker.quest_id && campaignId) {
    links.push({
      type: "quest",
      id: marker.quest_id,
      label: "Quest",
      href: `/dashboard/campaigns/${campaignId}/quests/${marker.quest_id}`,
    });
  }
  return links;
}
