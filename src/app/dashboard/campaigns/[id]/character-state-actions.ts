"use server";

import OpenAI, { APIError } from "openai";
import { revalidatePath } from "next/cache";
import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { compressImageBufferToWebp, toStorageUploadBody } from "@/src/lib/image-compress-server";
import {
  parseActiveConditions,
  type CharacterConditionKey,
} from "@/src/lib/characters/condition-tokens";
import {
  buildMoodTokenEditPrompt,
  getMoodDefinition,
  MOOD_STATE_KEYS,
  normalizeMoodState,
  parseMoodTokensMap,
  type MoodStateKey,
  type MoodTokensMap,
} from "@/src/lib/characters/mood-states";

const PROFILE_MEDIA_BUCKET = "profile-media";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CharacterStateRow = {
  id: string;
  user_id: string | null;
  campaign_id: string;
  name: string;
  avatar_url: string | null;
  token_url: string | null;
  mood_state: string | null;
  mood_tokens: unknown;
  active_conditions: unknown;
};

async function assertCharacterStateAccess(
  campaignId: string,
  characterId: string,
): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  actorUserId: string;
  storageOwnerId: string;
  character: CharacterStateRow;
  isGm: boolean;
  isOwner: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as { gm_id?: string | null; owner_id?: string | null } | null;
  if (!campaign) throw new Error("Kampagne nicht gefunden.");

  const isGm = isCampaignGm(campaign, user.id);

  const { data: charRaw } = await (supabase.from("characters") as any)
    .select(
      "id, user_id, campaign_id, name, avatar_url, token_url, mood_state, mood_tokens, active_conditions",
    )
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const character = charRaw as CharacterStateRow | null;
  if (!character) throw new Error("Charakter nicht gefunden.");

  const isOwner = character.user_id === user.id;
  if (!isOwner && !isGm) {
    throw new Error("Keine Berechtigung für diesen Charakter.");
  }

  return {
    supabase,
    actorUserId: user.id,
    storageOwnerId: character.user_id?.trim() || user.id,
    character,
    isGm,
    isOwner,
  };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const GM_ADMIN_REQUIRED_MSG =
  "Als Spielleiter für fremde Charaktere ist SUPABASE_SERVICE_ROLE_KEY serverseitig erforderlich.";

function resolveWriteClient(
  supabase: SupabaseServerClient,
  isGm: boolean,
  actorUserId: string,
  storageOwnerId: string,
): SupabaseServerClient {
  if (!isGm || storageOwnerId === actorUserId) return supabase;
  const admin = tryCreateAdminClient();
  if (!admin) throw new Error(GM_ADMIN_REQUIRED_MSG);
  return admin as unknown as SupabaseServerClient;
}

function revalidateCharacterPaths(campaignId: string, characterId: string) {
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`, "layout");
  revalidatePath(`/dashboard/characters/${characterId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}/player-view`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}`);
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Quellbild konnte nicht geladen werden.");
  return Buffer.from(await res.arrayBuffer());
}

function decodeOpenAiImageBuffer(first: {
  b64_json?: string | null;
  url?: string | null;
}): Buffer {
  if (first.b64_json?.trim()) {
    let b64 = first.b64_json.trim();
    const dataPrefix = b64.indexOf("base64,");
    if (dataPrefix !== -1) b64 = b64.slice(dataPrefix + "base64,".length);
    b64 = b64.replace(/\s/g, "");
    const decoded = Buffer.from(b64, "base64");
    if (decoded.length === 0) throw new Error("OpenAI lieferte leere Bilddaten.");
    return decoded;
  }
  throw new Error("OpenAI lieferte kein Bild (b64_json fehlt).");
}

async function bufferToPng(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buffer).rotate().resize(1024, 1024, { fit: "cover" }).png().toBuffer();
}

