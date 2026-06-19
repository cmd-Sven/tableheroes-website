export type ChronicleChunkPipelineRow = {
  whisper_status: string;
  summarize_status: string;
  storage_path?: string | null;
};

export type ChronistProcessingSummary = {
  chunkCount: number;
  processedChunks: number;
  pendingWhisper: number;
  pendingSummarize: number;
  failedChunks: number;
  pendingTotal: number;
  isProcessing: boolean;
  isComplete: boolean;
  allSucceeded: boolean;
};

export function summarizeChronistChunkProcessing(
  chunks: ChronicleChunkPipelineRow[],
  opts?: { onlyWithStorage?: boolean },
): ChronistProcessingSummary {
  const rows =
    opts?.onlyWithStorage === false
      ? chunks
      : chunks.filter((c) => c.storage_path == null || c.storage_path !== "");

  const pendingWhisper = rows.filter(
    (c) => c.whisper_status === "pending" || c.whisper_status === "processing",
  ).length;
  const pendingSummarize = rows.filter(
    (c) =>
      c.whisper_status === "done" &&
      (c.summarize_status === "pending" || c.summarize_status === "processing"),
  ).length;
  const failedChunks = rows.filter(
    (c) => c.whisper_status === "failed" || c.summarize_status === "failed",
  ).length;
  const processedChunks = rows.filter(
    (c) => c.whisper_status === "done" && c.summarize_status === "done",
  ).length;

  const pendingTotal = pendingWhisper + pendingSummarize;
  const chunkCount = rows.length;
  const isProcessing = chunkCount > 0 && pendingTotal > 0;
  const isComplete = chunkCount > 0 && pendingTotal === 0;
  const allSucceeded = isComplete && failedChunks === 0;

  return {
    chunkCount,
    processedChunks,
    pendingWhisper,
    pendingSummarize,
    failedChunks,
    pendingTotal,
    isProcessing,
    isComplete,
    allSucceeded,
  };
}
