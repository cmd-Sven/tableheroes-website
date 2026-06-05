import type { createClient } from "@/src/lib/supabase/server";
import {
  addCopperToPouch,
  coinPouchToCopper,
  normalizeCoinPouch,
  subtractCopperFromPouch,
  type CoinPouch,
} from "@/src/lib/dnd-currency";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function normalizeCharacterGp(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** Kanonische Gold-Quelle: character_wealth.gp */
export async function getCharacterGoldGp(
  supabase: SupabaseClient,
  characterId: string,
): Promise<number> {
  const { data } = await (supabase as any)
    .from("character_wealth")
    .select("gp")
    .eq("character_id", characterId)
    .maybeSingle();

  return normalizeCharacterGp((data as { gp?: number } | null)?.gp);
}

export async function setCharacterGoldGp(
  supabase: SupabaseClient,
  characterId: string,
  gp: number,
): Promise<{ error: string | null }> {
  const nextGp = normalizeCharacterGp(gp);

  const { error } = await (supabase as any)
    .from("character_wealth")
    .upsert({ character_id: characterId, gp: nextGp }, { onConflict: "character_id" });

  if (error) {
    return { error: error.message ?? "Gold konnte nicht gespeichert werden." };
  }

  return { error: null };
}

export async function addCharacterGoldGp(
  supabase: SupabaseClient,
  characterId: string,
  deltaGp: number,
): Promise<{ newGp: number; error: string | null }> {
  const delta = normalizeCharacterGp(deltaGp);
  if (delta === 0) {
    const current = await getCharacterGoldGp(supabase, characterId);
    return { newGp: current, error: null };
  }

  const current = await getCharacterGoldGp(supabase, characterId);
  const result = await setCharacterGoldGp(supabase, characterId, current + delta);
  return { newGp: current + delta, error: result.error };
}

export async function addCharacterWealthGpSp(
  supabase: SupabaseClient,
  characterId: string,
  addGp: number,
  addSp: number,
): Promise<void> {
  const addG = normalizeCharacterGp(addGp);
  const addS = normalizeCharacterGp(addSp);
  if (addG === 0 && addS === 0) return;

  const { data: existing } = await (supabase as any)
    .from("character_wealth")
    .select("gp, sp, cp, ep, pp, gem_data")
    .eq("character_id", characterId)
    .maybeSingle();

  if (existing) {
    const ex = existing as Record<string, unknown>;
    const gp = normalizeCharacterGp(Number(ex.gp ?? 0) + addG);
    const sp = normalizeCharacterGp(Number(ex.sp ?? 0) + addS);
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

export async function getCharacterCoinPouch(
  supabase: SupabaseClient,
  characterId: string,
): Promise<CoinPouch> {
  const { data } = await (supabase as any)
    .from("character_wealth")
    .select("gp, sp, cp, ep, pp")
    .eq("character_id", characterId)
    .maybeSingle();

  if (!data) {
    return normalizeCoinPouch({});
  }

  return normalizeCoinPouch(data as CoinPouch);
}

export async function setCharacterCoinPouch(
  supabase: SupabaseClient,
  characterId: string,
  pouch: CoinPouch,
): Promise<{ error: string | null }> {
  const next = normalizeCoinPouch(pouch);
  const { error } = await (supabase as any)
    .from("character_wealth")
    .upsert(
      {
        character_id: characterId,
        gp: next.gp,
        sp: next.sp,
        cp: next.cp,
        ep: next.ep,
        pp: next.pp,
      },
      { onConflict: "character_id" },
    );

  if (error) {
    return { error: error.message ?? "Vermögen konnte nicht gespeichert werden." };
  }

  return { error: null };
}

export async function subtractCharacterWealthCopper(
  supabase: SupabaseClient,
  characterId: string,
  amountCp: number,
): Promise<{ ok: boolean; error: string | null }> {
  const current = await getCharacterCoinPouch(supabase, characterId);
  const result = subtractCopperFromPouch(current, amountCp);
  if (!result.ok) {
    return { ok: false, error: "Nicht genug Geld." };
  }
  const saved = await setCharacterCoinPouch(supabase, characterId, result.pouch);
  return { ok: !saved.error, error: saved.error };
}

export async function addCharacterWealthCopper(
  supabase: SupabaseClient,
  characterId: string,
  amountCp: number,
): Promise<{ error: string | null }> {
  const current = await getCharacterCoinPouch(supabase, characterId);
  const next = addCopperToPouch(current, amountCp);
  return setCharacterCoinPouch(supabase, characterId, next);
}

export async function getCharacterWealthCopper(
  supabase: SupabaseClient,
  characterId: string,
): Promise<number> {
  return coinPouchToCopper(await getCharacterCoinPouch(supabase, characterId));
}
