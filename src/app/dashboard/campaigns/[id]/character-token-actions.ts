"use server";

import OpenAI, { APIError } from "openai";
import { revalidatePath } from "next/cache";
import { createClient, tryCreateAdminClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { compressImageBufferToWebp } from "@/src/lib/image-compress-server";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  buildConditionTokenEditPrompt,
  getConditionDefinition,
  parseConditionTokensMap,
  type CharacterConditionKey,
  type ConditionTokensMap,
} from "@/src/lib/characters/condition-tokens";

const PROFILE_MEDIA_BUCKET = "profile-media";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CharacterTokenRow = {
  id: string;
  user_id: string | null;
  campaign_id: string;
  name: string;
  avatar_url: string | null;
  token_url: string | null;
  condition_tokens: unknown;
};

async function assertConditionTokenAccess(
  campaignId: string,
  characterId: string,
): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  actorUserId: string;
  storageOwnerId: string;
  character: CharacterTokenRow;
  isGm: boolean;
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
    .select("id, user_id, campaign_id, name, avatar_url, token_url, condition_tokens")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const character = charRaw as CharacterTokenRow | null;
  if (!character) throw new Error("Charakter nicht gefunden.");

  const isOwner = character.user_id === user.id;
  if (!isOwner && !isGm) {
    throw new Error("Keine Berechtigung für Zustands-Token dieses Charakters.");
  }

  const storageOwnerId = character.user_id?.trim() || user.id;

  return {
    supabase,
    actorUserId: user.id,
    storageOwnerId,
    character,
    isGm,
  };
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Quellbild konnte nicht geladen werden.");
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function bufferToPng(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buffer).rotate().resize(1024, 1024, { fit: "cover" }).png().toBuffer();
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const GM_ADMIN_REQUIRED_MSG =
  "Als Spielleiter für fremde Charaktere ist SUPABASE_SERVICE_ROLE_KEY serverseitig erforderlich (Speicher-Upload / Charakter-Update).";

function resolveConditionTokenWriteClient(
  supabase: SupabaseServerClient,
  isGm: boolean,
  actorUserId: string,
  storageOwnerId: string,
): SupabaseServerClient {
  if (!isGm || storageOwnerId === actorUserId) {
    return supabase;
  }
  const admin = tryCreateAdminClient();
  if (!admin) {
    throw new Error(GM_ADMIN_REQUIRED_MSG);
  }
  return admin as unknown as SupabaseServerClient;
}

function formatOpenAiError(error: unknown): string {
  if (error instanceof APIError) {
    const msg = error.message?.trim();
    if (error.status === 401) {
      return "OpenAI API-Key ungültig oder nicht autorisiert.";
    }
    if (error.status === 429) {
      return msg ? `OpenAI Rate-Limit: ${msg}` : "OpenAI Rate-Limit erreicht — bitte später erneut versuchen.";
    }
    if (error.status === 400) {
      return msg ? `OpenAI-Anfrage abgelehnt: ${msg}` : "OpenAI-Anfrage abgelehnt (ungültiges Bild oder Prompt).";
    }
    return msg ? `OpenAI-Fehler (${error.status}): ${msg}` : `OpenAI-Fehler (${error.status}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "KI-Token-Generierung fehlgeschlagen.";
}

async function generateConditionTokenEntry(
  character: CharacterTokenRow,
  storageOwnerId: string,
  conditionKey: CharacterConditionKey,
): Promise<{
  storage_path: string;
  buffer: Buffer;
  contentType: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ist nicht konfiguriert.");
  }

  const def = getConditionDefinition(conditionKey);
  if (!def) throw new Error("Unbekannter Zustand.");

  const sourceUrl = (character.token_url || character.avatar_url || "").trim();
  if (!sourceUrl) {
    throw new Error("Bitte lade zuerst ein Charakterportrait oder Basis-Token hoch.");
  }

  const rawBuffer = await fetchImageBuffer(sourceUrl);
  const pngBuffer = await bufferToPng(rawBuffer);
  const prompt = buildConditionTokenEditPrompt(def, character.name || "Charakter");
  const imageFile = new File([new Uint8Array(pngBuffer)], "source.png", { type: "image/png" });

  let response;
  try {
    response = await openai.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });
  } catch (error) {
    throw new Error(formatOpenAiError(error));
  }

  const first = response.data?.[0];
  let outputBuffer: Buffer | null = null;
  if (first?.b64_json) {
    outputBuffer = Buffer.from(first.b64_json, "base64");
  } else if (first?.url) {
    outputBuffer = await fetchImageBuffer(first.url);
  }
  if (!outputBuffer) {
    throw new Error("Die Bild-KI hat kein Bild zurückgegeben.");
  }

  const compressed = await compressImageBufferToWebp(outputBuffer);
  const path = `${storageOwnerId}/characters/${character.id}/condition-${conditionKey}-${Date.now()}.webp`;

  return {
    storage_path: path,
    buffer: compressed.buffer,
    contentType: compressed.contentType,
  };
}

async function persistConditionToken(
  supabase: SupabaseServerClient,
  character: CharacterTokenRow,
  conditionKey: CharacterConditionKey,
  pending: { storage_path: string; buffer: Buffer; contentType: string },
  opts: { isGm: boolean; actorUserId: string; storageOwnerId: string },
): Promise<NonNullable<ConditionTokensMap[CharacterConditionKey]>> {
  const writeClient = resolveConditionTokenWriteClient(
    supabase,
    opts.isGm,
    opts.actorUserId,
    opts.storageOwnerId,
  );

  const { error: uploadError } = await writeClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(pending.storage_path, pending.buffer, {
      contentType: pending.contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Bild-Upload fehlgeschlagen: ${uploadError.message}`);
  }

  const { data: urlData } = writeClient.storage
    .from(PROFILE_MEDIA_BUCKET)
    .getPublicUrl(pending.storage_path);

  const existing = parseConditionTokensMap(character.condition_tokens);
  const prev = existing[conditionKey];
  if (prev?.storage_path) {
    await writeClient.storage.from(PROFILE_MEDIA_BUCKET).remove([prev.storage_path]);
  }

  const storedEntry = {
    url: urlData.publicUrl,
    storage_path: pending.storage_path,
    is_ai_generated: true,
    generated_at: new Date().toISOString(),
  };

  const nextMap = { ...existing, [conditionKey]: storedEntry };

  const { error: updateError } = await (writeClient.from("characters") as any)
    .update({ condition_tokens: nextMap })
    .eq("id", character.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  character.condition_tokens = nextMap;

  return storedEntry;
}

