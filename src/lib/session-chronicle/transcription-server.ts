import { isCampaignGm } from "@/src/lib/campaign-gm";
import { createAdminClient } from "@/src/lib/supabase/server";
import {
  AUDIO_CHUNK_DURATION_MS,
  AUDIO_CHUNK_OVERLAP_MS,
  JITSI_ROOM_URL,
  SESSION_AUDIO_BUCKET,
  type TranscriptionMode,
} from "./constants";
import { emptyChronicleState } from "./types";
import {
  parseChronicleStateRow,
  parseTranscriptionSessionRow,
} from "./parse-db";
import type { LiveMarker } from "./types";

type SupabaseLike = {
  from: (t: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  storage?: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Blob | ArrayBuffer | File,
        opts?: { upsert?: boolean; contentType?: string },
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

export type TranscriptionSessionContext = {
  userId: string;
  sessionId: string;
  campaignId: string;
  sessionStatus: string;
  plannedMode: TranscriptionMode | null;
};

export type TranscriptionAuthResult =
  | { ok: true; ctx: TranscriptionSessionContext }
  | { ok: false; message: string; status: number };

export async function authorizeTranscriptionGm(
  supabase: SupabaseLike,
  sessionId: string,
  options?: { requireLive?: boolean },
): Promise<TranscriptionAuthResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Nicht authentifiziert.", status: 401 };
  }

  const { data: sessionRaw, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id, status, transcription_mode")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    transcription_mode?: string | null;
  } | null;

  if (sessionError || !session) {
    return { ok: false, message: "Session nicht gefunden.", status: 404 };
  }

  if (options?.requireLive && session.status !== "Live") {
    return {
      ok: false,
      message: "Chronist-Aufnahme ist nur in laufenden Sessions möglich.",
      status: 409,
    };
  }

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    return { ok: false, message: "Nur der GM kann den Chronist steuern.", status: 403 };
  }

  const plannedMode =
    session.transcription_mode === "jitsi"
      ? "jitsi"
      : session.transcription_mode === "table"
        ? "table"
        : null;

  return {
    ok: true,
    ctx: {
      userId: user.id,
      sessionId,
      campaignId: session.campaign_id,
      sessionStatus: session.status,
      plannedMode,
    },
  };
}

/** GM oder akzeptiertes Kampagnen-Mitglied (Lesen / Status-Anzeige). */
export async function authorizeTranscriptionCampaignAccess(
  supabase: SupabaseLike,
  sessionId: string,
): Promise<TranscriptionAuthResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Nicht authentifiziert.", status: 401 };
  }

  const { data: sessionRaw, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id, status, transcription_mode")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    transcription_mode?: string | null;
  } | null;

  if (sessionError || !session) {
    return { ok: false, message: "Session nicht gefunden.", status: 404 };
  }

  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (isCampaignGm(campaign, user.id)) {
    const plannedMode =
      session.transcription_mode === "jitsi"
        ? "jitsi"
        : session.transcription_mode === "table"
          ? "table"
          : null;
    return {
      ok: true,
      ctx: {
        userId: user.id,
        sessionId,
        campaignId: session.campaign_id,
        sessionStatus: session.status,
        plannedMode,
      },
    };
  }

  const { data: membership } = await supabase
    .from("campaign_members")
    .select("status")
    .eq("campaign_id", session.campaign_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const memberStatus = (membership as { status?: string } | null)?.status ?? "";
  const isMember = ["Approved", "Active"].includes(memberStatus);
  if (!isMember) {
    return { ok: false, message: "Kein Zugriff auf diese Session.", status: 403 };
  }

  const plannedMode =
    session.transcription_mode === "jitsi"
      ? "jitsi"
      : session.transcription_mode === "table"
        ? "table"
        : null;

  return {
    ok: true,
    ctx: {
      userId: user.id,
      sessionId,
      campaignId: session.campaign_id,
      sessionStatus: session.status,
      plannedMode,
    },
  };
}