function formatOpenAiError(error: unknown): string {
  if (error instanceof APIError) {
    const msg = error.message?.trim();
    if (error.status === 401) return "OpenAI API-Key ungültig oder nicht autorisiert.";
    if (error.status === 429) {
      return msg ? `OpenAI Rate-Limit: ${msg}` : "OpenAI Rate-Limit erreicht.";
    }
    return msg ? `OpenAI-Fehler (${error.status}): ${msg}` : `OpenAI-Fehler (${error.status}).`;
  }
  if (error instanceof Error) return error.message;
  return "KI-Token-Generierung fehlgeschlagen.";
}

async function generateMoodTokenEntry(
  character: CharacterStateRow,
  storageOwnerId: string,
  moodKey: MoodStateKey,
): Promise<{ storage_path: string; buffer: Buffer; contentType: string }> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ist nicht konfiguriert.");

  const def = getMoodDefinition(moodKey);
  if (!def) throw new Error("Unbekannter Gemütszustand.");

  const sourceUrl = (character.token_url || character.avatar_url || "").trim();
  if (!sourceUrl) throw new Error("Bitte lade zuerst ein Charakterportrait oder Basis-Token hoch.");

  const rawBuffer = await fetchImageBuffer(sourceUrl);
  const pngBuffer = await bufferToPng(rawBuffer);
  const prompt = buildMoodTokenEditPrompt(def, character.name || "Charakter");
  const imageFile = new File([new Uint8Array(pngBuffer)], "source.png", { type: "image/png" });

  let response;
  try {
    response = await openai.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1024",
      output_format: "png",
    });
  } catch (error) {
    throw new Error(formatOpenAiError(error));
  }

  const first = response.data?.[0];
  let outputBuffer: Buffer | null = null;
  try {
    outputBuffer = decodeOpenAiImageBuffer(first ?? {});
  } catch {
    if (first?.url) outputBuffer = await fetchImageBuffer(first.url);
  }
  if (!outputBuffer) throw new Error("Die Bild-KI hat kein Bild zurückgegeben.");

  const compressed = await compressImageBufferToWebp(outputBuffer);
  const path = `${storageOwnerId}/characters/${character.id}/mood-${moodKey}-${Date.now()}.webp`;
  return { storage_path: path, buffer: compressed.buffer, contentType: compressed.contentType };
}

export async function loadCharacterStateData(input: {
  campaignId: string;
  characterId: string;
}): Promise<{
  success: boolean;
  moodState: MoodStateKey | null;
  moodTokens: MoodTokensMap;
  activeConditions: CharacterConditionKey[];
  error?: string;
}> {
  try {
    const { character } = await assertCharacterStateAccess(input.campaignId, input.characterId);
    return {
      success: true,
      moodState: normalizeMoodState(character.mood_state),
      moodTokens: parseMoodTokensMap(character.mood_tokens),
      activeConditions: parseActiveConditions(character.active_conditions),
    };
  } catch (e: unknown) {
    return {
      success: false,
      moodState: null,
      moodTokens: {},
      activeConditions: [],
      error: e instanceof Error ? e.message : "Zustände konnten nicht geladen werden.",
    };
  }
}

export async function setCharacterMoodState(input: {
  campaignId: string;
  characterId: string;
  moodKey: MoodStateKey | null;
}): Promise<{ success: boolean; moodState: MoodStateKey | null; error?: string }> {
  try {
    const { supabase, character, isOwner, isGm, actorUserId, storageOwnerId } =
      await assertCharacterStateAccess(input.campaignId, input.characterId);
    if (!isOwner && !isGm) {
      throw new Error("Nur Spieler oder Spielleiter können den Gemütszustand setzen.");
    }

    const nextMood =
      input.moodKey && MOOD_STATE_KEYS.includes(input.moodKey) ? input.moodKey : null;

    const writeClient = resolveWriteClient(supabase, isGm, actorUserId, storageOwnerId);

    const { error } = await (writeClient.from("characters") as any)
      .update({ mood_state: nextMood })
      .eq("id", character.id);

    if (error) throw new Error(error.message);

    revalidateCharacterPaths(input.campaignId, input.characterId);
    return { success: true, moodState: nextMood };
  } catch (e: unknown) {
    return {
      success: false,
      moodState: null,
      error: e instanceof Error ? e.message : "Gemütszustand konnte nicht gespeichert werden.",
    };
  }
}

