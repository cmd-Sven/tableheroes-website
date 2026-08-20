"use server";

import { randomBytes } from "crypto";
import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { createSeededRng, executeDiceRoll } from "@/src/lib/session/dice-roll";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import {
  createEmptyDnd5eSheet,
  parseSheetData,
} from "@/src/lib/characters/dnd5e/defaults";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import { appendSessionActivity } from "@/src/lib/actions/session-activity-actions";
import { compareCombatInitiative, parseInitiativeLabel } from "@/src/lib/combat-initiative";

type ParticipantRow = {
  id: string;
  session_id: string;
  name: string;
  type: string;
  npc_id: string | null;
  initiative_label: string | null;
  is_active: boolean;
};

async function assertSessionAccess(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: sessionRaw, error } = await (supabase.from("sessions") as any)
    .select("id, campaign_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !sessionRaw) throw new Error("Session nicht gefunden.");

  const campaignId = String((sessionRaw as { campaign_id: string }).campaign_id);
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as { gm_id?: string | null; owner_id?: string | null } | null;
  const isGm = isCampaignGm(campaign, user.id);

  if (!isGm) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();
    const status = String((member as { status?: string } | null)?.status ?? "");
    const ok = ["Approved", "Active", "Drafting", "Changes_Proposed"].includes(status);
    if (!ok) throw new Error("Keine Berechtigung für diese Session.");
  }

  return { supabase, user, isGm, campaignId };
}

function writeClient() {
  return tryCreateAdminClient() ?? null;
}

async function resolveDexModifier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string | null,
): Promise<number> {
  if (!characterId) return 0;
  const { data } = await (supabase.from("characters") as any)
    .select("sheet_data, level")
    .eq("id", characterId)
    .maybeSingle();
  if (!data) return 0;
  const level = Math.max(1, Math.floor(Number(data.level) || 1));
  const sheet = parseSheetData(data.sheet_data) ?? createEmptyDnd5eSheet(level);
  const derived = computeDerivedDnd5eSheet(sheet, level);
  return Number(derived.initiative ?? derived.abilities.dex?.modifier ?? 0) || 0;
}

async function findCharacterForParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  participant: ParticipantRow,
  userId: string,
  isGm: boolean,
): Promise<{ id: string; name: string; playerUserId: string | null } | null> {
  if (participant.type !== "player") return null;

  const { data } = await (supabase.from("characters") as any)
    .select("id, name, player_user_id")
    .eq("campaign_id", campaignId)
    .eq("name", participant.name)
    .maybeSingle();

  if (!data) return null;
  const playerUserId =
    data.player_user_id != null ? String(data.player_user_id) : null;

  if (!isGm && playerUserId !== userId) {
    throw new Error("Du darfst nur für deinen eigenen Charakter Initiative würfeln.");
  }

  return {
    id: String(data.id),
    name: String(data.name),
    playerUserId,
  };
}

/**
 * Würfelt Initiative (w20 + DEX bei Spielercharakteren) und speichert den Wert.
 * Spieler nur für eigenen Charakter; SL für alle.
 */
export async function rollCombatInitiative(input: {
  sessionId: string;
  participantId: string;
}): Promise<{
  total: number;
  natural: number;
  modifier: number;
  display: string;
}> {
  const { supabase, user, isGm, campaignId } = await assertSessionAccess(
    input.sessionId,
  );

  const { data: live } = await (supabase.from("session_live_states") as any)
    .select("is_combat_mode, combat_started")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  if (!live?.is_combat_mode) {
    throw new Error("Kein Kampfmodus aktiv.");
  }
  if (live.combat_started) {
    throw new Error(
      "Der Kampf läuft bereits — Initiative kann nicht neu gewürfelt werden.",
    );
  }

  const { data: raw, error } = await ((supabase as any).from("combat_participants") as any)
    .select("id, session_id, name, type, npc_id, initiative_label, is_active")
    .eq("id", input.participantId)
    .eq("session_id", input.sessionId)
    .maybeSingle();

  if (error || !raw) throw new Error("Teilnehmer nicht gefunden.");
  const participant = raw as ParticipantRow;
  if (!participant.is_active) throw new Error("Teilnehmer ist nicht aktiv.");
  if (
    participant.initiative_label != null &&
    String(participant.initiative_label).trim() !== ""
  ) {
    throw new Error("Initiative wurde bereits gewürfelt.");
  }

  if (participant.type !== "player" && !isGm) {
    throw new Error("Nur der Spielleiter darf für NPCs und Monster würfeln.");
  }

  const character = await findCharacterForParticipant(
    supabase,
    campaignId,
    participant,
    user.id,
    isGm,
  );

  const modifier = character
    ? await resolveDexModifier(supabase, character.id)
    : 0;

  const seed = randomBytes(16).toString("hex");
  const rng = createSeededRng(seed);
  const outcome = executeDiceRoll(
    { dice: 1, sides: 20, modifier },
    "normal",
    rng,
    seed,
  );
  const natural = outcome.faces[0] ?? outcome.usedRoll;
  const total = outcome.total;
  const display = String(total);

  const writer = isGm ? supabase : writeClient();
  if (!writer) throw new Error("Initiative konnte nicht gespeichert werden.");

  const { error: updErr } = await ((writer as any).from("combat_participants") as any)
    .update({
      initiative_value: total,
      initiative_label: display,
    })
    .eq("id", participant.id)
    .eq("session_id", input.sessionId);

  if (updErr) throw new Error(updErr.message);

  const modLabel = modifier !== 0 ? ` (${formatSigned(modifier)})` : "";
  await appendSessionActivity({
    sessionId: input.sessionId,
    type: "dice",
    text: `${participant.name} würfelt Initiative${modLabel}: ${natural}${
      modifier !== 0 ? ` → ${total}` : ""
    }`,
    characterId: character?.id,
    characterName: participant.name,
    meta: {
      animate: true,
      faces: outcome.faces,
      dieSides: [20],
      seed,
      label: "Initiative",
      modifier,
      usedRoll: natural,
      total,
      kind: "initiative",
    },
  }).catch(() => {
    /* Activity optional */
  });

  return { total, natural, modifier, display };
}

