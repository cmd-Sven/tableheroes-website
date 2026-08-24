/**
 * loot-actions — part 2: resolveLootItemIdentify, gmRemoveLootItemFromStage, openLootChestOnStage, gmClearLootGoldFromStage, listCampaignShopItemsForLootDraft, CampaignShopLootPickRow.
 */
"use server";

import { addCharacterWealthGpSp } from "@/src/lib/character-gold";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { createSystemLog } from "@/src/lib/actions/session-system-log-actions";
import {
  autoPackItemToContainer,
  buildLootCharacterItemInsert,
  inferLootInventoryCategory,
  normalizeLootInventoryCategory,
} from "@/src/lib/characters/dnd5e/loot-to-inventory";
import { normalizeEquipmentState } from "@/src/lib/characters/dnd5e/equipment";
import { parseSheetData } from "@/src/lib/characters/dnd5e/defaults";
import { saveCharacterEquipment } from "@/src/lib/actions/character-inventory-actions";
import type { CharacterItem } from "@/src/types/inventory";
import type { Json } from "@/src/lib/database.types";
import {
  disguisedLootTitle,
  lootItemToJson,
  LOOT_UNIDENTIFIED_DESC_FALLBACK,
  LOOT_UNIDENTIFIED_NAME_FALLBACK,
  parseIdentifyRequests,
  parseLootItemRow,
  type LootDraftPayload,
  type LootIdentifyRequestRow,
  type LootItemRow,
} from "@/src/lib/loot/loot-item-model";

export type { LootDraftPayload, LootIdentifyRequestRow, LootItemRow } from "@/src/lib/loot/loot-item-model";

async function loadSessionCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<{ campaignId: string } | null> {
  const { data: s, error } = await supabase
    .from("sessions")
    .select("campaign_id")
    .eq("id", sessionId)
    .single();
  if (error || !s) return null;
  return { campaignId: String((s as { campaign_id: string }).campaign_id) };
}

