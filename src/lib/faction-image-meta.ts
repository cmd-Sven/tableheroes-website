import {
  classifyProfileMediaFactionBanner,
  classifyProfileMediaFactionEmblem,
} from "@/src/lib/profile-media-url";

export type FactionImageMeta = {
  image_is_ai_generated: boolean;
  image_upload_rights_confirmed: boolean | null;
};

/** Server-/Client-Auflösung für Wappen oder Banner anhand Storage-Pfad und Formular-Flags. */
export function resolveFactionImageMeta(
  userId: string,
  kind: "emblem" | "banner",
  input: {
    imageUrl?: string | null;
    isAiGenerated?: boolean;
    uploadRightsConfirmed?: boolean | null;
  },
): FactionImageMeta {
  const imageUrl = input.imageUrl?.trim() ?? "";
  if (!imageUrl) {
    return { image_is_ai_generated: false, image_upload_rights_confirmed: null };
  }

  const classify =
    kind === "emblem" ? classifyProfileMediaFactionEmblem : classifyProfileMediaFactionBanner;
  const storageKind = classify(imageUrl, userId);
  if (storageKind === "ai-generated") {
    return { image_is_ai_generated: true, image_upload_rights_confirmed: null };
  }
  if (storageKind === "user-upload") {
    return { image_is_ai_generated: false, image_upload_rights_confirmed: true };
  }

  if (input.isAiGenerated === true) {
    return { image_is_ai_generated: true, image_upload_rights_confirmed: null };
  }
  if (input.uploadRightsConfirmed === true) {
    return { image_is_ai_generated: false, image_upload_rights_confirmed: true };
  }

  return { image_is_ai_generated: false, image_upload_rights_confirmed: null };
}

export const FACTION_UPLOAD_RIGHTS_ERROR =
  "Bitte bestätige, dass du die Nutzungsrechte am hochgeladenen Bild besitzt.";

export function assertFactionUploadRightsConfirmed(confirmed: boolean): void {
  if (!confirmed) {
    throw new Error(FACTION_UPLOAD_RIGHTS_ERROR);
  }
}
