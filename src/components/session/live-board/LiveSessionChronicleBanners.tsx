/**
 * LiveSessionChronicleBanners — Chronist health / not-recording / Jitsi reminder banners and notice modal.
 */
"use client";

import { ChronicleRecordingNoticeModal } from "@/src/components/session/ChronicleRecordingNoticeModal";
import { ChronicleRecordingReminderBanner } from "@/src/components/session/ChronicleRecordingReminderBanner";
import type { useSessionChronicleRecorder } from "@/src/hooks/useSessionChronicleRecorder";

type Recorder = ReturnType<typeof useSessionChronicleRecorder>;
type CaptureHealth = Recorder["captureHealth"];

type Props = {
  showChronistHealthBanner: boolean;
  chronistHealthBannerVariant: Exclude<CaptureHealth, "idle" | "starting"> | null;
  showChronistNotRecordingReminder: boolean;
  showJitsiChronistReminder: boolean;
  recordingNoticeModalOpen: boolean;
  recordingNoticeStatus: "recording" | "paused" | null;
  chronicleRecorder: Recorder;
  onStartRecording: () => void;
  onDismissChronistRecordingReminder: () => void;
  onDismissJitsiChronistReminder: () => void;
  onDismissRecordingNotice: () => void;
};

export function LiveSessionChronicleBanners({
  showChronistHealthBanner,
  chronistHealthBannerVariant,
  showChronistNotRecordingReminder,
  showJitsiChronistReminder,
  recordingNoticeModalOpen,
  recordingNoticeStatus,
  chronicleRecorder,
  onStartRecording,
  onDismissChronistRecordingReminder,
  onDismissJitsiChronistReminder,
  onDismissRecordingNotice,
}: Props) {
  return (
    <>
      {showChronistHealthBanner && chronistHealthBannerVariant ? (
        <ChronicleRecordingReminderBanner
          variant={chronistHealthBannerVariant}
          onReconnect={() => void chronicleRecorder.reconnectLocalCapture()}
          error={chronicleRecorder.error}
          uploadedChunkCount={chronicleRecorder.serverUploadedChunkCount}
        />
      ) : null}

      {showChronistNotRecordingReminder ? (
        <ChronicleRecordingReminderBanner
          variant="not-recording"
          onStartRecording={onStartRecording}
          onDismiss={onDismissChronistRecordingReminder}
          error={chronicleRecorder.error}
        />
      ) : null}

      {showJitsiChronistReminder ? (
        <ChronicleRecordingReminderBanner
          variant="jitsi-mode"
          onDismiss={onDismissJitsiChronistReminder}
        />
      ) : null}

      {recordingNoticeStatus && recordingNoticeModalOpen ? (
        <ChronicleRecordingNoticeModal
          open={recordingNoticeModalOpen}
          onClose={onDismissRecordingNotice}
          status={recordingNoticeStatus}
        />
      ) : null}
    </>
  );
}
