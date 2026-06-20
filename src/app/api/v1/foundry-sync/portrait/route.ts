import { z } from "zod";
import { createAdminClient } from "@/src/lib/supabase/server";
import {
  foundryJson,
  foundryOptions,
  getFoundryApiKey,
  resolveFoundryApiCampaign,
} from "@/src/lib/foundry-sync/foundry-api";
import { resolveFoundryCharacterMapping } from "@/src/lib/foundry-sync/resolve-foundry-mapping";
import { uploadCharacterPortraitAdmin, removeCharacterPortraitAdmin } from "@/src/lib/foundry-sync/upload-character-portrait-admin";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[foundry-portrait]";

const jsonPayloadSchema = z
  .object({
    foundry_actor_id: z.string().trim().min(1, "foundry_actor_id fehlt."),
    direction: z.enum(["foundry_to_th", "th_to_foundry"]),
    portrait_url: z.string().url().optional(),
    portrait_base64: z.string().min(1).optional(),
    mime_type: z.string().trim().optional(),
  })
  .strict();

export async function OPTIONS() {
  return foundryOptions();
}

async function loadCharacterPortrait(
  supabase: ReturnType<typeof createAdminClient>,
  characterId: string,
) {
  const { data } = await (supabase as any)
    .from("characters")
    .select("avatar_url, avatar_storage_path, updated_at")
    .eq("id", characterId)
    .maybeSingle();

  const row = data as {
    avatar_url?: string | null;
    avatar_storage_path?: string | null;
    updated_at?: string | null;
  } | null;

  return {
    url: row?.avatar_url != null ? String(row.avatar_url) : null,
    storage_path:
      row?.avatar_storage_path != null ? String(row.avatar_storage_path) : null,
    updated_at: row?.updated_at != null ? String(row.updated_at) : null,
  };
}

