"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import type { Json } from "@/src/lib/database.types";
import {
  fallbackMundaneName,
  lootItemToJson,
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

async function addWealthGpSp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string,
  addGp: number,
  addSp: number,
): Promise<void> {
  const addG = Math.max(0, Math.round(addGp));
  const addS = Math.max(0, Math.round(addSp));
  if (addG === 0 && addS === 0) return;

  const { data: existing } = await (supabase as any)
    .from("character_wealth")
    .select("gp, sp, cp, ep, pp, gem_data")
    .eq("character_id", characterId)
    .maybeSingle();

  if (existing) {
    const ex = existing as Record<string, unknown>;
    const gp = Math.max(0, Math.round(Number(ex.gp ?? 0)) + addG);
    const sp = Math.max(0, Math.round(Number(ex.sp ?? 0)) + addS);
    const { error } = await (supabase as any)
      .from("character_wealth")
      .update({ gp, sp })
      .eq("character_id", characterId);
    if (error) throw new Error(error.message ?? "Vermögen konnte nicht aktualisiert werden.");
    return;
  }

  const { error } = await (supabase as any).from("character_wealth").insert({
    character_id: characterId,
    gp: addG,
    sp: addS,
    cp: 0,
    ep: 0,
    pp: 0,
    gem_data: [],
  });
  if (error) throw new Error(error.message ?? "Vermögen konnte nicht angelegt werden.");
}

