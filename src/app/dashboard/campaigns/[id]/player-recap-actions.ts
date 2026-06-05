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
  const existing = parsePlayerRecapRecord(archive.player_recap);
  if (!existing) {
    throw new Error("Kein Entwurf vorhanden. Bitte zuerst generieren.");
  }

  const record: PlayerRecapRecord = {
    status: "draft",
    published_at: null,
    recap: {
      ...existing.recap,
      summary_md: summaryMd.trim(),
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
    throw new Error("Kein Entwurf vorhanden.");
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