async function assertLiveLootMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  containerId: string,
): Promise<boolean> {
  const { data: live } = await (supabase as any)
    .from("session_live_states")
    .select("current_loot_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  const cur = (live as { current_loot_id?: string | null } | null)?.current_loot_id;
  return cur != null && String(cur) === String(containerId);
}

export async function resolveLootItemIdentify(
  sessionId: string,
  campaignId: string,
  containerId: string,
  requestId: string,
  success: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: camp } = await supabase.from("campaigns").select("id, gm_id, owner_id").eq("id", campaignId).single();
    if (!camp || !isCampaignGm(camp as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return { ok: false, error: "Nur der Spielleiter kann Identifikationen beantworten." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== campaignId) {
      return { ok: false, error: "Session passt nicht zur Kampagne." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const rid = String(requestId).trim();
    if (!rid) return { ok: false, error: "Ungültige Anfrage." };

    const { data: box, error: boxErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, campaign_id, items_json, identify_requests")
      .eq("id", containerId)
      .single();

    if (boxErr || !box) return { ok: false, error: "Beute nicht gefunden." };
    const b = box as { campaign_id: string; items_json: unknown; identify_requests?: unknown };
    if (b.campaign_id !== campaignId) return { ok: false, error: "Beute gehört nicht zu dieser Kampagne." };

    const pending = parseIdentifyRequests(b.identify_requests);
    const req = pending.find((r) => r.id === rid);
    if (!req) return { ok: false, error: "Anfrage nicht mehr vorhanden." };

    const nextPending = pending.filter((r) => r.id !== rid);

    const items = Array.isArray(b.items_json)
      ? (b.items_json as unknown[]).map(parseLootItemRow).filter((x): x is LootItemRow => x != null)
      : [];
    const idx = items.findIndex((it) => it.id === req.item_id);
    if (idx < 0) {
      const { error: upOnly } = await (supabase as any)
        .from("campaign_loot_containers")
        .update({ identify_requests: nextPending as unknown as Json })
        .eq("id", containerId);
      if (upOnly) return { ok: false, error: upOnly.message ?? "Update fehlgeschlagen." };
      return { ok: true };
    }

    if (success) {
      items[idx] = { ...items[idx], identified: true };
    }

    const { error: upErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .update({
        items_json: items.map(lootItemToJson) as unknown as Json,
        identify_requests: nextPending as unknown as Json,
      })
      .eq("id", containerId);

    if (upErr) return { ok: false, error: upErr.message ?? "Konnte nicht speichern." };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function gmRemoveLootItemFromStage(
  sessionId: string,
  campaignId: string,
  containerId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: camp } = await supabase.from("campaigns").select("id, gm_id, owner_id").eq("id", campaignId).single();
    if (!camp || !isCampaignGm(camp as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return { ok: false, error: "Nur der Spielleiter kann Gegenstände von der Bühne nehmen." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== campaignId) {
      return { ok: false, error: "Session passt nicht zur Kampagne." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const id = String(itemId).trim();
    const { data: box, error: boxErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, campaign_id, items_json, identify_requests")
      .eq("id", containerId)
      .single();

    if (boxErr || !box) return { ok: false, error: "Beute nicht gefunden." };
    const b = box as { campaign_id: string; items_json: unknown; identify_requests?: unknown };
    if (b.campaign_id !== campaignId) return { ok: false, error: "Beute gehört nicht zu dieser Kampagne." };

    const items = Array.isArray(b.items_json)
      ? (b.items_json as unknown[]).map(parseLootItemRow).filter((x): x is LootItemRow => x != null)
      : [];
    const nextItems = items.filter((it) => it.id !== id);
    if (nextItems.length === items.length) {
      return { ok: false, error: "Item nicht gefunden." };
    }

    const nextRequests = parseIdentifyRequests(b.identify_requests).filter((r) => r.item_id !== id);

    const { error: upErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .update({
        items_json: nextItems.map(lootItemToJson) as unknown as Json,
        identify_requests: nextRequests as unknown as Json,
      })
      .eq("id", containerId);

    if (upErr) return { ok: false, error: upErr.message ?? "Konnte nicht entfernen." };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function openLootChestOnStage(
  sessionId: string,
  campaignId: string,
  containerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: camp } = await supabase.from("campaigns").select("id, gm_id, owner_id").eq("id", campaignId).single();
    if (!camp || !isCampaignGm(camp as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return { ok: false, error: "Nur der Spielleiter kann die Truhe öffnen." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== campaignId) {
      return { ok: false, error: "Session passt nicht zur Kampagne." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const { error: boxErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .update({ chest_opened: true })
      .eq("id", containerId);

    if (boxErr) return { ok: false, error: boxErr.message ?? "Truhe konnte nicht geöffnet werden." };

    const { error: liveErr } = await (supabase as any)
      .from("session_live_states")
      .update({ loot_hide_npcs: false })
      .eq("session_id", sessionId);

    if (liveErr) return { ok: false, error: liveErr.message ?? "Bühnen-Status konnte nicht aktualisiert werden." };

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function gmClearLootGoldFromStage(
  sessionId: string,
  campaignId: string,
  containerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: camp } = await supabase.from("campaigns").select("id, gm_id, owner_id").eq("id", campaignId).single();
    if (!camp || !isCampaignGm(camp as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return { ok: false, error: "Nur der Spielleiter kann Gold von der Bühne nehmen." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== campaignId) {
      return { ok: false, error: "Session passt nicht zur Kampagne." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const { error: upErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .update({ gp_remaining: 0, sp_remaining: 0 })
      .eq("id", containerId);

    if (upErr) return { ok: false, error: upErr.message ?? "Gold konnte nicht geleert werden." };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export type CampaignShopLootPickRow = {
  id: string;
  name: string;
  description: string | null;
  base_price_gp: number;
  is_magical: boolean;
  rarity: string;
  item_type: string;
};

/** Alle Shop-Items der Kampagne (über Shops) — Auswahl für manuelle Truhen-Beute. */
export async function listCampaignShopItemsForLootDraft(
  campaignId: string,
): Promise<{ ok: true; items: CampaignShopLootPickRow[] } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: camp } = await supabase.from("campaigns").select("id, gm_id, owner_id").eq("id", campaignId).single();
    if (!camp || !isCampaignGm(camp as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return { ok: false, error: "Nur der Spielleiter kann den Katalog laden." };
    }

    const { data: shops, error: shopsErr } = await supabase.from("campaign_shops").select("id").eq("campaign_id", campaignId);
    if (shopsErr) return { ok: false, error: shopsErr.message ?? "Shops konnten nicht geladen werden." };

    const shopIds = ((shops ?? []) as { id: string }[]).map((s) => String(s.id)).filter(Boolean);
    if (shopIds.length === 0) return { ok: true, items: [] };

    const { data: rows, error: itemsErr } = await supabase
      .from("campaign_shop_items")
      .select("id, name, description, base_price_gp, is_magical, rarity, item_type")
      .in("shop_id", shopIds)
      .order("name", { ascending: true });

    if (itemsErr) return { ok: false, error: itemsErr.message ?? "Shop-Items konnten nicht geladen werden." };

    const items = ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? "Gegenstand"),
      description: r.description != null ? String(r.description) : null,
      base_price_gp: Math.max(0, Math.round(Number(r.base_price_gp ?? 0))),
      is_magical: Boolean(r.is_magical),
      rarity: String(r.rarity ?? "common").toLowerCase(),
      item_type: String(r.item_type ?? "gear").toLowerCase(),
    })).filter((r) => r.id.length > 0);

    return { ok: true, items };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}
