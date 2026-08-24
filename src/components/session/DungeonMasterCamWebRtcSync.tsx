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
  const { phase, getStream } = useDungeonMasterCamContext();
  const webrtc = useLiveSessionWebcamOptional();
  const publishStream = webrtc?.publishStream;
  const unpublishStream = webrtc?.unpublishStream;

  useEffect(() => {
    if (!publishStream || !unpublishStream || !userId) return;
    const key = dmStreamKey(userId);
    if (phase === "active") {
      const stream = getStream();
      if (stream) {
        publishStream(key, stream);
      }
    } else {
      unpublishStream(key);
    }
    return () => {
      unpublishStream(key);
    };
  }, [getStream, phase, publishStream, unpublishStream, userId]);

  return null;
}