function resolveWriteClient(supabase: SupabaseLike): SupabaseLike {
  try {
    return createAdminClient() as unknown as SupabaseLike;
  } catch (error) {
    console.warn("[transcription-server] Admin-Client nicht verfügbar.", error);
    return supabase;
  }
}

export async function updateSessionTranscriptionModeDb(
  supabase: SupabaseLike,
  sessionId: string,
  mode: TranscriptionMode,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await authorizeTranscriptionGm(supabase, sessionId);
  if (!auth.ok) return { ok: false, message: auth.message };

  const writeClient = resolveWriteClient(supabase);
  const { error } = await writeClient
    .from("sessions")
    .update({ transcription_mode: mode })
    .eq("id", sessionId);

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function ensureChronicleState(
  writeClient: SupabaseLike,
  sessionId: string,
  campaignId: string,
) {
  const { data: existing } = await writeClient
    .from("session_chronicle_state")
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) return;

  const seed = emptyChronicleState(sessionId, campaignId);
  await writeClient.from("session_chronicle_state").insert({
    session_id: seed.session_id,
    campaign_id: seed.campaign_id,
    story_recap: seed.story_recap,
    discovered_loot: seed.discovered_loot,
    spontaneous_npcs: seed.spontaneous_npcs,
    spontaneous_locations: seed.spontaneous_locations,
    spontaneous_quests: seed.spontaneous_quests,
    last_chunk_index: seed.last_chunk_index,
    updated_at: seed.updated_at,
  });
}

