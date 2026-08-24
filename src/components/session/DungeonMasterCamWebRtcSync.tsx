/**
 * DungeonMasterCamWebRtcSync — Publishes the GM Overlord-Cam stream to other participants.
 */
"use client";

import { useEffect } from "react";
import { useDungeonMasterCamContext } from "./DungeonMasterCamProvider";
import { useLiveSessionWebcamOptional } from "./LiveSessionWebcamProvider";
import { dmStreamKey } from "@/src/lib/session/avatar-webcam-webrtc";

type Props = {
  userId: string;
};

export function DungeonMasterCamWebRtcSync({ userId }: Props) {
  const dmCam = useDungeonMasterCamContext();
  const webrtc = useLiveSessionWebcamOptional();

  useEffect(() => {
    if (!webrtc || !userId) return;
    const key = dmStreamKey(userId);
    if (dmCam.phase === "active") {
      const stream = dmCam.getStream();
      if (stream) {
        webrtc.publishStream(key, stream);
      }
    } else {
      webrtc.unpublishStream(key);
    }
    return () => {
      webrtc.unpublishStream(key);
    };
  }, [dmCam.phase, dmCam.getStream, userId, webrtc]);

  return null;
}