export async function publishLootToSession(
  sessionId: string,
  campaignId: string,
  draft: LootDraftPayload,
): Promise<{ ok: true; containerId: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: camp } = await supabase.from("campaigns").select("id, gm_id, owner_id").eq("id", campaignId).single();
    if (!camp || !isCampaignGm(camp as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
      return { ok: false, error: "Nur der Spielleiter kann Beute freigeben." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== campaignId) {
      return { ok: false, error: "Session passt nicht zur Kampagne." };
    }

    const gp = Math.max(0, Math.round(draft.gp));
    const sp = Math.max(0, Math.round(draft.sp));
    const itemsJson = draft.items.map((it) => {
      const isMagical = Boolean(it.isMagical);
      const mundaneName = (it.mundaneName ?? "").trim() || (isMagical ? fallbackMundaneName(it.name) : it.name);
      const mundaneDesc =
        (it.mundaneDesc ?? "").trim() ||
        (isMagical
          ? "Magische Spuren, aber noch keine klare Identität — wirkt wie gewöhnliche Ausrüstung."
          : it.desc);
      return {
        id: String(it.id).trim(),
        name: it.name,
        desc: it.desc,
        mundaneName: mundaneName.slice(0, 160),
        mundaneDesc: mundaneDesc.slice(0, 800),
        rarity: it.rarity,
        price: Math.max(0, Math.round(it.price)),
        isMagical,
        identified: !isMagical,
      };
    });

    const { data: ins, error: insErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .insert({
        campaign_id: campaignId,
        name: draft.name.trim().slice(0, 160),
        gp_remaining: gp,
        sp_remaining: sp,
        items_json: itemsJson as unknown as Json,
      })
      .select("id")
      .single();

    if (insErr || !ins) {
      return { ok: false, error: insErr?.message ?? "Beute-Container konnte nicht angelegt werden." };
    }

    const containerId = String((ins as { id: string }).id);

    const { error: upErr } = await (supabase as any)
      .from("session_live_states")
      .update({ current_loot_id: containerId })
      .eq("session_id", sessionId);

    if (upErr) {
      await (supabase as any).from("campaign_loot_containers").delete().eq("id", containerId);
      return { ok: false, error: upErr.message ?? "Live-State konnte nicht verknüpft werden." };
    }

    return { ok: true, containerId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function takeAllLootGoldFromContainer(
  sessionId: string,
  characterId: string,
  containerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const { data: ch, error: chErr } = await supabase
      .from("characters")
      .select("id, user_id, campaign_id")
      .eq("id", characterId)
      .single();
    if (chErr || !ch) return { ok: false, error: "Charakter nicht gefunden." };
    const chRow = ch as { user_id: string | null; campaign_id: string };
    if (chRow.user_id !== user.id) {
      return { ok: false, error: "Nur der Spielercharakter kann Gold nehmen." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== chRow.campaign_id) {
      return { ok: false, error: "Session/Kampagne ungültig." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const { data: box, error: boxErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, campaign_id, gp_remaining, sp_remaining")
      .eq("id", containerId)
      .single();

    if (boxErr || !box) return { ok: false, error: "Beute nicht gefunden." };
    const b = box as { campaign_id: string; gp_remaining: number; sp_remaining: number };
    if (b.campaign_id !== chRow.campaign_id) {
      return { ok: false, error: "Beute gehört nicht zu dieser Kampagne." };
    }

    const takeGp = Math.max(0, Math.round(Number(b.gp_remaining ?? 0)));
    const takeSp = Math.max(0, Math.round(Number(b.sp_remaining ?? 0)));

    if (takeGp === 0 && takeSp === 0) {
      return { ok: true };
    }

    await addWealthGpSp(supabase, characterId, takeGp, takeSp);

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

export async function claimLootItemFromContainer(
  sessionId: string,
  characterId: string,
  containerId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const id = String(itemId).trim();
    if (id.length < 8) return { ok: false, error: "Ungültiges Item." };

    const { data: ch, error: chErr } = await supabase
      .from("characters")
      .select("id, user_id, campaign_id")
      .eq("id", characterId)
      .single();
    if (chErr || !ch) return { ok: false, error: "Charakter nicht gefunden." };
    const chRow = ch as { user_id: string | null; campaign_id: string };
    if (chRow.user_id !== user.id) {
      return { ok: false, error: "Nur der Spielercharakter kann Items nehmen." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== chRow.campaign_id) {
      return { ok: false, error: "Session/Kampagne ungültig." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const { data: box, error: boxErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, campaign_id, items_json, identify_requests")
      .eq("id", containerId)
      .single();

    if (boxErr || !box) return { ok: false, error: "Beute nicht gefunden." };
    const b = box as { campaign_id: string; items_json: unknown; identify_requests?: unknown };
    if (b.campaign_id !== chRow.campaign_id) {
      return { ok: false, error: "Beute gehört nicht zu dieser Kampagne." };
    }

    const arr = Array.isArray(b.items_json)
      ? (b.items_json as unknown[]).map(parseLootItemRow).filter((x): x is LootItemRow => x != null)
      : [];
    const idx = arr.findIndex((it) => String(it.id) === id);
    if (idx < 0) return { ok: false, error: "Item ist bereits weg." };

    const [picked] = arr.splice(idx, 1);
    const p = picked;

    const knownMagical = Boolean(p.isMagical) && Boolean(p.identified);
    const useMundane = Boolean(p.isMagical) && !p.identified;
    const invName = (useMundane ? (p.mundaneName || fallbackMundaneName(p.name)) : p.name).slice(0, 160);
    const mundaneBody =
      (p.mundaneDesc && p.mundaneDesc.trim()) ||
      "Magische Eigenschaften sind nicht identifiziert — du behandelst den Fund wie gewöhnliche Ausrüstung.";
    const descParts = useMundane
      ? [mundaneBody, `Seltenheit (geschätzt): ${p.rarity}`, p.price ? `Geschätzter Wert: ${p.price} gp` : null]
      : [p.desc, `Seltenheit: ${p.rarity}`, p.price ? `Geschätzter Wert: ${p.price} gp` : null].filter(Boolean);
    const description = descParts.join("\n\n").slice(0, 1200) || null;

    const { error: insErr } = await (supabase as any).from("character_items").insert({
      character_id: characterId,
      name: invName,
      description,
      category: "Equipment",
      icon_type: knownMagical ? "potion" : "gear",
      target_fap: 0,
      current_fap: 0,
      is_deleted: false,
    });

    if (insErr) return { ok: false, error: insErr.message ?? "Item konnte nicht ins Inventar." };

    const nextRequests = parseIdentifyRequests(b.identify_requests).filter((r) => r.item_id !== id);

    const { error: upErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .update({
        items_json: arr.map(lootItemToJson) as unknown as Json,
        identify_requests: nextRequests as unknown as Json,
      })
      .eq("id", containerId);

    if (upErr) return { ok: false, error: upErr.message ?? "Container konnte nicht aktualisiert werden." };

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function requestLootItemIdentify(
  sessionId: string,
  characterId: string,
  containerId: string,
  itemId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht authentifiziert." };

    const id = String(itemId).trim();
    if (id.length < 8) return { ok: false, error: "Ungültiges Item." };

    const { data: ch, error: chErr } = await supabase
      .from("characters")
      .select("id, user_id, campaign_id, name")
      .eq("id", characterId)
      .single();
    if (chErr || !ch) return { ok: false, error: "Charakter nicht gefunden." };
    const chRow = ch as { user_id: string | null; campaign_id: string; name: string | null };
    if (chRow.user_id !== user.id) {
      return { ok: false, error: "Nur mit dem eigenen Charakter anfragbar." };
    }

    const sc = await loadSessionCampaign(supabase, sessionId);
    if (!sc || sc.campaignId !== chRow.campaign_id) {
      return { ok: false, error: "Session/Kampagne ungültig." };
    }

    const match = await assertLiveLootMatches(supabase, sessionId, containerId);
    if (!match) return { ok: false, error: "Diese Truhe ist gerade nicht aktiv." };

    const { data: box, error: boxErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .select("id, campaign_id, items_json, identify_requests")
      .eq("id", containerId)
      .single();

    if (boxErr || !box) return { ok: false, error: "Beute nicht gefunden." };
    const b = box as { campaign_id: string; items_json: unknown; identify_requests?: unknown };
    if (b.campaign_id !== chRow.campaign_id) {
      return { ok: false, error: "Beute gehört nicht zu dieser Kampagne." };
    }

    const items = Array.isArray(b.items_json)
      ? (b.items_json as unknown[]).map(parseLootItemRow).filter((x): x is LootItemRow => x != null)
      : [];
    const item = items.find((it) => it.id === id);
    if (!item) return { ok: false, error: "Item nicht mehr auf der Bühne." };
    if (!item.isMagical) return { ok: false, error: "Nur magische Gegenstände müssen identifiziert werden." };
    if (item.identified) return { ok: false, error: "Bereits identifiziert." };

    let pending = parseIdentifyRequests(b.identify_requests);
    if (pending.some((r) => r.character_id === characterId && r.item_id === id)) {
      return { ok: true };
    }

    const reqId = crypto.randomUUID();
    const itemLabel = (item.mundaneName || fallbackMundaneName(item.name)).slice(0, 160);
    pending = [
      ...pending,
      {
        id: reqId,
        character_id: characterId,
        character_name: String(chRow.name ?? "Spieler").slice(0, 120),
        item_id: id,
        item_label: itemLabel,
        created_at: new Date().toISOString(),
      },
    ].slice(-24);

    const { error: upErr } = await (supabase as any)
      .from("campaign_loot_containers")
      .update({ identify_requests: pending as unknown as Json })
      .eq("id", containerId);

    if (upErr) return { ok: false, error: upErr.message ?? "Anfrage konnte nicht gesendet werden." };
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
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