function revalidateCharacterPaths(campaignId: string, characterId: string) {
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`, "layout");
  revalidatePath(`/dashboard/characters/${characterId}`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}/player-view`);
  revalidatePath(`/dashboard/campaigns/${campaignId}/characters/${characterId}`);
}

export async function generateCharacterConditionToken(input: {
  campaignId: string;
  characterId: string;
  conditionKey: CharacterConditionKey;
}): Promise<{ success: boolean; entry?: ConditionTokensMap[CharacterConditionKey]; error?: string }> {
  try {
    const { supabase, storageOwnerId, character, isGm, actorUserId } =
      await assertConditionTokenAccess(input.campaignId, input.characterId);

    const rawEntry = await generateConditionTokenEntry(
      character,
      storageOwnerId,
      input.conditionKey,
    );
    const entry = await persistConditionToken(supabase, character, input.conditionKey, rawEntry, {
      isGm,
      actorUserId,
      storageOwnerId,
    });

    revalidateCharacterPaths(input.campaignId, input.characterId);
    return { success: true, entry };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "KI-Token-Generierung fehlgeschlagen.";
    return { success: false, error: msg };
  }
}

export async function generateAllCharacterConditionTokens(input: {
  campaignId: string;
  characterId: string;
  /** Nur Zustände ohne bestehendes Token */
  onlyMissing?: boolean;
}): Promise<{
  success: boolean;
  generatedCount: number;
  entries?: ConditionTokensMap;
  errors?: Partial<Record<CharacterConditionKey, string>>;
  error?: string;
}> {
  try {
    const { supabase, storageOwnerId, character, isGm, actorUserId } =
      await assertConditionTokenAccess(input.campaignId, input.characterId);

    const existing = parseConditionTokensMap(character.condition_tokens);
    const keys = CHARACTER_CONDITION_DEFINITIONS.map((d) => d.key).filter((key) =>
      input.onlyMissing === false ? true : !existing[key]?.url,
    );

    if (keys.length === 0) {
      return {
        success: true,
        generatedCount: 0,
        entries: {},
        error: "Alle Zustands-Token sind bereits vorhanden.",
      };
    }

    const entries: ConditionTokensMap = {};
    const errors: Partial<Record<CharacterConditionKey, string>> = {};

    for (const key of keys) {
      try {
        const rawEntry = await generateConditionTokenEntry(character, storageOwnerId, key);
        const entry = await persistConditionToken(supabase, character, key, rawEntry, {
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
    const msg = e instanceof Error ? e.message : "KI-Token-Generierung fehlgeschlagen.";
    return { success: false, generatedCount: 0, error: msg };
  }
}

export async function removeCharacterConditionToken(input: {
  campaignId: string;
  characterId: string;
  conditionKey: CharacterConditionKey;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, character, isGm, actorUserId, storageOwnerId } =
      await assertConditionTokenAccess(input.campaignId, input.characterId);

    const writeClient = resolveConditionTokenWriteClient(
      supabase,
      isGm,
      actorUserId,
      storageOwnerId,
    );

    const existing = parseConditionTokensMap(character.condition_tokens);
    const prev = existing[input.conditionKey];
    if (!prev) return { success: true };

    if (prev.storage_path) {
      await writeClient.storage.from(PROFILE_MEDIA_BUCKET).remove([prev.storage_path]);
    }

    const nextMap = { ...existing };
    delete nextMap[input.conditionKey];

    const { error } = await (writeClient.from("characters") as any)
      .update({ condition_tokens: nextMap })
      .eq("id", input.characterId);

    if (error) return { success: false, error: error.message };

    revalidateCharacterPaths(input.campaignId, input.characterId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}
