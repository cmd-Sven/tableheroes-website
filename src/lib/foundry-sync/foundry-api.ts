import { NextResponse } from "next/server";

export const FOUNDRY_API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-tableheroes-api-key",
};

export function foundryJson(
  body: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status,
    headers: FOUNDRY_API_CORS_HEADERS,
  });
}

export function foundryOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: FOUNDRY_API_CORS_HEADERS });
}

export function getFoundryApiKey(request: Request): string | null {
  const raw = request.headers.get("x-tableheroes-api-key");
  const key = raw?.trim();
  return key ? key : null;
}

export type FoundryApiCampaignContext = {
  campaignId: string;
};

export async function resolveFoundryApiCampaign(
  supabase: { from: (table: string) => unknown },
  apiKey: string,
): Promise<
  | { ok: true; campaignId: string }
  | { ok: false; status: number; error: string }
> {
  const { data: syncRowRaw, error: syncError } = await (supabase as any)
    .from("foundry_sync")
    .select("campaign_id")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (syncError) {
    return { ok: false, status: 500, error: "Foundry sync key lookup failed." };
  }

  const campaignId = String((syncRowRaw as { campaign_id?: string } | null)?.campaign_id ?? "");
  if (!campaignId) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  return { ok: true, campaignId };
}
