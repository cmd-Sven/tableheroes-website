/**
 * avatar-webcam-webrtc — WebRTC signaling constants and stream-key helpers for live session webcams.
 * Signaling travels over Supabase Realtime broadcast; media is peer-to-peer.
 *
 * ICE: STUN-only by default (works on many home networks). Behind symmetric NAT / strict firewalls,
 * add a TURN server to DEFAULT_ICE_SERVERS — TURN remains optional for typical party play.
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

/** GM Overlord-Cam: 480p @ ~24fps — readable for players without drowning a 6-peer mesh. */
export const GM_WEBCAM_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 24, max: 30 },
};

/** Player avatar cam: slightly lower capture — portraits are small circles. */
export const PLAYER_WEBCAM_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 480 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
};

/** Target encode bitrate (bps) for mesh publish — GM is larger on screen. */
export const GM_WEBCAM_MAX_BITRATE = 750_000;
export const PLAYER_WEBCAM_MAX_BITRATE = 400_000;
export const WEBCAM_MAX_FRAMERATE = 24;

export function characterStreamKey(characterId: string): string {
  return `char:${characterId}`;
}

export function dmStreamKey(userId: string): string {
  return `dm:${userId}`;
}

export function isDmStreamKey(streamKey: string): boolean {
  return streamKey.startsWith("dm:");
}

/** Bind a MediaStream to a <video> element (muted + playsInline for autoplay). */
export function bindWebcamVideoElement(
  el: HTMLVideoElement | null,
  stream: MediaStream | null,
): void {
  if (!el) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream;
  }
  if (!stream) return;
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  void el.play().catch(() => {
    /* autoplay may need a gesture; stream still live */
  });
}

/**
 * Cap outbound video bitrate/framerate after addTrack.
 * Helps avoid muddy default encodes and reduces mesh congestion stutter.
 */
export async function applyOutboundVideoParams(
  pc: RTCPeerConnection,
  maxBitrate: number,
  options?: { scaleResolutionDownBy?: number; maxFramerate?: number },
): Promise<void> {
  const maxFramerate = options?.maxFramerate ?? WEBCAM_MAX_FRAMERATE;
  const scale = options?.scaleResolutionDownBy;
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      const enc = params.encodings[0] ?? {};
      enc.maxBitrate = maxBitrate;
      enc.maxFramerate = maxFramerate;
      if (scale && scale >= 1) {
        enc.scaleResolutionDownBy = scale;
      }
      params.encodings[0] = enc;
      await sender.setParameters(params);
    } catch {
      /* setParameters unsupported or negotiation in flight */
    }
  }
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
