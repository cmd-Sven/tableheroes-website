/// <reference lib="webworker" />

import {
  AUDIO_CHUNK_DURATION_MS,
  AUDIO_CHUNK_OVERLAP_MS,
  AUDIO_FIRST_CHUNK_DURATION_MS,
} from "../lib/session-chronicle/constants";

type AudioPart = {
  buffer: ArrayBuffer;
  durationMs: number;
};

type WorkerInMessage =
  | { type: "reset" }
  | { type: "set-chunk-index"; chunkIndex: number }
  | { type: "audio"; buffer: ArrayBuffer; durationMs?: number; mimeType?: string }
  | { type: "flush"; mimeType?: string };

type WorkerOutMessage =
  | {
      type: "chunk-ready";
      chunkIndex: number;
      buffer: ArrayBuffer;
      mimeType: string;
      durationMs: number;
      overlapMs: number;
    }
  | {
      type: "flush-ready";
      chunkIndex: number;
      buffer: ArrayBuffer;
      mimeType: string;
      durationMs: number;
    };

const SLICE_MS = 1000;

let parts: AudioPart[] = [];
let accumulatedMs = 0;
let chunkIndex = 0;
let overlapTail: AudioPart[] = [];
let mimeType = "audio/webm";

function normalizeMimeType(raw: string | undefined): string {
  const base = (raw ?? "audio/webm").split(";")[0]?.trim().toLowerCase() || "audio/webm";
  if (base === "audio/ogg" || base === "audio/wav" || base === "audio/webm") return base;
  return "audio/webm";
}

function resetState() {
  parts = [];
  accumulatedMs = 0;
  chunkIndex = 0;
  overlapTail = [];
}

function targetChunkDurationMs(): number {
  return chunkIndex === 0 ? AUDIO_FIRST_CHUNK_DURATION_MS : AUDIO_CHUNK_DURATION_MS;
}

function pickOverlapTail(source: AudioPart[]): AudioPart[] {
  const tail: AudioPart[] = [];
  let tailMs = 0;
  for (let i = source.length - 1; i >= 0 && tailMs < AUDIO_CHUNK_OVERLAP_MS; i--) {
    tail.unshift(source[i]);
    tailMs += source[i].durationMs;
  }
  return tail;
}

/** MediaRecorder-Slices müssen als Blob-Liste zusammengefügt werden — kein Byte-Concat. */
async function buildChunkBuffer(merged: AudioPart[], mime: string): Promise<ArrayBuffer> {
  if (merged.length === 0) return new ArrayBuffer(0);
  const blob = new Blob(
    merged.map((part) => new Blob([part.buffer], { type: mime })),
    { type: mime },
  );
  return blob.arrayBuffer();
}

async function emitChunk(
  includeOverlap: AudioPart[],
  body: AudioPart[],
  durationMs: number,
) {
  const merged = [...includeOverlap, ...body];
  const buffer = await buildChunkBuffer(merged, mimeType);
  const msg: WorkerOutMessage = {
    type: "chunk-ready",
    chunkIndex,
    buffer,
    mimeType,
    durationMs,
    overlapMs: includeOverlap.length > 0 ? AUDIO_CHUNK_OVERLAP_MS : 0,
  };
  self.postMessage(msg, [buffer]);
  chunkIndex += 1;
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === "reset") {
    resetState();
    return;
  }

  if (msg.type === "set-chunk-index") {
    chunkIndex = Math.max(0, Math.floor(msg.chunkIndex));
    return;
  }

  if (msg.type === "audio") {
    if (msg.mimeType) mimeType = normalizeMimeType(msg.mimeType);
    const part: AudioPart = {
      buffer: msg.buffer,
      durationMs: msg.durationMs ?? SLICE_MS,
    };
    parts.push(part);
    accumulatedMs += part.durationMs;

    if (accumulatedMs >= targetChunkDurationMs()) {
      void emitChunk(
        overlapTail,
        parts,
        accumulatedMs + overlapTail.reduce((s, p) => s + p.durationMs, 0),
      );
      overlapTail = pickOverlapTail(parts);
      parts = [];
      accumulatedMs = 0;
    }
    return;
  }

  if (msg.type === "flush") {
    if (msg.mimeType) mimeType = normalizeMimeType(msg.mimeType);
    if (parts.length === 0 && overlapTail.length === 0) return;
    void (async () => {
      const merged = [...overlapTail, ...parts];
      const buffer = await buildChunkBuffer(merged, mimeType);
      const durationMs =
        parts.reduce((s, p) => s + p.durationMs, 0) +
        overlapTail.reduce((s, p) => s + p.durationMs, 0);
      const out: WorkerOutMessage = {
        type: "flush-ready",
        chunkIndex,
        buffer,
        mimeType,
        durationMs,
      };
      self.postMessage(out, [buffer]);
      chunkIndex += 1;
      resetState();
    })();
  }
};

export {};
