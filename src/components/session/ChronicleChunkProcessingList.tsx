"use client";

import { Loader2 } from "lucide-react";

type ChunkRow = {
  chunk_index: number;
  whisper_status: string;
  summarize_status: string;
  error_message?: string | null;
};

function badgeClass(status: string) {
  if (status === "done") return "text-emerald-400";
  if (status === "processing") return "text-amber-300";
  if (status === "failed") return "text-red-400";
  return "text-gray-500";
}

export function ChronicleChunkProcessingList({
  chunks,
}: {
  chunks: ChunkRow[];
}) {
  if (chunks.length === 0) return null;

  const active = chunks.some(
    (c) =>
      c.whisper_status === "processing" ||
      c.summarize_status === "processing" ||
      c.whisper_status === "pending" ||
      c.summarize_status === "pending",
  );

  return (
    <div className="rounded border border-hero-border/30 bg-[#0a1f10]/80 p-2">
      <p className="mb-2 flex items-center gap-2 font-barlow text-[9px] font-bold uppercase text-gray-500">
        {active ? <Loader2 className="h-3 w-3 animate-spin text-accent-gold" /> : null}
        KI-Verarbeitung
      </p>
      <ul className="max-h-32 space-y-1 overflow-y-auto">
        {chunks.map((c) => (
          <li
            key={c.chunk_index}
            className="flex flex-wrap items-center gap-2 font-libre text-[10px] text-gray-400"
          >
            <span className="font-barlow text-gray-300">#{c.chunk_index + 1}</span>
            <span className={badgeClass(c.whisper_status)}>W: {c.whisper_status}</span>
            <span className={badgeClass(c.summarize_status)}>KI: {c.summarize_status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
