"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  normalizePartyTokenState,
  type AurenfurtPartyTokenState,
} from "@/src/components/city/aurenfurt/aurenfurt-party-tokens";

async function assertSessionGm(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id, aurenfurt_city_enabled")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");

  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (
    !isCampaignGm(
      campaignRaw as { gm_id?: string | null; owner_id?: string | null },
      user.id,
    )
  ) {
    throw new Error("Nur der Spielleiter darf die Aurenfurt-Stadtsimulation steuern.");
  }

  return {
    supabase,
    campaignId,
    aurenfurtCityEnabled: Boolean(
      (sessionRaw as { aurenfurt_city_enabled?: boolean }).aurenfurt_city_enabled,
    ),
  };
}

/** Prep: Stadt Aurenfurt für diese Session als relevant markieren. */
export async function setSessionAurenfurtCityEnabled(
  sessionId: string,
  enabled: boolean,
): Promise<void> {
  const { supabase, campaignId } = await assertSessionGm(sessionId);

  const { data, error } = await (supabase.from("sessions") as any)
    .update({ aurenfurt_city_enabled: enabled })
    .eq("id", sessionId)
    .select("id, aurenfurt_city_enabled")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      "Freischaltung konnte nicht gespeichert werden. Bitte Session neu laden und erneut versuchen.",
    );
  }

  if (!enabled) {
    const { error: liveErr } = await (supabase.from("session_live_states") as any)
      .update({ active_aurenfurt_city: false })
      .eq("session_id", sessionId);
    if (liveErr) throw new Error(liveErr.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`);
  revalidatePath(`/session/${sessionId}`);
}

/** Party-/Gruppen-Token-Positionen der Session laden. */
export async function loadAurenfurtPartyTokens(
  sessionId: string,
): Promise<AurenfurtPartyTokenState> {
  noStore();
  const empty = normalizePartyTokenState({});
  if (!sessionId) return empty;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data, error } = await (supabase.from("session_live_states") as any)
    .select("aurenfurt_party_tokens")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data) return empty;
  return normalizePartyTokenState(
    (data as { aurenfurt_party_tokens?: unknown }).aurenfurt_party_tokens,
  );
}

/** Party-/Gruppen-Token-Positionen speichern (GM oder eigener Charakter-Platzierer). */
export async function saveAurenfurtPartyTokens(
  sessionId: string,
  next: AurenfurtPartyTokenState,
): Promise<AurenfurtPartyTokenState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");
  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const isGm = isCampaignGm(
    campaignRaw as { gm_id?: string | null; owner_id?: string | null },
    user.id,
  );
  if (!isGm) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("user_id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) throw new Error("Kein Zugriff auf diese Kampagne.");
  }

  const normalized = normalizePartyTokenState(next);
  const { error } = await (supabase.from("session_live_states") as any)
    .update({ aurenfurt_party_tokens: normalized })
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return normalized;
}

/**
 * Live: GM schiebt alle Spieler auf die Aurenfurt-3D-Karte (oder beendet die Ansicht).
 * Aktivierung setzt active_world_map_id zurück (keine überlappenden Force-Views).
 */
export async function setActiveAurenfurtCity(
  sessionId: string,
  active: boolean,
): Promise<void> {
  const { supabase, aurenfurtCityEnabled } = await assertSessionGm(sessionId);

  if (active && !aurenfurtCityEnabled) {
    throw new Error(
      "Aurenfurt ist für diese Session nicht freigeschaltet. Bitte in der Bühnenvorbereitung aktivieren.",
    );
  }

  const patch: Record<string, unknown> = {
    active_aurenfurt_city: active,
  };
  if (active) {
    patch.active_world_map_id = null;
  }

  const { error } = await (supabase.from("session_live_states") as any)
    .update(patch)
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/session/${sessionId}`);
}


export type AurenfurtHandCityEvent = {
  kind: "city-event";
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  scope: "city" | "district" | "sector";
  /** Ausgespielt und noch in der Wirkzeit — in der Hand ausgegraut. */
  active: boolean;
  remainingDays?: number | null;
};

export type AurenfurtHandNpcCard = {
  kind: "npc-card";
  id: string;
  cardId: string;
  title: string;
  text: string;
  npcId: string;
  npcName: string;
  imageUrl: string | null;
  active?: boolean;
  remainingDays?: number | null;
};

