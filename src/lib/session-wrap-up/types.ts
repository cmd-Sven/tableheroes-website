export type SessionWrapUpTask = {
  id: string;
  kind: "info" | "action" | "warning";
  title: string;
  description: string;
  href?: string;
};

export type SessionWrapUpPreview = {
  sessionId: string;
  sessionTitle: string | null;
  chronist: {
    used: boolean;
    transcriptionStatus: string | null;
    recordingActive: boolean;
    chunkCount: number;
    totalAudioMs: number;
    pendingWhisper: number;
    pendingSummarize: number;
    failedChunks: number;
    processedChunks: number;
  };
  inbox: {
    pendingCount: number;
    preview: Array<{ kind: string; title: string }>;
  };
  board: {
    stageNpcNames: string[];
    stageNpcCount: number;
    locationName: string | null;
    weatherLabel: string;
    temperatureLabel: string;
    dayPhaseLabel: string | null;
    inGameDate: string | null;
    inGameTime: string | null;
    hasCarryOverContent: boolean;
  };
  table: {
    battlemapCount: number;
    tokenCount: number;
    overlayCount: number;
    drawingCount: number;
    hasActiveMap: boolean;
    hasCarryOverContent: boolean;
  };
  nextSession: {
    id: string;
    title: string | null;
    startTime: string;
  } | null;
  participation: {
    basePointsPerPlayer: number;
    alreadySettled: boolean;
    players: Array<{
      userId: string;
      username: string;
      characterName: string | null;
      presence: "online" | "physical" | "both" | null;
      eligible: boolean;
      basePoints: number;
    }>;
    achievements: Array<{
      id: string;
      name: string;
      pointsAwarded: number;
    }>;
  };
  followUpTasks: SessionWrapUpTask[];
};

export function formatWrapUpDuration(ms: number): string {
  if (ms <= 0) return "0 Min.";
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} Std.${m > 0 ? ` ${m} Min.` : ""}`;
  return `${totalMin} Min.`;
}
