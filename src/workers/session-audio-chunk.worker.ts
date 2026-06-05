/// <reference lib="webworker" />

import {
  AUDIO_CHUNK_DURATION_MS,
  AUDIO_CHUNK_OVERLAP_MS,
} from "../lib/session-chronicle/constants";

type AudioPart = {
  buffer: ArrayBuffer;
  durationMs: number;
};

type WorkerInMessage =
  | { type: "reset" }
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
  | { type: "flush-ready"; chunkIndex: number; buffer: ArrayBuffer; mimeType: string; durationMs: number };

const SLICE_MS = 1000;

let parts: AudioPart[] = [];
let accumulatedMs = 0;
let chunkIndex = 0;
let overlapTail: AudioPart[] = [];
let mimeType = "audio/webm;codecs=opus";

function resetState() {
  parts = [];
  accumulatedMs = 0;
  chunkIndex = 0;
  overlapTail = [];
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

function buildChunkBuffer(includeOverlap: AudioPart[], body: AudioPart[]): ArrayBuffer {
  const merged = [...includeOverlap, ...body];
  const totalLength = merged.reduce((sum, p) => sum + p.buffer.byteLength, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of merged) {
    out.set(new Uint8Array(part.buffer), offset);
    offset += part.buffer.byteLength;
  }
  return out.buffer;
}

function emitChunk(includeOverlap: AudioPart[], body: AudioPart[], durationMs: number) {
  const buffer = buildChunkBuffer(includeOverlap, body);
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

  if (msg.type === "audio") {
    if (msg.mimeType) mimeType = msg.mimeType;
    const part: AudioPart = {
      buffer: msg.buffer,
      durationMs: msg.durationMs ?? SLICE_MS,
    };
    parts.push(part);
    accumulatedMs += part.durationMs;

    if (accumulatedMs >= AUDIO_CHUNK_DURATION_MS) {
      emitChunk(overlapTail, parts, accumulatedMs + overlapTail.reduce((s, p) => s + p.durationMs, 0));
      overlapTail = pickOverlapTail(parts);
      parts = [];
      accumulatedMs = 0;
    }
    return;
  }

  if (msg.type === "flush") {
    if (msg.mimeType) mimeType = msg.mimeType;
    if (parts.length === 0 && overlapTail.length === 0) return;
    const buffer = buildChunkBuffer(overlapTail, parts);
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
  }
};

export {};
