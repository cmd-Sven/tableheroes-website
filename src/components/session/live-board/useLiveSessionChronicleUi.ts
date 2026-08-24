/**
 * useLiveSessionChronicleUi — Chronicle recorder wiring, reminder banners, and flow refs.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useMicMonitor } from "@/src/hooks/useMicMonitor";
import { useSessionChronicleRecorder } from "@/src/hooks/useSessionChronicleRecorder";
import { useSessionTranscriptionStatus } from "@/src/hooks/useSessionTranscriptionStatus";
import type { TranscriptionMode, TranscriptionStatus } from "@/src/lib/session-chronicle/constants";

type Params = {
  sessionId: string;
  isGM: boolean;
  isGuest: boolean;
  sessionStatus: string;
  transcriptionMode: TranscriptionMode | null;
};

export function useLiveSessionChronicleUi({
  sessionId,
  isGM,
  isGuest,
  sessionStatus,
  transcriptionMode,
}: Params) {
  const [activeTranscriptionMode, setActiveTranscriptionMode] = useState<
    TranscriptionMode | null
  >(transcriptionMode);
  const [chronistPanelOpen, setChronistPanelOpen] = useState(true);
  const chronistStartFlowRef = useRef<(() => void) | null>(null);
  const chronistStopFlowRef = useRef<(() => void) | null>(null);
  const chronistSettingsFlowRef = useRef<(() => void) | null>(null);
  const [recordingNoticeModalOpen, setRecordingNoticeModalOpen] = useState(false);

  const [chronistReminderDismissed, setChronistReminderDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(`th-chronist-reminder-dismiss-${sessionId}`) === "1";
    } catch {
      return false;
    }
  });

  const [jitsiChronistReminderDismissed, setJitsiChronistReminderDismissed] = useState(
    () => {
      if (typeof window === "undefined") return false;
      try {
        return (
          sessionStorage.getItem(`th-chronist-jitsi-reminder-dismiss-${sessionId}`) ===
          "1"
        );
      } catch {
        return false;
      }
    },
  );

  useEffect(() => {
    setActiveTranscriptionMode(transcriptionMode);
  }, [transcriptionMode]);

  const isPrepMode = sessionStatus === "Scheduled";
  const chronistTableMode =
    activeTranscriptionMode === "table" || activeTranscriptionMode === null;

  const prepMicTest = useMicMonitor();
  const chronicleRecorder = useSessionChronicleRecorder({
    sessionId,
    enabled: isGM && sessionStatus === "Live" && chronistTableMode,
    plannedMode: activeTranscriptionMode,
  });
  const { status: liveTranscriptionStatus } = useSessionTranscriptionStatus(
    sessionId,
    chronistTableMode && sessionStatus === "Live",
  );

  const gmMicActive =
    chronicleRecorder.localCaptureActive ||
    (isPrepMode && prepMicTest.isActive);

  const topBarTranscriptionStatus: TranscriptionStatus | null =
    sessionStatus === "Live"
      ? chronicleRecorder.phase === "recording"
        ? "recording"
        : chronicleRecorder.phase === "paused"
          ? "paused"
          : liveTranscriptionStatus
      : null;

  const recordingNoticeStatus =
    sessionStatus === "Live" &&
    chronistTableMode &&
    (topBarTranscriptionStatus === "recording" ||
      topBarTranscriptionStatus === "paused")
      ? topBarTranscriptionStatus
      : null;

  const chronistRecordingActive =
    chronicleRecorder.localCaptureActive ||
    chronicleRecorder.phase === "starting";

  const chronistHealthBannerVariant =
    chronicleRecorder.captureHealth !== "idle" &&
    chronicleRecorder.captureHealth !== "starting"
      ? chronicleRecorder.captureHealth
      : null;

  const showChronistHealthBanner =
    isGM &&
    sessionStatus === "Live" &&
    chronistTableMode &&
    chronistHealthBannerVariant != null &&
    (chronistHealthBannerVariant === "reconnect-needed" ||
      chronistHealthBannerVariant === "no-signal" ||
      chronistHealthBannerVariant === "upload-stalled");

  useEffect(() => {
    if (chronicleRecorder.localCaptureActive) {
      try {
        sessionStorage.removeItem(`th-chronist-reminder-dismiss-${sessionId}`);
      } catch {
        /* ignore */
      }
      setChronistReminderDismissed(false);
    }
  }, [chronicleRecorder.localCaptureActive, sessionId]);

  function dismissChronistRecordingReminder() {
    try {
      sessionStorage.setItem(`th-chronist-reminder-dismiss-${sessionId}`, "1");
    } catch {
      /* ignore */
    }
    setChronistReminderDismissed(true);
  }

  function dismissJitsiChronistReminder() {
    try {
      sessionStorage.setItem(`th-chronist-jitsi-reminder-dismiss-${sessionId}`, "1");
    } catch {
      /* ignore */
    }
    setJitsiChronistReminderDismissed(true);
  }

  const showChronistNotRecordingReminder =
    isGM &&
    sessionStatus === "Live" &&
    chronistTableMode &&
    !chronistRecordingActive &&
    !liveTranscriptionStatus &&
    !chronistReminderDismissed &&
    !showChronistHealthBanner;

  const showJitsiChronistReminder =
    isGM &&
    sessionStatus === "Live" &&
    !chronistTableMode &&
    !jitsiChronistReminderDismissed;

  useEffect(() => {
    if (
      isGM ||
      !recordingNoticeStatus ||
      sessionStatus !== "Live" ||
      !chronistTableMode
    ) {
      return;
    }
    const key = `th-recording-notice-${sessionId}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
    } catch {
      /* ignore storage errors */
    }
    setRecordingNoticeModalOpen(true);
  }, [isGM, recordingNoticeStatus, sessionId, sessionStatus, chronistTableMode]);

  function dismissRecordingNotice() {
    try {
      sessionStorage.setItem(`th-recording-notice-${sessionId}`, "1");
    } catch {
      /* ignore storage errors */
    }
    setRecordingNoticeModalOpen(false);
  }

  return {
    activeTranscriptionMode,
    setActiveTranscriptionMode,
    chronistPanelOpen,
    setChronistPanelOpen,
    chronistStartFlowRef,
    chronistStopFlowRef,
    chronistSettingsFlowRef,
    recordingNoticeModalOpen,
    setRecordingNoticeModalOpen,
    dismissChronistRecordingReminder,
    dismissJitsiChronistReminder,
    dismissRecordingNotice,
    isPrepMode,
    chronistTableMode,
    prepMicTest,
    chronicleRecorder,
    liveTranscriptionStatus,
    gmMicActive,
    topBarTranscriptionStatus,
    recordingNoticeStatus,
    chronistRecordingActive,
    chronistHealthBannerVariant,
    showChronistHealthBanner,
    showChronistNotRecordingReminder,
    showJitsiChronistReminder,
  };
}
