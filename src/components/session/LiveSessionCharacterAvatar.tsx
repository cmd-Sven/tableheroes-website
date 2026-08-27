/**
 * LiveSessionCharacterAvatar — Portrait eines Helden am Tisch.
 * Radialmenü, Webcam und Status — das Gesicht, hinter dem die Figur lebt.
 */
"use client";

import { useEffect, useRef, useState, memo } from "react";
import type { LiveAvatarStatus } from "@/src/lib/actions/live-session-avatar-actions";
import {
  type LiveSessionCharacterAvatarProps as Props,
} from "./live-session-character-avatar.constants";
import { LiveSessionCharacterAvatarPortrait } from "./LiveSessionCharacterAvatarPortrait";
import { LiveSessionCharacterAvatarRadialOverlay } from "./LiveSessionCharacterAvatarRadialOverlay";
import { useLiveSessionCharacterAvatarEffects } from "./useLiveSessionCharacterAvatarEffects";
import { useLiveSessionCharacterAvatarHandlers } from "./useLiveSessionCharacterAvatarHandlers";
import { useLiveSessionCharacterAvatarMenuLifecycle } from "./useLiveSessionCharacterAvatarMenuLifecycle";
import { usePlayerAvatarCam } from "./usePlayerAvatarCam";

export const LiveSessionCharacterAvatar = memo(function LiveSessionCharacterAvatar({
  sessionId,
  campaignId,
  characterId,
  characterName,
  className,
  fallbackAvatarUrl,
  avatarDisplay,
  isDummy,
  canInteract,
  isGm = false,
  showDnd5eSheet,
  battlemapActive = false,
  onStartTokenPlacement,
  battlemapToken = null,
  onBattlemapTokenSaved,
  combatMode = false,
  canJoinCombat = false,
  onJoinCombat,
  density = "full",
  canControlWebcam = false,
  isCameraOwner = false,
}: Props) {
  const compact = density === "compact";
  const [status, setStatus] = useState<LiveAvatarStatus | null>(null);
  const { rollFx, speechBubble } = useLiveSessionCharacterAvatarEffects(characterId);
  const reloadRef = useRef<() => Promise<LiveAvatarStatus | null>>(async () => null);

  const webcamControl = canControlWebcam && !isDummy;
  const cameraOwner = isCameraOwner && !isDummy;
  const webcam = usePlayerAvatarCam({
    characterId,
    isCameraOwner: cameraOwner,
    canControl: webcamControl,
  });

  const menu = useLiveSessionCharacterAvatarMenuLifecycle({
    characterId,
    canInteract,
    isDummy: Boolean(isDummy),
    battlemapToken,
    reload: () => reloadRef.current(),
  });

  const handlers = useLiveSessionCharacterAvatarHandlers({
    sessionId,
    campaignId,
    characterId,
    className,
    isDummy: Boolean(isDummy),
    isGm,
    showDnd5eSheet,
    battlemapActive,
    onStartTokenPlacement,
    battlemapToken,
    onBattlemapTokenSaved,
    combatMode,
    canJoinCombat,
    onJoinCombat,
    status,
    setStatus,
    activeBattlemapTokenId: menu.activeBattlemapTokenId,
    tokenShowHpBar: menu.tokenShowHpBar,
    tokenSizeCategory: menu.tokenSizeCategory,
    setTokenShowHpBar: menu.setTokenShowHpBar,
    setTokenSizeCategory: menu.setTokenSizeCategory,
    panel: menu.panel,
    setPanel: menu.setPanel,
    setMenuOpen: menu.setMenuOpen,
    canControlWebcam: webcamControl,
    webcamActive: webcam.webcamModeActive,
    onToggleWebcam: () => {
      webcam.toggleDisplayMode();
    },
  });
  reloadRef.current = handlers.reload;

  useEffect(() => {
    void handlers.reload();
    const id = window.setInterval(() => void handlers.reload(), 20000);
    return () => window.clearInterval(id);
  }, [handlers.reload]);

  const hpCurrent = status?.hpCurrent ?? 0;
  const hpMax = Math.max(1, status?.hpMax ?? 1);

  return (
    <div ref={menu.rootRef} className="relative flex h-full w-full flex-col items-center">
      <LiveSessionCharacterAvatarPortrait
        compact={compact}
        characterName={characterName}
        canInteract={canInteract}
        isDummy={Boolean(isDummy)}
        className={className}
        avatarDisplay={avatarDisplay}
        fallbackAvatarUrl={fallbackAvatarUrl}
        status={status}
        rollFx={rollFx}
        speechBubble={speechBubble}
        avatarBtnRef={menu.avatarBtnRef}
        onAvatarClick={menu.handleAvatarClick}
        showingWebcam={webcam.showingWebcam}
        webcamModeActive={webcam.webcamModeActive}
        webcamPhase={webcam.phase}
        webcamErrorHint={webcam.errorHint}
        videoRefCallback={webcam.videoRefCallback}
        canControlWebcam={webcamControl}
        onToggleWebcam={() => {
          webcam.toggleDisplayMode();
        }}
      />

      <LiveSessionCharacterAvatarRadialOverlay
        mounted={menu.mounted}
        menuOpen={menu.menuOpen}
        canInteract={canInteract}
        anchor={menu.anchor}
        overlayRef={menu.overlayRef}
        visibleRadial={handlers.visibleRadial}
        panel={menu.panel}
        pending={handlers.pending}
        status={status}
        isGm={isGm}
        hpCurrent={hpCurrent}
        hpMax={hpMax}
        tokenShowHpBar={menu.tokenShowHpBar}
        setTokenShowHpBar={menu.setTokenShowHpBar}
        tokenSizeCategory={menu.tokenSizeCategory}
        setTokenSizeCategory={menu.setTokenSizeCategory}
        hasBattlemapToken={handlers.hasBattlemapToken}
        handleRadialClick={handlers.handleRadialClick}
        setMenuOpen={menu.setMenuOpen}
        setPanel={menu.setPanel}
        saveMood={handlers.saveMood}
        toggleGmCondition={handlers.toggleGmCondition}
        setGmExhaustionLevel={handlers.setGmExhaustionLevel}
        saveTokenSettings={handlers.saveTokenSettings}
        runAction={handlers.runAction}
        sessionId={sessionId}
        characterId={characterId}
        characterName={characterName}
      />
    </div>
  );
});
