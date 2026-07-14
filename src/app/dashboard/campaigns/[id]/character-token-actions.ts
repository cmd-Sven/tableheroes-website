"use server";

import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { compressImageBufferToWebp } from "@/src/lib/image-compress-server";
import {
  buildConditionTokenEditPrompt,
  getConditionDefinition,
  parseConditionTokensMap,
  type CharacterConditionKey,
  type ConditionTokensMap,
} from "@/src/lib/characters/condition-tokens";

const PROFILE_MEDIA_BUCKET = "profile-media";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function assertCharacterOwner(
  campaignId: string,
  characterId: string,
): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
    token_url: string | null;
    condition_tokens: unknown;
  };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: charRaw } = await (supabase.from("characters") as any)
    .select("id, user_id, campaign_id, name, avatar_url, token_url, condition_tokens")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const character = charRaw as {
    id: string;
    user_id: string | null;
    campaign_id: string;
    name: string;
    avatar_url: string | null;
    token_url: string | null;
    condition_tokens: unknown;
  } | null;

  if (!character) throw new Error("Charakter nicht gefunden.");
  if (character.user_id !== user.id) {
    throw new Error("Du kannst nur deinen eigenen Charakter bearbeiten.");
  }

  return { supabase, userId: user.id, character };
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

export async function generateCharacterConditionToken(input: {
  campaignId: string;
  characterId: string;
  conditionKey: CharacterConditionKey;
}): Promise<{ success: boolean; entry?: ConditionTokensMap[CharacterConditionKey]; error?: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: "OPENAI_API_KEY ist nicht konfiguriert." };
    }

    const def = getConditionDefinition(input.conditionKey);
    if (!def) return { success: false, error: "Unbekannter Zustand." };

    const { supabase, userId, character } = await assertCharacterOwner(
      input.campaignId,
      input.characterId,
    );

    const sourceUrl = (character.token_url || character.avatar_url || "").trim();
    if (!sourceUrl) {
      return {
        success: false,
        error: "Bitte lade zuerst ein Charakterportrait oder Basis-Token hoch.",
      };
    }

    const rawBuffer = await fetchImageBuffer(sourceUrl);
    const pngBuffer = await bufferToPng(rawBuffer);
    const prompt = buildConditionTokenEditPrompt(def, character.name || "Charakter");

    const imageFile = new File([new Uint8Array(pngBuffer)], "source.png", { type: "image/png" });

    const response = await openai.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const first = response.data?.[0];
    let outputBuffer: Buffer | null = null;
    if (first?.b64_json) {
      outputBuffer = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      outputBuffer = await fetchImageBuffer(first.url);
    }
    if (!outputBuffer) {
      return { success: false, error: "Die Bild-KI hat kein Bild zurückgegeben." };
    }

    const compressed = await compressImageBufferToWebp(outputBuffer);
    const path = `${userId}/characters/${input.characterId}/condition-${input.conditionKey}-${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_MEDIA_BUCKET)
      .upload(path, compressed.buffer, {
        contentType: compressed.contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Bild-Upload fehlgeschlagen: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
    const entry = {
      url: urlData.publicUrl,
      storage_path: path,
      is_ai_generated: true,
      generated_at: new Date().toISOString(),
    };

    const existing = parseConditionTokensMap(character.condition_tokens);
    const prev = existing[input.conditionKey];
    if (prev?.storage_path) {
      await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([prev.storage_path]);
    }

    const nextMap = { ...existing, [input.conditionKey]: entry };

    const { error: updateError } = await (supabase.from("characters") as any)
      .update({ condition_tokens: nextMap })
      .eq("id", input.characterId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/dashboard/campaigns/${input.campaignId}`);
    revalidatePath(`/dashboard/characters/${input.characterId}`);

    return { success: true, entry };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "KI-Token-Generierung fehlgeschlagen.";
    return { success: false, error: msg };
  }
}

export async function removeCharacterConditionToken(input: {
  campaignId: string;
  characterId: string;
  conditionKey: CharacterConditionKey;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, character } = await assertCharacterOwner(
      input.campaignId,
      input.characterId,
    );

    const existing = parseConditionTokensMap(character.condition_tokens);
    const prev = existing[input.conditionKey];
    if (!prev) return { success: true };

    if (prev.storage_path) {
      await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([prev.storage_path]);
    }

    const nextMap = { ...existing };
    delete nextMap[input.conditionKey];

    const { error } = await (supabase.from("characters") as any)
      .update({ condition_tokens: nextMap })
      .eq("id", input.characterId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/campaigns/${input.campaignId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}