export type AurenfurtHandKaiserCard = {
  kind: "kaiser-card";
  id: string;
  cardId: string;
  title: string;
  text: string;
  imageUrl: string | null;
  scope: "city" | "palace" | "district";
  durationDays: number;
  /** Ausgespielt und noch in der Wirkzeit — bleibt in der Hand, markiert. */
  active: boolean;
  remainingDays: number | null;
  districtId: string | null;
};

export type AurenfurtHandEntry =
  | AurenfurtHandCityEvent
  | AurenfurtHandNpcCard
  | AurenfurtHandKaiserCard;

export type AurenfurtPresentedCard = {
  revealId: string;
  kind: "kaiser" | "city-event" | "npc-card";
  title: string;
  text: string;
  imageUrl: string | null;
  subtitle: string | null;
};

function remainingDaysFromStart(
  startedOn: string,
  durationDays: number,
  dayIso: string,
): number {
  const start = Date.parse(`${startedOn.slice(0, 10)}T12:00:00.000Z`);
  const day = Date.parse(`${dayIso.slice(0, 10)}T12:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(day)) return 0;
  const elapsed = Math.max(0, Math.round((day - start) / 86_400_000));
  return Math.max(0, durationDays - elapsed);
}

/**
 * Live-Hand für die Aurenfurt-Stadtkarte:
 * - alle Stadtereignisse (aktiv = ausgegraut in der Hand, inaktiv = ausspielbar)
 * - alle Kaiser-Karten (aktiv mit Resttagen, danach wieder ausspielbar)
 * - NPC-Ereigniskarten der in der Bühnenvorbereitung gewählten Stadt-NPCs
 */
export async function listAurenfurtSessionHand(
  sessionId: string,
  options?: { dayIso?: string | null },
): Promise<AurenfurtHandEntry[]> {
  noStore();
  const { supabase, aurenfurtCityEnabled } = await assertSessionGm(sessionId);
  if (!aurenfurtCityEnabled) return [];

  const { data: sessionRow } = await (supabase.from("sessions") as any)
    .select("stage_deck_npc_ids")
    .eq("id", sessionId)
    .maybeSingle();

  const deckNpcIds: string[] | null =
    sessionRow?.stage_deck_npc_ids != null && Array.isArray(sessionRow.stage_deck_npc_ids)
      ? sessionRow.stage_deck_npc_ids.map(String)
      : null;

  const { AURENFURT_WORLD_ID } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-district-lore-ids"
  );
  const dayIso = (options?.dayIso ?? new Date().toISOString().slice(0, 10)).slice(0, 10);

  if (options?.dayIso) {
    const { deactivateExpiredCitySimEvents } = await import(
      "@/src/app/dashboard/worlds/city-sim-event-actions"
    );
    await deactivateExpiredCitySimEvents(AURENFURT_WORLD_ID, dayIso).catch(() => 0);
  }

  const { data: eventRows } = await (supabase as any)
    .from("city_sim_events")
    .select("id, title, body, image_url, scope, active, updated_at, start_on, duration_days")
    .eq("world_id", AURENFURT_WORLD_ID)
    .order("active", { ascending: true })
    .order("updated_at", { ascending: false });

  const cityEvents: AurenfurtHandCityEvent[] = (
    (eventRows ?? []) as Array<Record<string, unknown>>
  ).map((row) => {
    const active = row.active === true;
    const duration =
      typeof row.duration_days === "number" && Number.isFinite(row.duration_days)
        ? row.duration_days
        : null;
    const startedOn =
      typeof row.start_on === "string" ? row.start_on.slice(0, 10) : null;
    const remainingDays =
      active && duration != null && startedOn
        ? remainingDaysFromStart(startedOn, duration, dayIso)
        : null;
    return {
      kind: "city-event" as const,
      id: String(row.id),
      title: String(row.title ?? "Stadtereignis"),
      body: String(row.body ?? ""),
      imageUrl:
        typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim() : null,
      scope: row.scope === "district" || row.scope === "sector" ? row.scope : "city",
      active,
      remainingDays,
    };
  });

  const { KAISER_EVENT_CARDS } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-kaiser-cards"
  );
  const { data: kaiserNpc } = await (supabase.from("npcs") as any)
    .select("id, city_event_deck, city_card_plays")
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("aurenfurt_catalog_id", "npc-kaiser-artheus")
    .maybeSingle();

  const kaiserDeck = Array.isArray(kaiserNpc?.city_event_deck)
    ? (kaiserNpc.city_event_deck as Array<Record<string, unknown>>)
    : [];
  const kaiserPlays = Array.isArray(kaiserNpc?.city_card_plays)
    ? (kaiserNpc.city_card_plays as Array<{ cardId?: string; startedOn?: string; districtId?: string | null }>)
    : [];
  const imageByKaiserCard = new Map<string, string>();
  for (const card of kaiserDeck) {
    const id = typeof card.id === "string" ? card.id : "";
    const url =
      typeof card.imageUrl === "string" && card.imageUrl.trim()
        ? card.imageUrl.trim()
        : typeof card.image_url === "string" && card.image_url.trim()
          ? card.image_url.trim()
          : "";
    if (id && url) imageByKaiserCard.set(id, url);
  }

  const kaiserCards: AurenfurtHandKaiserCard[] = KAISER_EVENT_CARDS.map((card) => {
    const openPlays = kaiserPlays.filter((play) => String(play.cardId ?? "") === card.id);
    let bestRemaining = 0;
    let districtId: string | null = null;
    for (const play of openPlays) {
      const startedOn = typeof play.startedOn === "string" ? play.startedOn.slice(0, 10) : "";
      if (!startedOn) continue;
      const left = remainingDaysFromStart(startedOn, card.durationDays, dayIso);
      if (left > bestRemaining) {
        bestRemaining = left;
        districtId =
          typeof play.districtId === "string" && play.districtId.trim()
            ? play.districtId.trim()
            : null;
      }
    }
    const active = bestRemaining > 0;
    return {
      kind: "kaiser-card" as const,
      id: `kaiser:${card.id}`,
      cardId: card.id,
      title: card.title,
      text: card.description,
      imageUrl: imageByKaiserCard.get(card.id) ?? card.imageUrl?.trim() ?? null,
      scope: card.scope,
      durationDays: card.durationDays,
      active,
      remainingDays: active ? bestRemaining : null,
      districtId,
    };
  });

  let npcQuery = (supabase.from("npcs") as any)
    .select(
      "id, name, image_url, city_event_deck, city_card_plays, for_city_simulation, aurenfurt_catalog_id",
    )
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("for_city_simulation", true);

  if (deckNpcIds != null) {
    if (deckNpcIds.length === 0) return [...cityEvents, ...kaiserCards];
    npcQuery = npcQuery.in("id", deckNpcIds);
  }

  const { data: npcRows } = await npcQuery;
  const npcCards: AurenfurtHandNpcCard[] = [];
  for (const npc of (npcRows ?? []) as Array<Record<string, unknown>>) {
    if (String(npc.aurenfurt_catalog_id ?? "") === "npc-kaiser-artheus") continue;
    const deck = Array.isArray(npc.city_event_deck) ? npc.city_event_deck : [];
    const plays = Array.isArray(npc.city_card_plays) ? npc.city_card_plays : [];
    const openPlays = new Map<string, string>();
    for (const play of plays as Array<{ cardId?: string; startedOn?: string }>) {
      const cardId = play?.cardId ? String(play.cardId) : "";
      const startedOn = play?.startedOn ? String(play.startedOn).slice(0, 10) : "";
      if (cardId && startedOn) openPlays.set(cardId, startedOn);
    }
    const npcId = String(npc.id);
    const npcName = String(npc.name ?? "NPC");
    const portraitUrl =
      typeof npc.image_url === "string" && npc.image_url.trim() ? npc.image_url.trim() : null;
    for (const card of deck as Array<Record<string, unknown>>) {
      const cardId = typeof card.id === "string" ? card.id : "";
      if (!cardId || cardId.startsWith("kaiser-")) continue;
      const title = typeof card.title === "string" ? card.title : "";
      if (!title) continue;
      const duration =
        typeof card.durationDays === "number" && Number.isFinite(card.durationDays)
          ? card.durationDays
          : 5;
      const startedOn = openPlays.get(cardId) ?? null;
      const remainingDays = startedOn
        ? remainingDaysFromStart(startedOn, duration, dayIso)
        : null;
      const active = remainingDays != null && remainingDays > 0;
      const cardImage =
        typeof card.imageUrl === "string" && card.imageUrl.trim()
          ? card.imageUrl.trim()
          : typeof card.image_url === "string" && card.image_url.trim()
            ? card.image_url.trim()
            : null;
      npcCards.push({
        kind: "npc-card",
        id: `${npcId}:${cardId}`,
        cardId,
        title,
        text: typeof card.text === "string" ? card.text : "",
        npcId,
        npcName,
        imageUrl: cardImage ?? portraitUrl,
        active,
        remainingDays: active ? remainingDays : null,
      });
    }
  }

  return [...kaiserCards, ...cityEvents, ...npcCards];
}

async function presentHandCard(
  sessionId: string,
  card: Omit<AurenfurtPresentedCard, "revealId">,
): Promise<AurenfurtPresentedCard> {
  const { createSystemLog } = await import("@/src/lib/actions/session-system-log-actions");
  const revealId = `reveal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const presented: AurenfurtPresentedCard = { ...card, revealId };
  await createSystemLog(sessionId, "aurenfurt_card_reveal", `Karte ausgelegt: ${card.title}`, {
    revealId,
    kind: card.kind,
    title: card.title,
    text: card.text,
    imageUrl: card.imageUrl,
    subtitle: card.subtitle,
  });
  return presented;
}

/** SL schließt das Karten-Modal für alle Teilnehmer. */
export async function dismissAurenfurtPresentedCard(
  sessionId: string,
  revealId: string,
): Promise<void> {
  await assertSessionGm(sessionId);
  const { createSystemLog } = await import("@/src/lib/actions/session-system-log-actions");
  await createSystemLog(sessionId, "aurenfurt_card_dismiss", "Karten-Auslage beendet", {
    revealId,
  });
}

/** Stadtereignis aus der Live-Hand ausspielen (aktivieren). */
export async function playAurenfurtCityEventFromHand(
  sessionId: string,
  eventId: string,
  startOn?: string,
): Promise<AurenfurtPresentedCard> {
  const { supabase, aurenfurtCityEnabled } = await assertSessionGm(sessionId);
  if (!aurenfurtCityEnabled) {
    throw new Error("Aurenfurt ist für diese Session nicht freigeschaltet.");
  }
  const { AURENFURT_WORLD_ID } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-district-lore-ids"
  );
  const { activateCitySimEvent } = await import(
    "@/src/app/dashboard/worlds/city-sim-event-actions"
  );
  const day = (startOn ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  await activateCitySimEvent(AURENFURT_WORLD_ID, eventId, day);

  const { data: eventRow } = await (supabase as any)
    .from("city_sim_events")
    .select("title, body, image_url")
    .eq("id", eventId)
    .eq("world_id", AURENFURT_WORLD_ID)
    .maybeSingle();

  return presentHandCard(sessionId, {
    kind: "city-event",
    title: String(eventRow?.title ?? "Stadtereignis"),
    text: String(eventRow?.body ?? ""),
    imageUrl:
      typeof eventRow?.image_url === "string" && eventRow.image_url.trim()
        ? eventRow.image_url.trim()
        : null,
    subtitle: "Stadtereignis",
  });
}

/** NPC-Ereigniskarte aus der Live-Hand ausspielen. */
export async function playAurenfurtNpcCardFromHand(
  sessionId: string,
  npcId: string,
  cardId: string,
): Promise<AurenfurtPresentedCard> {
  const { supabase, aurenfurtCityEnabled } = await assertSessionGm(sessionId);
  if (!aurenfurtCityEnabled) {
    throw new Error("Aurenfurt ist für diese Session nicht freigeschaltet.");
  }
  const { AURENFURT_WORLD_ID } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-district-lore-ids"
  );
  const { layNpcCityCard } = await import(
    "@/src/app/dashboard/worlds/city-sim-event-actions"
  );
  await layNpcCityCard(AURENFURT_WORLD_ID, npcId, cardId);

  const { data: npc } = await (supabase.from("npcs") as any)
    .select("name, image_url, city_event_deck")
    .eq("id", npcId)
    .maybeSingle();
  const deck = Array.isArray(npc?.city_event_deck) ? npc.city_event_deck : [];
  const card = deck.find((entry: { id?: string }) => String(entry?.id ?? "") === cardId) as
    | Record<string, unknown>
    | undefined;

  return presentHandCard(sessionId, {
    kind: "npc-card",
    title: String(card?.title ?? "NPC-Karte"),
    text: String(card?.text ?? ""),
    imageUrl:
      (typeof card?.imageUrl === "string" && card.imageUrl.trim()
        ? card.imageUrl.trim()
        : null) ??
      (typeof npc?.image_url === "string" && npc.image_url.trim() ? npc.image_url.trim() : null),
    subtitle: String(npc?.name ?? "NPC"),
  });
}