async function persistMoodToken(
  supabase: SupabaseServerClient,
  character: CharacterStateRow,
  moodKey: MoodStateKey,
  pending: { storage_path: string; buffer: Buffer; contentType: string },
  opts: { isGm: boolean; actorUserId: string; storageOwnerId: string },
): Promise<NonNullable<MoodTokensMap[MoodStateKey]>> {
  const writeClient = resolveWriteClient(supabase, opts.isGm, opts.actorUserId, opts.storageOwnerId);

  const { error: uploadError } = await writeClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(
      pending.storage_path,
      toStorageUploadBody(pending.buffer, pending.contentType),
      { contentType: pending.contentType, cacheControl: "31536000", upsert: false },
    );
  if (uploadError) throw new Error(`Bild-Upload fehlgeschlagen: ${uploadError.message}`);

  const { data: urlData } = writeClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .getPublicUrl(pending.storage_path);

  const existing = parseMoodTokensMap(character.mood_tokens);
  const prev = existing[moodKey];
  if (prev?.storage_path) {
    await writeClient.storage.from(PROFILE_MEDIA_BUCKET).remove([prev.storage_path]);
  }

  const storedEntry = {
    url: urlData.publicUrl,
    storage_path: pending.storage_path,
    is_ai_generated: true,
    generated_at: new Date().toISOString(),
  };

  const nextMap = { ...existing, [moodKey]: storedEntry };
  const { error: updateError } = await (writeClient.from("characters") as any)
    .update({ mood_tokens: nextMap })
    .eq("id", character.id);
  if (updateError) throw new Error(updateError.message);

  character.mood_tokens = nextMap;
  return storedEntry;
}

export async function generateCharacterMoodToken(input: {
  campaignId: string;
  characterId: string;
  moodKey: MoodStateKey;
}): Promise<{ success: boolean; entry?: MoodTokensMap[MoodStateKey]; error?: string }> {
  try {
    const access = await assertCharacterStateAccess(input.campaignId, input.characterId);
    const { supabase, storageOwnerId, character, isGm, actorUserId } = access;

    const rawEntry = await generateMoodTokenEntry(character, storageOwnerId, input.moodKey);
    const storedEntry = await persistMoodToken(supabase, character, input.moodKey, rawEntry, {
      isGm,
      actorUserId,
      storageOwnerId,
    });

    revalidateCharacterPaths(input.campaignId, input.characterId);
    return { success: true, entry: storedEntry };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "KI-Token-Generierung fehlgeschlagen.",
    };
  }
}

