/**
 * DungeonMasterCamWebRtcSync — Publishes the GM Overlord-Cam stream to other participants.
 */
"use client";

import { useEffect, useRef } from "react";
import { useDungeonMasterCamContext } from "./DungeonMasterCamProvider";
import { useLiveSessionWebcamOptional } from "./LiveSessionWebcamProvider";
import { dmStreamKey } from "@/src/lib/session/avatar-webcam-webrtc";

type Props = {
  userId: string;
};

export function DungeonMasterCamWebRtcSync({ userId }: Props) {
  const { phase, getStream } = useDungeonMasterCamContext();
  const webrtc = useLiveSessionWebcamOptional();
  const publishStreamRef = useRef(webrtc?.publishStream);
  const unpublishStreamRef = useRef(webrtc?.unpublishStream);
  publishStreamRef.current = webrtc?.publishStream;
  unpublishStreamRef.current = webrtc?.unpublishStream;

  useEffect(() => {
    if (!userId) return;
    const key = dmStreamKey(userId);
    if (phase === "active") {
      const stream = getStream();
      if (stream) {
        publishStreamRef.current?.(key, stream);
      }
    } else {
      unpublishStreamRef.current?.(key);
    }
    return () => {
      unpublishStreamRef.current?.(key);
    };
  }, [getStream, phase, userId]);

  return null;
}