/** Kaiser-Karte aus der Live-Hand ausspielen. */
export async function playAurenfurtKaiserCardFromHand(
  sessionId: string,
  cardId: string,
  districtId?: string | null,
): Promise<AurenfurtPresentedCard> {
  const { supabase, aurenfurtCityEnabled } = await assertSessionGm(sessionId);
  if (!aurenfurtCityEnabled) {
    throw new Error("Aurenfurt ist für diese Session nicht freigeschaltet.");
  }
  const { AURENFURT_WORLD_ID } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-district-lore-ids"
  );
  const { KAISER_EVENT_CARDS, findKaiserCard } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-kaiser-cards"
  );
  const template = findKaiserCard(cardId);
  if (!template) throw new Error("Unbekannte Kaiser-Karte.");
  if (template.scope === "district" && !districtId) {
    throw new Error("Bitte ein Viertel für die Razzia wählen.");
  }

  const { data: kaiserNpc } = await (supabase.from("npcs") as any)
    .select("id, city_event_deck, city_card_plays")
    .eq("world_id", AURENFURT_WORLD_ID)
    .eq("aurenfurt_catalog_id", "npc-kaiser-artheus")
    .maybeSingle();
  if (!kaiserNpc) throw new Error("Kaiser-NPC nicht in der Welt gefunden.");

  const deck = Array.isArray(kaiserNpc.city_event_deck)
    ? (kaiserNpc.city_event_deck as Array<Record<string, unknown>>)
    : [];
  let nextDeck = deck;
  if (!deck.some((card) => String(card.id ?? "") === cardId)) {
    nextDeck = [
      ...deck,
      ...KAISER_EVENT_CARDS.filter((card) => !deck.some((row) => String(row.id ?? "") === card.id)).map(
        (card, index) => ({
          id: card.id,
          title: card.title,
          text: card.description,
          sortOrder: deck.length + index,
          durationDays: card.durationDays,
          range: card.scope === "district" ? "district" : "city",
          extraDistrictIds: card.scope === "palace" ? ["palast"] : [],
          effects: card.effects,
          imageUrl: card.imageUrl ?? null,
        }),
      ),
    ];
  }

  const startedOn = new Date().toISOString().slice(0, 10);
  const plays = Array.isArray(kaiserNpc.city_card_plays)
    ? (kaiserNpc.city_card_plays as Array<Record<string, unknown>>)
    : [];
  const nextPlays = [
    ...plays.filter((play) => {
      const playCardId = String(play.cardId ?? "");
      const playStarted = typeof play.startedOn === "string" ? play.startedOn.slice(0, 10) : "";
      if (playCardId !== cardId || !playStarted) return true;
      return remainingDaysFromStart(playStarted, template.durationDays, startedOn) > 0;
    }),
    {
      cardId,
      startedOn,
      districtId:
        template.scope === "district"
          ? districtId
          : template.scope === "palace"
            ? "palast"
            : null,
    },
  ];

  const { error } = await (supabase.from("npcs") as any)
    .update({ city_event_deck: nextDeck, city_card_plays: nextPlays })
    .eq("id", kaiserNpc.id);
  if (error) throw new Error(error.message);

  const deckCard = nextDeck.find((card) => String(card.id ?? "") === cardId);
  const imageUrl =
    typeof deckCard?.imageUrl === "string" && deckCard.imageUrl.trim()
      ? deckCard.imageUrl.trim()
      : template.imageUrl?.trim() || null;

  return presentHandCard(sessionId, {
    kind: "kaiser",
    title: template.title,
    text: template.description,
    imageUrl,
    subtitle: "Kaiser-Befehl",
  });
}
