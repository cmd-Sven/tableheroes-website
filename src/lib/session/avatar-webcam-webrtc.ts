/**
 * avatar-webcam-webrtc — WebRTC signaling constants and stream-key helpers for live session webcams.
 * Signaling travels over Supabase Realtime broadcast; media is peer-to-peer.
 */
export const WEBCAM_SIGNAL_BROADCAST = "webcam_signal";
export const WEBCAM_PUBLISH_BROADCAST = "webcam_publish";
export const WEBCAM_UNPUBLISH_BROADCAST = "webcam_unpublish";
export const WEBCAM_PULL_BROADCAST = "webcam_pull";

export const WEBCAM_SIGNAL_EVENT = "th:webcam-signal";
export const WEBCAM_PUBLISH_EVENT = "th:webcam-publish";
export const WEBCAM_UNPUBLISH_EVENT = "th:webcam-unpublish";
export const WEBCAM_PULL_EVENT = "th:webcam-pull";

export type WebcamSignalType = "offer" | "answer" | "ice";

export type WebcamSignalDetail = {
  type: WebcamSignalType;
  streamKey: string;
  senderId: string;
  targetId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  /** true = from remote broadcast — do not re-broadcast */
  remote?: boolean;
};

export type WebcamPublishDetail = {
  streamKey: string;
  senderId: string;
  remote?: boolean;
};

export type WebcamPullDetail = {
  streamKey: string;
  requesterId: string;
  remote?: boolean;
};

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function characterStreamKey(characterId: string): string {
  return `char:${characterId}`;
}

export function dmStreamKey(userId: string): string {
  return `dm:${userId}`;
}

export function dispatchWebcamSignal(detail: WebcamSignalDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEBCAM_SIGNAL_EVENT, { detail }));
}

export function dispatchWebcamPublish(detail: WebcamPublishDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEBCAM_PUBLISH_EVENT, { detail }));
}

export function dispatchWebcamUnpublish(detail: WebcamPublishDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEBCAM_UNPUBLISH_EVENT, { detail }));
}

export function dispatchWebcamPull(detail: WebcamPullDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEBCAM_PULL_EVENT, { detail }));
}
