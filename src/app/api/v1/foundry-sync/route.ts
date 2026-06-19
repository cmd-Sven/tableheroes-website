import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[foundry-sync]";

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

type FoundrySyncRow = {
  campaign_id: string;
};

type FoundryCharacterMappingRow = {
  id: string;
  campaign_id: string;
  foundry_actor_id: string;
  character_id: string | null;
};

function getApiKey(request: Request): string | null {
  const raw = request.headers.get("x-tableheroes-api-key");
  const key = raw?.trim();
  return key ? key : null;
}

/** GET = Erreichbarkeit prüfen (Browser, Monitoring). Sync selbst läuft per POST. */
export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!hasUrl || !hasServiceKey) {
    return NextResponse.json(
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
      return NextResponse.json(
        {
          ok: false,
          endpoint: "foundry-sync",
          error: "Datenbankverbindung fehlgeschlagen.",
          detail: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      endpoint: "foundry-sync",
      message: "Bereit. Sync per POST mit Header x-tableheroes-api-key.",
    });
  } catch (e: unknown) {
    console.error(`${LOG_PREFIX} health check exception`, e);
    return NextResponse.json(
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
    return NextResponse.json(
      { error: "Missing API key header: x-tableheroes-api-key" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload validation failed.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  const { data: syncRowRaw, error: syncError } = await (supabase as any)
    .from("foundry_sync")
    .select("campaign_id")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (syncError) {
    console.error(`${LOG_PREFIX} key lookup failed`, syncError);
    return NextResponse.json(
      { error: "Foundry sync key lookup failed." },
      { status: 500 },
    );
  }

  const syncRow = syncRowRaw as FoundrySyncRow | null;
  if (!syncRow?.campaign_id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const campaignId = String(syncRow.campaign_id);
  const actorId = input.foundry_actor_id;

  const { data: mappingRaw, error: mappingError } = await (supabase as any)
    .from("foundry_character_mapping")
    .select("id, campaign_id, foundry_actor_id, character_id")
    .eq("campaign_id", campaignId)
    .eq("foundry_actor_id", actorId)
    .maybeSingle();

  if (mappingError) {
    console.error(`${LOG_PREFIX} mapping lookup failed`, mappingError, {
      campaignId,
      actorId,
    });
    return NextResponse.json(
      { error: "Foundry mapping lookup failed." },
      { status: 500 },
    );
  }

  const mapping = mappingRaw as FoundryCharacterMappingRow | null;

  if (!mapping?.character_id) {
    if (!mapping) {
      const { error: insertError } = await (supabase as any)
        .from("foundry_character_mapping")
        .insert({
          campaign_id: campaignId,
          foundry_actor_id: actorId,
          character_id: null,
        });

      if (insertError) {
        console.error(`${LOG_PREFIX} unmapped insert failed`, insertError, {
          campaignId,
          actorId,
        });
        return NextResponse.json(
          { error: "Unmapped character placeholder could not be created." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        status: "unmapped_character",
        message:
          "Foundry actor ist noch keinem Table-Heroes-Charakter zugeordnet.",
        campaign_id: campaignId,
        foundry_actor_id: actorId,
      },
      { status: 202 },
    );
  }

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
    return NextResponse.json(
      { error: "Character sync update failed." },
      { status: 500 },
    );
  }

  console.info(`${LOG_PREFIX} synced`, {
    campaignId,
    actorId,
    characterId: mapping.character_id,
    level: input.level,
    class: input.class,
    experience_points: input.experience_points,
  });

  return NextResponse.json({
    success: true,
    campaign_id: campaignId,
    character_id: mapping.character_id,
    foundry_actor_id: actorId,
    synced_fields: updatePayload,
  });
}