/** POST — Portrait synchronisieren (Foundry ↔ Table Heroes). */
export async function POST(request: Request) {
  const apiKey = getFoundryApiKey(request);
  if (!apiKey) {
    return foundryJson(
      { error: "Missing API key header: x-tableheroes-api-key" },
      { status: 401 },
    );
  }

  const supabase = createAdminClient();
  const auth = await resolveFoundryApiCampaign(supabase, apiKey);
  if (!auth.ok) {
    return foundryJson({ error: auth.error }, { status: auth.status });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return foundryJson({ error: "Ungültiges Formular." }, { status: 400 });
    }

    const actorId = String(form.get("foundry_actor_id") ?? "").trim();
    if (!actorId) {
      return foundryJson({ error: "foundry_actor_id fehlt." }, { status: 400 });
    }

    const file = form.get("portrait");
    if (!(file instanceof File) || file.size === 0) {
      return foundryJson({ error: "portrait-Datei fehlt." }, { status: 400 });
    }

    const mappingResult = await resolveFoundryCharacterMapping(
      supabase,
      auth.campaignId,
      actorId,
    );
    if (!mappingResult.ok) {
      return foundryJson(mappingResult.body, { status: mappingResult.status });
    }

    const characterId = mappingResult.characterId;
    const { data: characterRow } = await (supabase as any)
      .from("characters")
      .select("user_id, avatar_storage_path")
      .eq("id", characterId)
      .maybeSingle();

    const userId = String(
      (characterRow as { user_id?: string | null } | null)?.user_id ?? "",
    );
    if (!userId) {
      return foundryJson({ error: "Charakter ohne Besitzer." }, { status: 400 });
    }

    const uploaded = await uploadCharacterPortraitAdmin(supabase, {
      userId,
      characterId,
      file,
    });
    if ("error" in uploaded) {
      return foundryJson({ error: uploaded.error }, { status: 400 });
    }

    const oldPath = (characterRow as { avatar_storage_path?: string | null } | null)
      ?.avatar_storage_path;

    const { error: updateError } = await (supabase as any)
      .from("characters")
      .update({
        avatar_url: uploaded.publicUrl,
        avatar_storage_path: uploaded.path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId)
      .eq("campaign_id", auth.campaignId);

    if (updateError) {
      console.error(`${LOG_PREFIX} character update failed`, updateError);
      return foundryJson({ error: "Portrait konnte nicht gespeichert werden." }, { status: 500 });
    }

    if (oldPath && oldPath !== uploaded.path) {
      await removeCharacterPortraitAdmin(supabase, oldPath).catch(() => undefined);
    }

    return foundryJson({
      success: true,
      direction: "foundry_to_th",
      campaign_id: auth.campaignId,
      character_id: characterId,
      foundry_actor_id: actorId,
      portrait: {
        url: uploaded.publicUrl,
        storage_path: uploaded.path,
        updated_at: new Date().toISOString(),
      },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return foundryJson({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const parsed = jsonPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return foundryJson(
      { error: "Payload validation failed.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
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
    const portrait = await loadCharacterPortrait(supabase, characterId);
    return foundryJson({
      success: true,
      direction: "th_to_foundry",
      campaign_id: auth.campaignId,
      character_id: characterId,
      foundry_actor_id: input.foundry_actor_id,
      portrait,
    });
  }

  if (input.portrait_url) {
    const { error: updateError } = await (supabase as any)
      .from("characters")
      .update({
        avatar_url: input.portrait_url,
        avatar_storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId)
      .eq("campaign_id", auth.campaignId);

    if (updateError) {
      return foundryJson({ error: "Portrait-URL konnte nicht gespeichert werden." }, { status: 500 });
    }

    return foundryJson({
      success: true,
      direction: "foundry_to_th",
      campaign_id: auth.campaignId,
      character_id: characterId,
      foundry_actor_id: input.foundry_actor_id,
      portrait: {
        url: input.portrait_url,
        storage_path: null,
        updated_at: new Date().toISOString(),
      },
    });
  }

  if (input.portrait_base64) {
    const mime = input.mime_type?.trim() || "image/webp";
    let buffer: Buffer;
    try {
      buffer = Buffer.from(input.portrait_base64, "base64");
    } catch {
      return foundryJson({ error: "Ungültiges portrait_base64." }, { status: 400 });
    }

    const blob = new Blob([new Uint8Array(buffer)], { type: mime });
    const { data: characterRow } = await (supabase as any)
      .from("characters")
      .select("user_id, avatar_storage_path")
      .eq("id", characterId)
      .maybeSingle();

    const userId = String(
      (characterRow as { user_id?: string | null } | null)?.user_id ?? "",
    );
    if (!userId) {
      return foundryJson({ error: "Charakter ohne Besitzer." }, { status: 400 });
    }

    const uploaded = await uploadCharacterPortraitAdmin(supabase, {
      userId,
      characterId,
      file: blob,
      fileName: `portrait.${mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "webp"}`,
    });
    if ("error" in uploaded) {
      return foundryJson({ error: uploaded.error }, { status: 400 });
    }

    const oldPath = (characterRow as { avatar_storage_path?: string | null } | null)
      ?.avatar_storage_path;

    const { error: updateError } = await (supabase as any)
      .from("characters")
      .update({
        avatar_url: uploaded.publicUrl,
        avatar_storage_path: uploaded.path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId)
      .eq("campaign_id", auth.campaignId);

    if (updateError) {
      return foundryJson({ error: "Portrait konnte nicht gespeichert werden." }, { status: 500 });
    }

    if (oldPath && oldPath !== uploaded.path) {
      await removeCharacterPortraitAdmin(supabase, oldPath).catch(() => undefined);
    }

    return foundryJson({
      success: true,
      direction: "foundry_to_th",
      campaign_id: auth.campaignId,
      character_id: characterId,
      foundry_actor_id: input.foundry_actor_id,
      portrait: {
        url: uploaded.publicUrl,
        storage_path: uploaded.path,
        updated_at: new Date().toISOString(),
      },
    });
  }

  return foundryJson(
    {
      error:
        "Für foundry_to_th: multipart portrait, portrait_url oder portrait_base64 erforderlich.",
    },
    { status: 400 },
  );
}