export async function startTranscriptionSession(
  supabase: SupabaseLike,
  sessionId: string,
  mode: TranscriptionMode,
  recordingNoticeAcknowledged: boolean,
) {
  const auth = await authorizeTranscriptionGm(supabase, sessionId, {
    requireLive: true,
  });
  if (!auth.ok) return auth;

  if (!recordingNoticeAcknowledged) {
    return {
      ok: false as const,
      message: "Bitte den Aufzeichnungshinweis bestätigen.",
      status: 400,
    };
  }

  const writeClient = resolveWriteClient(supabase);
  const now = new Date().toISOString();

  await writeClient
    .from("sessions")
    .update({ transcription_mode: mode })
    .eq("id", sessionId);

  await ensureChronicleState(writeClient, sessionId, auth.ctx.campaignId);

  const { data: existingRaw } = await writeClient
    .from("session_transcription_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const existing = parseTranscriptionSessionRow(existingRaw);

  if (existing && existing.status === "recording") {
    return {
      ok: true as const,
      transcriptionSession: existing,
    };
  }

  if (existing && existing.status === "paused") {
    const { data: resumedRaw, error } = await writeClient
      .from("session_transcription_sessions")
      .update({
        status: "recording",
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      return { ok: false as const, message: error.message, status: 500 };
    }
    return {
      ok: true as const,
      transcriptionSession: parseTranscriptionSessionRow(resumedRaw)!,
    };
  }

  const payload = {
    session_id: sessionId,
    campaign_id: auth.ctx.campaignId,
    mode,
    status: "recording",
    jitsi_room_url: JITSI_ROOM_URL,
    recording_notice_acknowledged_at: now,
    started_at: now,
    stopped_at: null,
    updated_at: now,
  };

  const { data: createdRaw, error: createError } = await writeClient
    .from("session_transcription_sessions")
    .upsert(payload, { onConflict: "session_id" })
    .select("*")
    .single();

  if (createError) {
    return { ok: false as const, message: createError.message, status: 500 };
  }

  return {
    ok: true as const,
    transcriptionSession: parseTranscriptionSessionRow(createdRaw)!,
  };
}

export async function setTranscriptionPaused(
  supabase: SupabaseLike,
  sessionId: string,
  paused: boolean,
) {
  const auth = await authorizeTranscriptionGm(supabase, sessionId, {
    requireLive: true,
  });
  if (!auth.ok) return auth;

  const writeClient = resolveWriteClient(supabase);
  const { data: rowRaw } = await writeClient
    .from("session_transcription_sessions")
    .select("id, status")
    .eq("session_id", sessionId)
    .maybeSingle();

  const row = rowRaw as { id: string; status: string } | null;
  if (!row) {
    return {
      ok: false as const,
      message: "Keine Chronist-Session aktiv.",
      status: 404,
    };
  }

  const nextStatus = paused ? "paused" : "recording";
  const { error } = await writeClient
    .from("session_transcription_sessions")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (error) {
    return { ok: false as const, message: error.message, status: 500 };
  }

  return { ok: true as const, status: nextStatus };
}

export async function stopTranscriptionRecording(
  supabase: SupabaseLike,
  sessionId: string,
) {
  const auth = await authorizeTranscriptionGm(supabase, sessionId, {
    requireLive: true,
  });
  if (!auth.ok) return auth;

  const writeClient = resolveWriteClient(supabase);
  const now = new Date().toISOString();

  const { data: rowRaw } = await writeClient
    .from("session_transcription_sessions")
    .select("id, status")
    .eq("session_id", sessionId)
    .maybeSingle();

  const row = rowRaw as { id: string; status: string } | null;
  if (!row) {
    return {
      ok: false as const,
      message: "Keine Chronist-Session aktiv.",
      status: 404,
    };
  }

  if (row.status === "stopped" || row.status === "idle") {
    return { ok: true as const, status: "stopped" as const };
  }

  const { error } = await writeClient
    .from("session_transcription_sessions")
    .update({
      status: "stopped",
      stopped_at: now,
      updated_at: now,
    })
    .eq("id", row.id);

  if (error) {
    return { ok: false as const, message: error.message, status: 500 };
  }

  await compactOrphanTranscriptionChunks(writeClient, row.id);

  return { ok: true as const, status: "stopped" as const };
}

async function resolveActiveMarkerChunkIndex(
  writeClient: SupabaseLike,
  transcriptionSessionId: string,
  requestedIndex?: number,
): Promise<number> {
  const { data: maxUploadedRow } = await writeClient
    .from("session_transcription_chunks")
    .select("chunk_index")
    .eq("transcription_session_id", transcriptionSessionId)
    .not("storage_path", "is", null)
    .order("chunk_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const maxUploaded = maxUploadedRow
    ? Number((maxUploadedRow as { chunk_index: number }).chunk_index)
    : -1;
  const openIndex = Math.max(0, maxUploaded + 1);

  if (requestedIndex == null || !Number.isFinite(requestedIndex)) {
    return openIndex;
  }

  return Math.min(Math.max(0, requestedIndex), openIndex);
}

/** Marker-only Zeilen ohne Audio in den letzten echten Chunk überführen. */
export async function compactOrphanTranscriptionChunks(
  writeClient: SupabaseLike,
  transcriptionSessionId: string,
): Promise<{ merged: number; removed: number }> {
  const { data: chunksRaw } = await writeClient
    .from("session_transcription_chunks")
    .select("id, chunk_index, storage_path, live_markers")
    .eq("transcription_session_id", transcriptionSessionId)
    .order("chunk_index", { ascending: true });

  const chunks = (chunksRaw ?? []) as Array<{
    id: string;
    chunk_index: number;
    storage_path: string | null;
    live_markers: LiveMarker[];
  }>;

  const orphans = chunks.filter((chunk) => !chunk.storage_path);
  if (orphans.length === 0) {
    return { merged: 0, removed: 0 };
  }

  const withAudio = chunks.filter((chunk) => chunk.storage_path);
  const target = withAudio.length > 0 ? withAudio[withAudio.length - 1] : null;

  let merged = 0;
  let removed = 0;

  for (const orphan of orphans) {
    const markers = Array.isArray(orphan.live_markers) ? orphan.live_markers : [];
    if (target && markers.length > 0) {
      const existing = Array.isArray(target.live_markers) ? target.live_markers : [];
      const nextMarkers = [...existing, ...markers];
      const { error } = await writeClient
        .from("session_transcription_chunks")
        .update({ live_markers: nextMarkers })
        .eq("id", target.id);
      if (error) {
        return { merged, removed };
      }
      target.live_markers = nextMarkers;
      merged += markers.length;
    }

    const { error: deleteError } = await writeClient
      .from("session_transcription_chunks")
      .delete()
      .eq("id", orphan.id);
    if (!deleteError) {
      removed += 1;
    }
  }

  return { merged, removed };
}

export async function appendLiveMarker(
  supabase: SupabaseLike,
  sessionId: string,
  marker: LiveMarker,
  chunkIndex?: number,
) {
  const auth = await authorizeTranscriptionGm(supabase, sessionId, {
    requireLive: true,
  });
  if (!auth.ok) return auth;

  const writeClient = resolveWriteClient(supabase);

  const { data: tsRaw } = await writeClient
    .from("session_transcription_sessions")
    .select("id, status")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as { id: string; status: string } | null;
  if (!ts) {
    return {
      ok: false as const,
      message: "Keine Chronist-Session aktiv.",
      status: 404,
    };
  }

  const targetIndex = await resolveActiveMarkerChunkIndex(
    writeClient,
    ts.id,
    chunkIndex,
  );

  const { data: chunkRaw } = await writeClient
    .from("session_transcription_chunks")
    .select("id, live_markers")
    .eq("transcription_session_id", ts.id)
    .eq("chunk_index", targetIndex)
    .maybeSingle();

  const existingMarkers = Array.isArray((chunkRaw as { live_markers?: unknown } | null)?.live_markers)
    ? ((chunkRaw as { live_markers: LiveMarker[] }).live_markers ?? [])
    : [];

  const nextMarkers = [...existingMarkers, marker];

  if (chunkRaw) {
    const { error } = await writeClient
      .from("session_transcription_chunks")
      .update({ live_markers: nextMarkers })
      .eq("id", (chunkRaw as { id: string }).id);
    if (error) {
      return { ok: false as const, message: error.message, status: 500 };
    }
  } else {
    const { error } = await writeClient.from("session_transcription_chunks").insert({
      transcription_session_id: ts.id,
      chunk_index: targetIndex,
      overlap_ms: AUDIO_CHUNK_OVERLAP_MS,
      live_markers: nextMarkers,
    });
    if (error) {
      return { ok: false as const, message: error.message, status: 500 };
    }
  }

  return { ok: true as const, chunkIndex: targetIndex!, markers: nextMarkers };
}

/** Spiegelt ein System-Log als gm_action-Marker in die laufende Chronist-Aufnahme. */
export async function mirrorSystemLogToChronicle(
  supabase: SupabaseLike,
  sessionId: string,
  logType: string,
  text: string,
  atIso: string,
): Promise<void> {
  const writeClient = resolveWriteClient(supabase);
  const { data: tsRaw } = await writeClient
    .from("session_transcription_sessions")
    .select("id, status, started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as { id: string; status: string; started_at: string | null } | null;
  if (!ts?.started_at) return;
  if (ts.status !== "recording" && ts.status !== "paused") return;

  const recStart = new Date(ts.started_at).getTime();
  const atMs = Math.max(0, new Date(atIso).getTime() - recStart);
  const label = `${logType}: ${text}`.slice(0, 480);
  const chunkIndex = await resolveActiveMarkerChunkIndex(writeClient, ts.id);

  await appendLiveMarker(
    supabase,
    sessionId,
    { type: "gm_action", at_ms: atMs, label },
    chunkIndex,
  );
}

export async function uploadTranscriptionChunk(
  supabase: SupabaseLike,
  sessionId: string,
  params: {
    chunkIndex: number;
    durationMs: number;
    overlapMs: number;
    audio: Blob;
    mimeType: string;
    liveMarkersJson?: string | null;
  },
) {
  const auth = await authorizeTranscriptionGm(supabase, sessionId, {
    requireLive: true,
  });
  if (!auth.ok) return auth;

  const writeClient = resolveWriteClient(supabase);

  const { data: tsRaw } = await writeClient
    .from("session_transcription_sessions")
    .select("id, campaign_id, mode")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as { id: string; campaign_id: string; mode: string } | null;
  if (!ts) {
    return {
      ok: false as const,
      message: "Keine Chronist-Session aktiv. Bitte Aufnahme starten.",
      status: 404,
    };
  }

  const ext = params.mimeType.includes("ogg")
    ? "ogg"
    : params.mimeType.includes("wav")
      ? "wav"
      : "webm";
  const storagePath = `${auth.ctx.campaignId}/${sessionId}/${params.chunkIndex}.${ext}`;

  let markers: LiveMarker[] = [];
  if (params.liveMarkersJson) {
    try {
      const parsed = JSON.parse(params.liveMarkersJson);
      if (Array.isArray(parsed)) markers = parsed as LiveMarker[];
    } catch {
      /* ignore invalid JSON */
    }
  }

  const admin = resolveWriteClient(supabase);
  const { error: uploadError } = await admin.storage!
    .from(SESSION_AUDIO_BUCKET)
    .upload(storagePath, params.audio, {
      upsert: true,
      contentType: params.mimeType,
    });

  if (uploadError) {
    return {
      ok: false as const,
      message: `Upload fehlgeschlagen: ${uploadError.message}`,
      status: 500,
    };
  }

  const { data: existingChunk } = await writeClient
    .from("session_transcription_chunks")
    .select("id, live_markers")
    .eq("transcription_session_id", ts.id)
    .eq("chunk_index", params.chunkIndex)
    .maybeSingle();

  const mergedMarkers =
    markers.length > 0
      ? markers
      : Array.isArray((existingChunk as { live_markers?: unknown } | null)?.live_markers)
        ? ((existingChunk as { live_markers: LiveMarker[] }).live_markers ?? [])
        : [];

  const chunkPayload = {
    transcription_session_id: ts.id,
    chunk_index: params.chunkIndex,
    storage_path: storagePath,
    duration_ms: params.durationMs,
    overlap_ms: params.overlapMs,
    live_markers: mergedMarkers,
    whisper_status: "pending",
    summarize_status: "pending",
    ...(existingChunk
      ? {
          transcript_text: null,
          error_message: null,
          summarized_at: null,
        }
      : {}),
  };

  const { error: chunkError } = existingChunk
    ? await writeClient
        .from("session_transcription_chunks")
        .update(chunkPayload)
        .eq("id", (existingChunk as { id: string }).id)
    : await writeClient.from("session_transcription_chunks").insert(chunkPayload);

  if (chunkError) {
    return { ok: false as const, message: chunkError.message, status: 500 };
  }

  return {
    ok: true as const,
    storagePath,
    chunkIndex: params.chunkIndex,
  };
}

export async function getTranscriptionStatus(supabase: SupabaseLike, sessionId: string) {
  const auth = await authorizeTranscriptionCampaignAccess(supabase, sessionId);
  if (!auth.ok) return auth;

  const { data: tsRaw } = await supabase
    .from("session_transcription_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const { data: chronicleRaw } = await supabase
    .from("session_chronicle_state")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const { data: chunksRaw } = tsRaw
    ? await supabase
        .from("session_transcription_chunks")
        .select(
          "chunk_index, whisper_status, summarize_status, duration_ms, created_at, error_message, summarized_at",
        )
        .eq(
          "transcription_session_id",
          (tsRaw as { id: string }).id,
        )
        .order("chunk_index", { ascending: true })
    : { data: [] };

  return {
    ok: true as const,
    plannedMode: auth.ctx.plannedMode,
    sessionStatus: auth.ctx.sessionStatus,
    transcriptionSession: parseTranscriptionSessionRow(tsRaw),
    chronicleState: parseChronicleStateRow(chronicleRaw),
    chunks: Array.isArray(chunksRaw) ? chunksRaw : [],
  };
}
