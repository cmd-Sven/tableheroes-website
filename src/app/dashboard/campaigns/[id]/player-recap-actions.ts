"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  buildPlayerRecapPayload,
  loadPlayerRecapBuildInput,
} from "@/src/lib/session-chronicle/player-recap-build";
import { parsePlayerRecapRecord } from "@/src/lib/session-chronicle/parse-db";
import type { PlayerRecapRecord } from "@/src/lib/session-chronicle/player-recap-types";
import { isRecapSummaryPlaceholder, buildRecapStarterMarkdown } from "@/src/lib/session-chronicle/player-recap-starter";

async function loadArchiveForGm(archiveId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: archiveRaw } = await (supabase.from("session_archives") as any)
    .select("*")
    .eq("id", archiveId)
    .single();

  const archive = archiveRaw as {
    id: string;
    campaign_id: string;
    session_id: string | null;
    session_name?: string | null;
    encountered_npcs: unknown;
    visited_locations: unknown;
    player_recap: unknown;
  } | null;

  if (!archive) throw new Error("Archiv nicht gefunden.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", archive.campaign_id)
    .single();

  if (!isCampaignGm(campaignRaw as { gm_id?: string; owner_id?: string }, user.id)) {
    throw new Error("Nur der GM kann die Spieler-Chronik bearbeiten.");
  }

  return { supabase, archive, userId: user.id };
}

export async function seedPlayerRecapDraftForArchive(
  supabase: { from: (t: string) => any },
  archive: {
    id: string;
    campaign_id: string;
    session_id: string | null;
    encountered_npcs: unknown;
    visited_locations: unknown;
  },
): Promise<PlayerRecapRecord | null> {
  if (!archive.session_id) return null;

  const buildInput = await loadPlayerRecapBuildInput(
    supabase,
    archive.campaign_id,
    archive.session_id,
    {
      encountered_npcs: (archive.encountered_npcs as Array<{ id?: string; name?: string }>) ?? [],
      visited_locations: (archive.visited_locations as Array<{ id?: string; name?: string }>) ?? [],
    },
  );

  const recap = buildPlayerRecapPayload(buildInput);
  const record: PlayerRecapRecord = {
    status: "draft",
    published_at: null,
    recap,
  };

  await (supabase.from("session_archives") as any)
    .update({ player_recap: record })
    .eq("id", archive.id);

  return record;
}

export async function getPlayerRecapEditorMeta(archiveId: string) {
  const { supabase, archive } = await loadArchiveForGm(archiveId);

  let hasChronistRecap = false;
  let chronistRecapLength = 0;

  if (archive.session_id) {
    const { data: stateRaw } = await (supabase as any)
      .from("session_chronicle_state")
      .select("story_recap")
      .eq("session_id", archive.session_id)
      .maybeSingle();
    const story = String((stateRaw as { story_recap?: string } | null)?.story_recap ?? "").trim();
    hasChronistRecap = story.length > 0;
    chronistRecapLength = story.length;
  }

  return {
    sessionId: archive.session_id,
    sessionName: archive.session_name ?? null,
    hasChronistRecap,
    chronistRecapLength,
  };
}

export async function getRecapStarterText(archiveId: string): Promise<string> {
  const { supabase, archive } = await loadArchiveForGm(archiveId);
  if (!archive.session_id) {
    return buildRecapStarterMarkdown({
      visitedLocations: (archive.visited_locations as Array<{ name?: string }>) ?? [],
      encounteredNpcs: (archive.encountered_npcs as Array<{ name?: string }>) ?? [],
    });
  }

  const buildInput = await loadPlayerRecapBuildInput(
    supabase,
    archive.campaign_id,
    archive.session_id,
    {
      encountered_npcs: (archive.encountered_npcs as Array<{ id?: string; name?: string }>) ?? [],
      visited_locations: (archive.visited_locations as Array<{ id?: string; name?: string }>) ?? [],
    },
  );

  return buildRecapStarterMarkdown({
    chronicleStoryRecap: buildInput.chronicleState?.story_recap,
    visitedLocations: buildInput.visitedLocations,
    encounteredNpcs: buildInput.encounteredNpcs,
  });
}

export async function generatePlayerRecapDraft(archiveId: string) {
  const { supabase, archive } = await loadArchiveForGm(archiveId);
  if (!archive.session_id) {
    throw new Error("Keine Session-ID am Archiv — Entwurf nicht möglich.");
  }

  const record = await seedPlayerRecapDraftForArchive(supabase, archive);
  revalidatePath(`/dashboard/campaigns/${archive.campaign_id}`);
  return { ok: true as const, record };
}

