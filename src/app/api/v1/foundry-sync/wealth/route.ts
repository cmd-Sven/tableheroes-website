import { z } from "zod";
import { createAdminClient } from "@/src/lib/supabase/server";
import { setCharacterCoinPouch, getCharacterCoinPouch } from "@/src/lib/character-gold";
import {
  foundryJson,
  foundryOptions,
  getFoundryApiKey,
  resolveFoundryApiCampaign,
} from "@/src/lib/foundry-sync/foundry-api";
import { resolveFoundryCharacterMapping } from "@/src/lib/foundry-sync/resolve-foundry-mapping";
import type { FoundryProfileCurrency } from "@/src/lib/foundry-sync/foundry-profile-types";

export const dynamic = "force-dynamic";

const currencySchema = z.object({
  gp: z.coerce.number().int().nonnegative(),
  sp: z.coerce.number().int().nonnegative(),
  cp: z.coerce.number().int().nonnegative(),
  ep: z.coerce.number().int().nonnegative(),
  pp: z.coerce.number().int().nonnegative(),
});

const payloadSchema = z
  .object({
    foundry_actor_id: z.string().trim().min(1, "foundry_actor_id fehlt."),
    direction: z.enum(["foundry_to_th", "th_to_foundry"]),
    currency: currencySchema.optional(),
  })
  .strict();

export async function OPTIONS() {
  return foundryOptions();
}

function toCurrencyResponse(pouch: FoundryProfileCurrency) {
  return {
    gp: pouch.gp,
    sp: pouch.sp,
    cp: pouch.cp,
    ep: pouch.ep,
    pp: pouch.pp,
  };
}

/** POST — Geldbörse synchronisieren (Foundry ↔ Table Heroes). */
export async function POST(request: Request) {
  const apiKey = getFoundryApiKey(request);
  if (!apiKey) {
    return foundryJson(
      { error: "Missing API key header: x-tableheroes-api-key" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return foundryJson({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return foundryJson(
      { error: "Payload validation failed.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();
  const auth = await resolveFoundryApiCampaign(supabase, apiKey);
  if (!auth.ok) {
    return foundryJson({ error: auth.error }, { status: auth.status });
  }

  const mappingResult = await resolveFoundryCharacterMapping(
    supabase,
    auth.campaignId,
    input.foundry_actor_id,
  );
  if (!mappingResult.ok) {
    return foundryJson(mappingResult.body, { status: mappingResult.status });
  }

  const characterId = mappingResult.characterId;

  if (input.direction === "th_to_foundry") {
    const current = await getCharacterCoinPouch(supabase, characterId);
    return foundryJson({
      success: true,
      direction: "th_to_foundry",
      campaign_id: auth.campaignId,
      character_id: characterId,
      foundry_actor_id: input.foundry_actor_id,
      currency: toCurrencyResponse(current),
    });
  }

  if (!input.currency) {
    return foundryJson(
      { error: "currency ist für foundry_to_th erforderlich." },
      { status: 400 },
    );
  }

  const saved = await setCharacterCoinPouch(supabase, characterId, input.currency);
  if (saved.error) {
    return foundryJson({ error: saved.error }, { status: 500 });
  }

  return foundryJson({
    success: true,
    direction: "foundry_to_th",
    campaign_id: auth.campaignId,
    character_id: characterId,
    foundry_actor_id: input.foundry_actor_id,
    currency: toCurrencyResponse(input.currency),
  });
}
