import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { isDnd5eCampaignSystem } from "@/src/lib/characters/dnd5e/formulas";
import {
  buildCharacterTuvSnapshot,
  parseCharacterTuvState,
  type CharacterTuvSheetSnapshot,
} from "@/src/lib/characters/dnd5e/character-tuv";
import { runCharacterTuvInspection } from "@/src/lib/characters/dnd5e/character-tuv-ai";
import { normalizeCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  campaignId?: string;
  characterId?: string;
  snapshot?: CharacterTuvSheetSnapshot;
  /** Alternativ: Rohdaten zum Bau des Snapshots */
  meta?: {
    name?: string;
    className?: string | null;
    subclass?: string | null;
    race?: string | null;
    background?: string | null;
    level?: number;
    experiencePoints?: number;
  };
  sheet?: CharacterTuvSheetSnapshot["sheet"] & {
    features?: Array<{
      name: string;
      nameDe?: string | null;
      nameEn?: string | null;
      source?: string | null;
    }>;
  };
  derived?: unknown;
  locale?: string;
};

async function assertCanAccessCharacter(
  campaignId: string,
  characterId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, message: "Nicht authentifiziert." };
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, system")
    .eq("id", campaignId)
    .maybeSingle();
  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
    system?: string | null;
  } | null;
  if (!campaign) {
    return { ok: false, status: 404, message: "Kampagne nicht gefunden." };
  }
  if (!isDnd5eCampaignSystem(String(campaign.system ?? ""))) {
    return { ok: false, status: 400, message: "Nur für D&D-5e-Kampagnen." };
  }

  const isGm = isCampaignGm(campaign, user.id);
  const { data: charRaw } = await (supabase.from("characters") as any)
    .select("id, user_id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  const character = charRaw as { id: string; user_id: string | null } | null;
  if (!character) {
    return { ok: false, status: 404, message: "Charakter nicht gefunden." };
  }
  if (!isGm && character.user_id !== user.id) {
    return { ok: false, status: 403, message: "Keine Berechtigung." };
  }
  return { ok: true };
}

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const campaignId = String(body.campaignId ?? "").trim();
  const characterId = String(body.characterId ?? "").trim();
  if (!campaignId || !characterId) {
    return NextResponse.json(
      { error: "campaignId und characterId sind erforderlich." },
      { status: 400 },
    );
  }

  const access = await assertCanAccessCharacter(campaignId, characterId);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const locale = normalizeCharacterSheetLocale(body.locale);

  let snapshot: CharacterTuvSheetSnapshot;
  if (body.snapshot && typeof body.snapshot === "object") {
    snapshot = { ...body.snapshot, locale: body.snapshot.locale ?? locale };
  } else if (body.sheet && body.meta) {
    const prev = parseCharacterTuvState(
      (body.sheet as { characterInspection?: unknown }).characterInspection,
    );
    snapshot = buildCharacterTuvSnapshot({
      name: String(body.meta.name ?? "Charakter"),
      className: body.meta.className ?? null,
      subclass: body.meta.subclass ?? null,
      race: body.meta.race ?? null,
      background: body.meta.background ?? null,
      level: Math.max(1, Math.floor(Number(body.meta.level) || 1)),
      experiencePoints: Math.max(0, Math.floor(Number(body.meta.experiencePoints) || 0)),
      sheet: body.sheet,
      derived: body.derived ?? {},
      previousAnswers: prev?.answers,
      previousFindings: prev?.findings,
      locale,
    });
  } else {
    return NextResponse.json(
      { error: "snapshot oder (sheet + meta) erforderlich." },
      { status: 400 },
    );
  }

  try {
    const result = await runCharacterTuvInspection(snapshot);
    return NextResponse.json({ success: true, inspection: result });
  } catch (e: unknown) {
    console.error("[character-tuv]", e);
    const message =
      e instanceof Error ? e.message : "Charakter-TÜV fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