export async function generateAllCharacterMoodTokens(input: {
  campaignId: string;
  characterId: string;
  onlyMissing?: boolean;
}): Promise<{
  success: boolean;
  generatedCount: number;
  entries?: MoodTokensMap;
  errors?: Partial<Record<MoodStateKey, string>>;
  error?: string;
}> {
  try {
    const { supabase, storageOwnerId, character, isGm, actorUserId } =
      await assertCharacterStateAccess(input.campaignId, input.characterId);

    const existing = parseMoodTokensMap(character.mood_tokens);
    const keys = MOOD_STATE_KEYS.filter((key) =>
      input.onlyMissing === false ? true : !existing[key]?.url,
    );

    if (keys.length === 0) {
      return {
        success: true,
        generatedCount: 0,
        entries: {},
        error: "Alle Gemütszustands-Token sind bereits vorhanden.",
      };
    }

    const entries: MoodTokensMap = {};
    const errors: Partial<Record<MoodStateKey, string>> = {};

    for (const key of keys) {
      try {
        const rawEntry = await generateMoodTokenEntry(character, storageOwnerId, key);
        const entry = await persistMoodToken(supabase, character, key, rawEntry, {
          isGm,
          actorUserId,
          storageOwnerId,
        });
        entries[key] = entry;
      } catch (e: unknown) {
        errors[key] = e instanceof Error ? e.message : "Generierung fehlgeschlagen.";
      }
    }

    revalidateCharacterPaths(input.campaignId, input.characterId);

    return {
      success: Object.keys(errors).length === 0,
      generatedCount: Object.keys(entries).length,
      entries,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  } catch (e: unknown) {
    return {
      success: false,
      generatedCount: 0,
      error: e instanceof Error ? e.message : "KI-Token-Generierung fehlgeschlagen.",
    };
  }
}

export async function setCharacterActiveConditions(input: {
  campaignId: string;
  characterId: string;
  conditions: CharacterConditionKey[];
}): Promise<{ success: boolean; activeConditions: CharacterConditionKey[]; error?: string }> {
  try {
    const { supabase, character, isGm, actorUserId, storageOwnerId } =
      await assertCharacterStateAccess(input.campaignId, input.characterId);

    if (!isGm) {
      throw new Error("Nur der Spielleiter kann aktive Zustände setzen.");
    }

    const normalized = parseActiveConditions(input.conditions);
    const writeClient = resolveWriteClient(supabase, isGm, actorUserId, storageOwnerId);

    const { error } = await (writeClient.from("characters") as any)
      .update({ active_conditions: normalized })
      .eq("id", character.id);
    if (error) throw new Error(error.message);

    revalidateCharacterPaths(input.campaignId, input.characterId);
    return { success: true, activeConditions: normalized };
  } catch (e: unknown) {
    return {
      success: false,
      activeConditions: [],
      error: e instanceof Error ? e.message : "Aktive Zustände konnten nicht gespeichert werden.",
    };
  }
}

export async function toggleCharacterActiveCondition(input: {
  campaignId: string;
  characterId: string;
  conditionKey: CharacterConditionKey;
}): Promise<{ success: boolean; activeConditions: CharacterConditionKey[]; error?: string }> {
  try {
    const { character } = await assertCharacterStateAccess(input.campaignId, input.characterId);
    const current = parseActiveConditions(character.active_conditions);
    const has = current.includes(input.conditionKey);
    const next = has
      ? current.filter((k) => k !== input.conditionKey)
      : [...current, input.conditionKey];
    return setCharacterActiveConditions({
      campaignId: input.campaignId,
      characterId: input.characterId,
      conditions: next,
    });
  } catch (e: unknown) {
    return {
      success: false,
      activeConditions: [],
      error: e instanceof Error ? e.message : "Zustand konnte nicht umgeschaltet werden.",
    };
  }
}

/**
 * Setzt einen SL-Zustand (ohne Toggle) — z. B. nach fehlgeschlagenem Fallen-Save.
 * Der neue Zustand wird an den Anfang gestellt (primäres Avatar-Token).
 */
export async function addCharacterActiveCondition(input: {
  campaignId: string;
  characterId: string;
  conditionKey: CharacterConditionKey;
}): Promise<{ success: boolean; activeConditions: CharacterConditionKey[]; error?: string }> {
  try {
    const { character } = await assertCharacterStateAccess(input.campaignId, input.characterId);
    const current = parseActiveConditions(character.active_conditions);
    const without = current.filter((k) => k !== input.conditionKey);
    const next = [input.conditionKey, ...without];
    return setCharacterActiveConditions({
      campaignId: input.campaignId,
      characterId: input.characterId,
      conditions: next,
    });
  } catch (e: unknown) {
    return {
      success: false,
      activeConditions: [],
      error: e instanceof Error ? e.message : "Zustand konnte nicht gesetzt werden.",
    };
  }
}
