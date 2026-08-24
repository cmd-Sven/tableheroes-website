/**
 * LiveSessionWebcamProvider — WebRTC mesh for sharing avatar and GM webcam streams in live sessions.
 * Uses Supabase Realtime broadcast for signaling; video tracks flow peer-to-peer.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  DEFAULT_ICE_SERVERS,
  WEBCAM_PUBLISH_BROADCAST,
  WEBCAM_PUBLISH_EVENT,
  WEBCAM_PULL_BROADCAST,
  WEBCAM_PULL_EVENT,
  WEBCAM_SIGNAL_BROADCAST,
  WEBCAM_SIGNAL_EVENT,
  WEBCAM_UNPUBLISH_BROADCAST,
  WEBCAM_UNPUBLISH_EVENT,
  type WebcamPublishDetail,
  type WebcamPullDetail,
  type WebcamSignalDetail,
} from "@/src/lib/session/avatar-webcam-webrtc";

type LiveSessionWebcamApi = {
  publishStream: (streamKey: string, stream: MediaStream) => void;
  unpublishStream: (streamKey: string) => void;
  getRemoteStream: (streamKey: string) => MediaStream | null;
  getRemoteStreamByPrefix: (prefix: string) => MediaStream | null;
  /** Bumps when remote streams change so hooks can re-read getRemoteStream. */
  remoteStreamVersion: number;
};

const LiveSessionWebcamContext = createContext<LiveSessionWebcamApi | null>(null);

type Props = {
  children: ReactNode;
  userId: string;
  liveChannelRef: MutableRefObject<RealtimeChannel | null>;
  presentUserIds: Set<string>;
};

function pcKey(streamKey: string, peerUserId: string): string {
  return `${streamKey}::${peerUserId}`;
}

