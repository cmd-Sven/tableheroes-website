/**
 * LiveSessionBoardView — Renders the live session layout tree from board orchestration context.
 */
"use client";

import { DungeonMasterCam } from "@/src/components/session/DungeonMasterCam";
import { DungeonMasterCamProvider } from "@/src/components/session/DungeonMasterCamProvider";
import { PlayerAvatarCamSessionProvider } from "@/src/components/session/PlayerAvatarCamSessionProvider";
import { LiveSessionLoadingScreen } from "@/src/components/session/LiveSessionLoadingScreen";
import { LiveSessionChronicleBanners } from "./LiveSessionChronicleBanners";
import { LiveSessionBoardStageHost } from "./LiveSessionBoardStageHost";
import { LiveSessionBoardOverlaysHost } from "./LiveSessionBoardOverlaysHost";
import { useLiveSessionBoardContext } from "./LiveSessionBoardContext";

function resolveAdventureReadyName(params: {
  characterName: string | null | undefined;
  isGM: boolean;
  isGuest: boolean | undefined;
  guestDisplayName: string | null | undefined;
}): string {
  const trimmedCharacter = params.characterName?.trim();
  if (trimmedCharacter) return trimmedCharacter;

  const trimmedGuest = params.guestDisplayName?.trim();
  if (params.isGuest && trimmedGuest) return trimmedGuest;

  if (params.isGM) return "Spielleiter";
  if (trimmedGuest) return trimmedGuest;
  return "Held";
}

export function LiveSessionBoardView() {
  const {
    props: {
      forcePlayerView,
      isGuest,
      guestDisplayName,
      userId,
    },
    isGM,
    showLoadingScreen,
    dismissLoadingScreen,
    liveChannelRef,
    bootstrap: { liveStateLoadError, resolveLiveStateBase },
    chronicle: {
      showChronistHealthBanner,
      chronistHealthBannerVariant,
      showChronistNotRecordingReminder,
      showJitsiChronistReminder,
      recordingNoticeModalOpen,
      recordingNoticeStatus,
      chronicleRecorder,
      chronistStartFlowRef,
      dismissChronistRecordingReminder,
      dismissJitsiChronistReminder,
      dismissRecordingNotice,
    },
    derived: { currentPlayerCharacter },
  } = useLiveSessionBoardContext();

  const adventureReadyName = resolveAdventureReadyName({
    characterName: currentPlayerCharacter?.name,
    isGM,
    isGuest,
    guestDisplayName,
  });

  return (
    <PlayerAvatarCamSessionProvider userId={userId} liveChannelRef={liveChannelRef}>
      <DungeonMasterCamProvider enabled={isGM} userId={userId}>
        <div
          className={`relative flex min-h-screen min-h-0 flex-col bg-background-dark text-white ${
            isGM && !forcePlayerView ? "pl-11" : "pl-20"
          } ${isGuest ? "" : "pr-11"}`}
        >
          {showLoadingScreen ? (
            <LiveSessionLoadingScreen
              characterName={adventureReadyName}
              onContinue={dismissLoadingScreen}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-background-dark via-emerald-950/90 to-black" />

          <LiveSessionChronicleBanners
            showChronistHealthBanner={showChronistHealthBanner}
            chronistHealthBannerVariant={chronistHealthBannerVariant}
            showChronistNotRecordingReminder={showChronistNotRecordingReminder}
            showJitsiChronistReminder={showJitsiChronistReminder}
            recordingNoticeModalOpen={recordingNoticeModalOpen}
            recordingNoticeStatus={recordingNoticeStatus}
            chronicleRecorder={chronicleRecorder}
            onStartRecording={() => chronistStartFlowRef.current?.()}
            onDismissChronistRecordingReminder={dismissChronistRecordingReminder}
            onDismissJitsiChronistReminder={dismissJitsiChronistReminder}
            onDismissRecordingNotice={dismissRecordingNotice}
          />

          {liveStateLoadError && (
            <div className="relative z-10 border-b border-red-800/60 bg-red-950/45 px-6 py-2">
              <div className="flex flex-wrap items-center gap-2 font-libre text-xs text-red-200">
                <span>{liveStateLoadError}</span>
                {isGM && (
                  <button
                    type="button"
                    onClick={() => void resolveLiveStateBase()}
                    className="rounded border border-red-700 px-2 py-1 font-barlow font-bold uppercase text-[10px] text-red-100 hover:bg-red-900/60"
                  >
                    Erneut initialisieren
                  </button>
                )}
              </div>
            </div>
          )}

          <LiveSessionBoardStageHost />
          <LiveSessionBoardOverlaysHost />

          {/* Board-level: survives Battlemap / Scene / Stage switches */}
          {isGM ? <DungeonMasterCam /> : null}
        </div>
      </DungeonMasterCamProvider>
    </PlayerAvatarCamSessionProvider>
  );
}
