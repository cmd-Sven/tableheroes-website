"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";

type FateCoin = {
  id: string;
  side: "white" | "black";
};

function normalizeFateCoins(value: unknown): FateCoin[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((coin) => {
      const row = coin as Record<string, unknown>;
      const id = String(row.id ?? "").trim();
      const side = row.side === "black" ? "black" : "white";
      return id ? { id, side } : null;
    })
    .filter((coin): coin is FateCoin => coin != null);
}

function createCoins(initialWhite: number, initialBlack: number): FateCoin[] {
  const whiteCount = Math.max(0, Math.min(50, Math.round(Number(initialWhite) || 0)));
  const blackCount = Math.max(0, Math.min(50, Math.round(Number(initialBlack) || 0)));

  return [
    ...Array.from({ length: whiteCount }, () => ({
      id: randomUUID(),
      side: "white" as const,
    })),
    ...Array.from({ length: blackCount }, () => ({
      id: randomUUID(),
      side: "black" as const,
    })),
  ];
}

async function loadSessionAccess(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionRaw) {
    throw new Error("Session nicht gefunden.");
  }

  const session = sessionRaw as { id: string; campaign_id: string };
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  const isGM = isCampaignGm(campaign, user.id);

  if (!isGM) {
    const { data: memberRaw } = await supabase
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", session.campaign_id)
      .eq("user_id", user.id)
      .in("status", ["Approved", "Active"])
      .maybeSingle();

    if (!memberRaw) {
      throw new Error("Kein Zugriff auf diese Session.");
    }
  }

  return { supabase, isGM };
}

async function loadCoinState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("session_live_states")
    .select("fate_coins, destroyed_fate_coins")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) {
    throw new Error("Schicksalsmünzen konnten nicht geladen werden.");
  }

  return {
    coins: normalizeFateCoins(data.fate_coins),
    destroyed: Number(data.destroyed_fate_coins ?? 0),
  };
}

export async function flipFateCoin(sessionId: string, coinId: string) {
  const { supabase } = await loadSessionAccess(sessionId);
  const { coins } = await loadCoinState(supabase, sessionId);
  const targetId = String(coinId).trim();

  const nextCoins = coins.map((coin) =>
    coin.id === targetId
      ? { ...coin, side: coin.side === "white" ? "black" : "white" }
      : coin,
  );

  if (!coins.some((coin) => coin.id === targetId)) {
    throw new Error("Münze nicht gefunden.");
  }

  const { error } = await supabase
    .from("session_live_states")
    .update({ fate_coins: nextCoins })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  return nextCoins;
}

export async function destroyFateCoin(sessionId: string, coinId: string) {
  const { supabase } = await loadSessionAccess(sessionId);
  const { coins, destroyed } = await loadCoinState(supabase, sessionId);
  const targetId = String(coinId).trim();
  const nextCoins = coins.filter((coin) => coin.id !== targetId);

  if (nextCoins.length === coins.length) {
    throw new Error("Münze nicht gefunden.");
  }

  const { error } = await supabase
    .from("session_live_states")
    .update({
      fate_coins: nextCoins,
      destroyed_fate_coins: Math.max(0, destroyed + 1),
    })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  return { fate_coins: nextCoins, destroyed_fate_coins: destroyed + 1 };
}

export async function resetFateCoins(
  sessionId: string,
  initialWhite: number,
  initialBlack: number,
) {
  const { supabase, isGM } = await loadSessionAccess(sessionId);
  if (!isGM) {
    throw new Error("Nur der GM kann den Schicksalsmünzen-Pool zurücksetzen.");
  }

  const nextCoins = createCoins(initialWhite, initialBlack);
  const { error } = await supabase
    .from("session_live_states")
    .update({
      fate_coins: nextCoins,
      destroyed_fate_coins: 0,
    })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  return { fate_coins: nextCoins, destroyed_fate_coins: 0 };
}