export function LiveSessionWebcamProvider({
  children,
  userId,
  liveChannelRef,
  presentUserIds,
}: Props) {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);

  const publishedRef = useRef<Map<string, MediaStream>>(new Map());
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef(remoteStreams);

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  const bumpRemote = useCallback(() => {
    setRemoteStreamVersion((v) => v + 1);
  }, []);

  const sendSignal = useCallback(
    (detail: Omit<WebcamSignalDetail, "remote" | "senderId">) => {
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: WEBCAM_SIGNAL_BROADCAST,
        payload: { ...detail, senderId: userId },
      });
    },
    [liveChannelRef, userId],
  );

  const closePc = useCallback((key: string) => {
    const pc = pcsRef.current.get(key);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcsRef.current.delete(key);
    }
  }, []);

  const closePublisherPcsForStream = useCallback(
    (streamKey: string) => {
      for (const key of [...pcsRef.current.keys()]) {
        if (key.startsWith(`${streamKey}::`)) closePc(key);
      }
    },
    [closePc],
  );

  const removeRemoteStream = useCallback(
    (streamKey: string) => {
      setRemoteStreams((prev) => {
        if (!prev[streamKey]) return prev;
        const next = { ...prev };
        delete next[streamKey];
        return next;
      });
      bumpRemote();
    },
    [bumpRemote],
  );

  const createPublisherPc = useCallback(
    async (streamKey: string, targetUserId: string, stream: MediaStream) => {
      if (targetUserId === userId) return;
      const key = pcKey(streamKey, targetUserId);
      closePc(key);

      const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      pcsRef.current.set(key, pc);

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        sendSignal({
          type: "ice",
          streamKey,
          targetId: targetUserId,
          candidate: ev.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          closePc(key);
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({
          type: "offer",
          streamKey,
          targetId: targetUserId,
          sdp: offer,
        });
      } catch {
        closePc(key);
      }
    },
    [closePc, sendSignal, userId],
  );

  const offerToAllPresent = useCallback(
    (streamKey: string, stream: MediaStream) => {
      presentUserIds.forEach((pid) => {
        if (pid !== userId) {
          void createPublisherPc(streamKey, pid, stream);
        }
      });
    },
    [createPublisherPc, presentUserIds, userId],
  );

  const handleOffer = useCallback(
    async (detail: WebcamSignalDetail) => {
      const { streamKey, senderId, sdp } = detail;
      if (!sdp || senderId === userId) return;

      const key = pcKey(streamKey, senderId);
      closePc(key);

      const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      pcsRef.current.set(key, pc);

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        setRemoteStreams((prev) => {
          if (prev[streamKey] === stream) return prev;
          return { ...prev, [streamKey]: stream };
        });
        bumpRemote();
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        sendSignal({
          type: "ice",
          streamKey,
          targetId: senderId,
          candidate: ev.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePc(key);
          if (!remoteStreamsRef.current[streamKey]) return;
          removeRemoteStream(streamKey);
        }
      };

      try {
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({
          type: "answer",
          streamKey,
          targetId: senderId,
          sdp: answer,
        });
      } catch {
        closePc(key);
      }
    },
    [bumpRemote, closePc, removeRemoteStream, sendSignal, userId],
  );

  const handleAnswer = useCallback(
    async (detail: WebcamSignalDetail) => {
      const { streamKey, senderId, sdp } = detail;
      if (!sdp || senderId === userId) return;
      const key = pcKey(streamKey, senderId);
      const pc = pcsRef.current.get(key);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(sdp);
      } catch {
        closePc(key);
      }
    },
    [closePc, userId],
  );

  const handleIce = useCallback(
    async (detail: WebcamSignalDetail) => {
      const { streamKey, senderId, candidate } = detail;
      if (!candidate || senderId === userId) return;
      const key = pcKey(streamKey, senderId);
      const pc = pcsRef.current.get(key);
      if (!pc) return;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ICE may arrive before remote description — ignore */
      }
    },
    [userId],
  );

  const handleRemoteUnpublish = useCallback(
    (detail: WebcamPublishDetail) => {
      const { streamKey, senderId } = detail;
      if (!streamKey || senderId === userId) return;
      closePc(pcKey(streamKey, senderId));
      removeRemoteStream(streamKey);
    },
    [closePc, removeRemoteStream, userId],
  );

  const handleRemotePublish = useCallback(
    (detail: WebcamPublishDetail) => {
      const { streamKey, senderId } = detail;
      if (!streamKey || senderId === userId) return;
      if (remoteStreamsRef.current[streamKey]) return;
      if (publishedRef.current.has(streamKey)) return;
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: WEBCAM_PULL_BROADCAST,
        payload: { streamKey, requesterId: userId } satisfies WebcamPullDetail,
      });
    },
    [liveChannelRef, userId],
  );

  const handlePullRequest = useCallback(
    (detail: WebcamPullDetail) => {
      const { streamKey, requesterId } = detail;
      if (!streamKey || !requesterId || requesterId === userId) return;
      const stream = publishedRef.current.get(streamKey);
      if (!stream) return;
      void createPublisherPc(streamKey, requesterId, stream);
    },
    [createPublisherPc, userId],
  );

  useEffect(() => {
    const onSignal = (ev: Event) => {
      const detail = (ev as CustomEvent<WebcamSignalDetail>).detail;
      if (!detail?.streamKey || !detail.senderId) return;
      if (detail.remote && detail.senderId === userId) return;
      if (detail.targetId && detail.targetId !== userId) return;

      if (detail.type === "offer") void handleOffer(detail);
      else if (detail.type === "answer") void handleAnswer(detail);
      else if (detail.type === "ice") void handleIce(detail);
    };

    const onUnpublish = (ev: Event) => {
      const detail = (ev as CustomEvent<WebcamPublishDetail>).detail;
      if (!detail?.streamKey) return;
      if (detail.remote && detail.senderId === userId) return;
      handleRemoteUnpublish(detail);
    };

    const onPublish = (ev: Event) => {
      const detail = (ev as CustomEvent<WebcamPublishDetail>).detail;
      if (!detail?.streamKey) return;
      if (detail.remote && detail.senderId === userId) return;
      handleRemotePublish(detail);
    };

    const onPull = (ev: Event) => {
      const detail = (ev as CustomEvent<WebcamPullDetail>).detail;
      if (!detail?.streamKey || !detail.requesterId) return;
      if (detail.remote && detail.requesterId === userId) return;
      handlePullRequest(detail);
    };

    window.addEventListener(WEBCAM_SIGNAL_EVENT, onSignal);
    window.addEventListener(WEBCAM_UNPUBLISH_EVENT, onUnpublish);
    window.addEventListener(WEBCAM_PUBLISH_EVENT, onPublish);
    window.addEventListener(WEBCAM_PULL_EVENT, onPull);
    return () => {
      window.removeEventListener(WEBCAM_SIGNAL_EVENT, onSignal);
      window.removeEventListener(WEBCAM_UNPUBLISH_EVENT, onUnpublish);
      window.removeEventListener(WEBCAM_PUBLISH_EVENT, onPublish);
      window.removeEventListener(WEBCAM_PULL_EVENT, onPull);
    };
  }, [
    handleAnswer,
    handleIce,
    handleOffer,
    handlePullRequest,
    handleRemotePublish,
    handleRemoteUnpublish,
    userId,
  ]);

  // Offer streams to newly present participants.
  useEffect(() => {
    publishedRef.current.forEach((stream, streamKey) => {
      offerToAllPresent(streamKey, stream);
    });
  }, [offerToAllPresent, presentUserIds]);

  const publishStream = useCallback(
    (streamKey: string, stream: MediaStream) => {
      publishedRef.current.set(streamKey, stream);
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: WEBCAM_PUBLISH_BROADCAST,
        payload: { streamKey, senderId: userId } satisfies WebcamPublishDetail,
      });
      offerToAllPresent(streamKey, stream);
    },
    [liveChannelRef, offerToAllPresent, userId],
  );

  const unpublishStream = useCallback(
    (streamKey: string) => {
      publishedRef.current.delete(streamKey);
      closePublisherPcsForStream(streamKey);
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: WEBCAM_UNPUBLISH_BROADCAST,
        payload: { streamKey, senderId: userId } satisfies WebcamPublishDetail,
      });
    },
    [closePublisherPcsForStream, liveChannelRef, userId],
  );

  useEffect(() => {
    return () => {
      for (const key of [...pcsRef.current.keys()]) closePc(key);
      pcsRef.current.clear();
      publishedRef.current.clear();
    };
  }, [closePc]);

  const getRemoteStream = useCallback(
    (streamKey: string) => remoteStreamsRef.current[streamKey] ?? null,
    [],
  );

  const getRemoteStreamByPrefix = useCallback((prefix: string) => {
    for (const [key, stream] of Object.entries(remoteStreamsRef.current)) {
      if (key.startsWith(prefix)) return stream;
    }
    return null;
  }, []);

  const api = useMemo<LiveSessionWebcamApi>(
    () => ({
      publishStream,
      unpublishStream,
      getRemoteStream,
      getRemoteStreamByPrefix,
      remoteStreamVersion,
    }),
    [getRemoteStream, getRemoteStreamByPrefix, publishStream, remoteStreamVersion, unpublishStream],
  );

  return (
    <LiveSessionWebcamContext.Provider value={api}>{children}</LiveSessionWebcamContext.Provider>
  );
}

export function useLiveSessionWebcam(): LiveSessionWebcamApi {
  const ctx = useContext(LiveSessionWebcamContext);
  if (!ctx) {
    throw new Error("useLiveSessionWebcam must be used within LiveSessionWebcamProvider");
  }
  return ctx;
}

export function useLiveSessionWebcamOptional(): LiveSessionWebcamApi | null {
  return useContext(LiveSessionWebcamContext);
}
