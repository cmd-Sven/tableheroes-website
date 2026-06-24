import { z } from "zod";
import { createAdminClient } from "@/src/lib/supabase/server";
import {
  foundryJson,
  foundryOptions,
  getFoundryApiKey,
  resolveFoundryApiCampaign,
} from "@/src/lib/foundry-sync/foundry-api";
import { resolveFoundryCharacterMapping } from "@/src/lib/foundry-sync/resolve-foundry-mapping";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[foundry-sync]";

export async function OPTIONS() {
  return foundryOptions();
}

const payloadSchema = z
  .object({
    foundry_actor_id: z.string().trim().min(1, "foundry_actor_id fehlt."),
    class: z.string().trim().min(1, "class fehlt."),
    level: z.coerce.number().int().nonnegative("level muss >= 0 sein."),
    experience_points: z.coerce
      .number()
      .int()
      .nonnegative("experience_points muss >= 0 sein."),
  })
  .strict();

function getApiKey(request: Request): string | null {
  return getFoundryApiKey(request);
}

/** GET = Erreichbarkeit prüfen (Browser, Monitoring). Sync selbst läuft per POST. */
export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasUrl || !hasServiceKey) {
    return foundryJson(
      {
        ok: false,
        endpoint: "foundry-sync",
        error: "Server-Konfiguration unvollständig.",
        config: {
          supabaseUrl: hasUrl,
          serviceRoleKey: hasServiceKey,
        },
      },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { error } = await (supabase as any)
      .from("foundry_sync")
      .select("id")
      .limit(1);

    if (error) {
      console.error(`${LOG_PREFIX} health check failed`, error);
      return foundryJson(
        {
          ok: false,
          endpoint: "foundry-sync",
          error: "Datenbankverbindung fehlgeschlagen.",
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return foundryJson({
      ok: true,
      endpoint: "foundry-sync",
      message:
        "Bereit. POST = XP-Sync, GET /profile = Punkte & Achievements, POST /wealth = Geldbörse, POST /portrait = Portrait.",
    });
  } catch (e: unknown) {
    console.error(`${LOG_PREFIX} health check exception`, e);
    return foundryJson(
      {
        ok: false,
        endpoint: "foundry-sync",
        error: e instanceof Error ? e.message : "Unbekannter Fehler",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const apiKey = getApiKey(request);
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
      {
        error: "Payload validation failed.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();
  const auth = await resolveFoundryApiCampaign(supabase, apiKey);
  if (!auth.ok) {
    return foundryJson({ error: auth.error }, { status: auth.status });
  }

  const campaignId = auth.campaignId;
  const actorId = input.foundry_actor_id;

  const resolved = await resolveFoundryCharacterMapping(supabase, campaignId, actorId);
  if (!resolved.ok) {
    return foundryJson(resolved.body, { status: resolved.status });
  }

  const mapping = resolved.mapping;

  const updatePayload = {
    level: input.level,
    class: input.class,
    experience_points: input.experience_points,
  };

  const { error: characterUpdateError } = await (supabase as any)
    .from("characters")
    .update(updatePayload)
    .eq("id", mapping.character_id)
    .eq("campaign_id", campaignId);

  if (characterUpdateError) {
    console.error(`${LOG_PREFIX} character update failed`, characterUpdateError, {
      campaignId,
      actorId,
      characterId: mapping.character_id,
    });
    return foundryJson({ error: "Character sync update failed." }, { status: 500 });
  }

  console.info(`${LOG_PREFIX} synced`, {
    campaignId,
    actorId,
    characterId: mapping.character_id,
    level: input.level,
    class: input.class,
    experience_points: input.experience_points,
  });

  return foundryJson({
    success: true,
    campaign_id: campaignId,
    character_id: mapping.character_id,
    foundry_actor_id: actorId,
    synced_fields: updatePayload,
  });
}