export async function savePlayerRecapDraft(archiveId: string, summaryMd: string) {
  const { supabase, archive } = await loadArchiveForGm(archiveId);
  const trimmed = summaryMd.trim();
  if (trimmed.length < 20) {
    throw new Error("Bitte schreibe mindestens ein paar Sätze für den Spieler-Recap.");
  }

  let existing = parsePlayerRecapRecord(archive.player_recap);

  if (!existing) {
    if (!archive.session_id) {
      throw new Error("Keine Session-ID am Archiv — Entwurf nicht möglich.");
    }
    const seeded = await seedPlayerRecapDraftForArchive(supabase, {
      id: archive.id,
      campaign_id: archive.campaign_id,
      session_id: archive.session_id,
      encountered_npcs: archive.encountered_npcs,
      visited_locations: archive.visited_locations,
    });
    if (!seeded) throw new Error("Entwurf konnte nicht angelegt werden.");
    existing = seeded;
  }

  const record: PlayerRecapRecord = {
    status: "draft",
    published_at: null,
    recap: {
      ...existing.recap,
      summary_md: trimmed,
      generated_at: new Date().toISOString(),
    },
  };

  const { error } = await (supabase.from("session_archives") as any)
    .update({ player_recap: record })
    .eq("id", archiveId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${archive.campaign_id}`);
  return { ok: true as const, record };
}

export async function publishPlayerRecap(archiveId: string) {
  const { supabase, archive } = await loadArchiveForGm(archiveId);
  const existing = parsePlayerRecapRecord(archive.player_recap);
  if (!existing) {
    throw new Error("Kein Entwurf vorhanden — bitte zuerst speichern.");
  }
  if (isRecapSummaryPlaceholder(existing.recap.summary_md)) {
    throw new Error("Bitte schreibe zuerst einen Recap-Text.");
  }

  const publishedAt = new Date().toISOString();
  const record: PlayerRecapRecord = {
    status: "published",
    published_at: publishedAt,
    recap: {
      ...existing.recap,
      generated_at: publishedAt,
    },
  };

  const { error } = await (supabase.from("session_archives") as any)
    .update({ player_recap: record })
    .eq("id", archiveId);

  if (error) throw new Error(error.message);

  const sessionTitle =
    archive.session_name?.trim() ||
    (archive.session_id ? "Letzte Session" : "Session-Recap");
  const { dispatchDiscordNotify, notifyPlayerRecapPublished } = await import(
    "@/src/lib/integrations/discord/notify"
  );
  dispatchDiscordNotify(() =>
    notifyPlayerRecapPublished({
      campaignId: archive.campaign_id,
      sessionTitle,
      summaryMd: existing.recap.summary_md,
    }),
  );

  revalidatePath(`/dashboard/campaigns/${archive.campaign_id}`);
  return { ok: true as const, record };
}

export async function importChronistSummaryIntoRecap(archiveId: string, mode: "replace" | "append" = "replace") {
  const { supabase, archive } = await loadArchiveForGm(archiveId);
  if (!archive.session_id) {
    throw new Error("Keine Session-ID — Chronist-Daten nicht verknüpft.");
  }

  const buildInput = await loadPlayerRecapBuildInput(
    supabase,
    archive.campaign_id,
    archive.session_id,
    {
      encountered_npcs: (archive.encountered_npcs as Array<{ id?: string; name?: string }>) ?? [],
      visited_locations: (archive.visited_locations as Array<{ id?: string; name?: string }>) ?? [],
    },
  );

  const chronistText = buildInput.chronicleState?.story_recap?.trim();
  if (!chronistText) {
    throw new Error(
      "Für diese Session gibt es noch keinen Chronist-Text. Öffne den Chronist und warte auf die Audio-Auswertung — oder schreibe den Recap manuell.",
    );
  }

  let existing = parsePlayerRecapRecord(archive.player_recap);
  if (!existing) {
    const seeded = await seedPlayerRecapDraftForArchive(supabase, archive);
    if (!seeded) throw new Error("Entwurf konnte nicht angelegt werden.");
    existing = seeded;
  }

  const current = existing.recap.summary_md.trim();
  const nextSummary =
    mode === "append" && current && !isRecapSummaryPlaceholder(current)
      ? `${current}\n\n---\n\n${chronistText}`
      : chronistText;

  const record: PlayerRecapRecord = {
    status: "draft",
    published_at: null,
    recap: {
      ...existing.recap,
      summary_md: nextSummary,
      generated_at: new Date().toISOString(),
    },
  };

  const { error } = await (supabase.from("session_archives") as any)
    .update({ player_recap: record })
    .eq("id", archiveId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${archive.campaign_id}`);
  return { ok: true as const, record };
}

export async function unpublishPlayerRecap(archiveId: string) {
  const { supabase, archive } = await loadArchiveForGm(archiveId);
  const existing = parsePlayerRecapRecord(archive.player_recap);
  if (!existing) throw new Error("Keine Spieler-Chronik vorhanden.");

  const record: PlayerRecapRecord = {
    status: "draft",
    published_at: null,
    recap: existing.recap,
  };

  const { error } = await (supabase.from("session_archives") as any)
    .update({ player_recap: record })
    .eq("id", archiveId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/campaigns/${archive.campaign_id}`);
  return { ok: true as const, record };
}
