/**
 * avatar-webcam-bridge — Session-wide avatar↔webcam display sync (broadcast + window events).
 * Camera capture stays on the owning player client; modes are coordinated for GM control.
 */
export const AVATAR_WEBCAM_MODE_EVENT = "th:avatar-webcam-mode";
export const AVATAR_WEBCAM_MASTER_EVENT = "th:avatar-webcam-master";

export const AVATAR_WEBCAM_MODE_BROADCAST = "avatar_webcam_mode";
export const AVATAR_WEBCAM_MASTER_BROADCAST = "avatar_webcam_master";

export type AvatarWebcamDisplayMode = "avatar" | "webcam";

export type AvatarWebcamModeDetail = {
  characterId: string;
  mode: AvatarWebcamDisplayMode;
  senderId?: string | null;
  /** true = from remote broadcast — do not re-broadcast */
  remote?: boolean;
};

export type AvatarWebcamMasterDetail = {
  /** When false, all party webcams are forced off. */
  enabled: boolean;
  senderId?: string | null;
  remote?: boolean;
};

export function dispatchAvatarWebcamMode(detail: AvatarWebcamModeDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AVATAR_WEBCAM_MODE_EVENT, { detail }));
}

export function dispatchAvatarWebcamMaster(detail: AvatarWebcamMasterDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AVATAR_WEBCAM_MASTER_EVENT, { detail }));
}