/**
 * Zug beenden: Spieler nur im eigenen Zug; SL immer.
 */
export async function advanceCombatTurn(input: {
  sessionId: string;
  expectedParticipantId?: string;
}): Promise<{ current_turn_index: number; combat_round: number }> {
  const { supabase, user, isGm, campaignId } = await assertSessionAccess(
    input.sessionId,
  );

  const { data: live, error: liveErr } = await (
    supabase.from("session_live_states") as any
  )
    .select("is_combat_mode, combat_started, current_turn_index, combat_round")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  if (liveErr || !live) throw new Error("Live-State nicht gefunden.");
  if (!live.is_combat_mode || !live.combat_started) {
    throw new Error("Der Kampf ist noch nicht gestartet.");
  }

  const { data: participantsRaw } = await ((supabase as any).from("combat_participants") as any)
    .select(
      "id, name, type, initiative_value, initiative_label, sort_order, is_active",
    )
    .eq("session_id", input.sessionId)
    .eq("is_active", true);

  const participants = (Array.isArray(participantsRaw) ? participantsRaw : [])
    .filter(
      (p: { initiative_label?: string | null }) =>
        p.initiative_label != null && String(p.initiative_label).trim() !== "",
    )
    .sort(compareCombatInitiative);

  if (participants.length === 0) throw new Error("Keine aktiven Teilnehmer.");

  const current = Math.min(
    Math.max(0, Number(live.current_turn_index) || 0),
    participants.length - 1,
  );
  const active = participants[current] as { id: string; name: string; type: string };

  if (!isGm) {
    if (active.type !== "player") {
      throw new Error("Nur der Spielleiter kann diesen Zug beenden.");
    }
    if (
      input.expectedParticipantId &&
      input.expectedParticipantId !== active.id
    ) {
      throw new Error("Du bist nicht am Zug.");
    }
    const { data: ch } = await (supabase.from("characters") as any)
      .select("id, player_user_id")
      .eq("campaign_id", campaignId)
      .eq("name", active.name)
      .maybeSingle();
    if (!ch || String(ch.player_user_id) !== user.id) {
      throw new Error("Du bist nicht am Zug.");
    }
  }

  const nextIndex = (current + 1) % participants.length;
  let combatRound = Math.max(1, Number(live.combat_round) || 1);
  if (nextIndex === 0) combatRound += 1;

  const writer = isGm ? supabase : writeClient();
  if (!writer) throw new Error("Zug konnte nicht gewechselt werden.");

  const { error: updErr } = await (writer.from("session_live_states") as any)
    .update({
      current_turn_index: nextIndex,
      combat_round: combatRound,
    })
    .eq("session_id", input.sessionId);

  if (updErr) throw new Error(updErr.message);

  return { current_turn_index: nextIndex, combat_round: combatRound };
}

/**
 * SL setzt Initiative manuell (auch während des Kampfes).
 */
export async function setCombatInitiative(input: {
  sessionId: string;
  participantId: string;
  initiativeLabel: string;
}): Promise<void> {
  const { supabase, isGm } = await assertSessionAccess(input.sessionId);
  if (!isGm) throw new Error("Nur der Spielleiter darf Initiativewerte ändern.");

  const parsed = parseInitiativeLabel(input.initiativeLabel);

  const { error } = await ((supabase as any).from("combat_participants") as any)
    .update({
      initiative_value: parsed.base,
      initiative_label: parsed.display,
    })
    .eq("id", input.participantId)
    .eq("session_id", input.sessionId);

  if (error) throw new Error(error.message);
}
