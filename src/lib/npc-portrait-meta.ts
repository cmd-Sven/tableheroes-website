import { classifyProfileMediaNpcPortrait, classifyProfileMediaBestariumPortrait } from "@/src/lib/profile-media-url";

export type NpcPortraitMetaInput = {
  imageUrl?: string | null;
  portraitFile: File | null;
  portraitIsAiGenerated: boolean;
  uploadRightsConfirmed: boolean;
  /** Externe Bild-URL ohne Upload — Nutzungsrechte bestätigt */
  urlRightsConfirmed?: boolean;
};

export type NpcPortraitMeta = {
  image_is_ai_generated: boolean;
  image_upload_rights_confirmed: boolean | null;
};

const UPLOAD_RIGHTS_ERROR =
  "Bitte bestätige, dass du die Nutzungsrechte am hochgeladenen Bild besitzt.";

/** Metadaten für create/update, wenn ein neues Bild gesetzt wird. */
export function buildNpcPortraitMeta(input: NpcPortraitMetaInput): NpcPortraitMeta {
  const imageUrl = input.imageUrl?.trim() ?? "";
  if (!imageUrl) {
    return {
      image_is_ai_generated: false,
      image_upload_rights_confirmed: null,
    };
  }

  if (input.portraitFile) {
    if (!input.uploadRightsConfirmed) {
      throw new Error(UPLOAD_RIGHTS_ERROR);
    }
    return {
      image_is_ai_generated: false,
      image_upload_rights_confirmed: true,
    };
  }

  if (input.portraitIsAiGenerated) {
    return {
      image_is_ai_generated: true,
      image_upload_rights_confirmed: null,
    };
  }

  if (input.urlRightsConfirmed) {
    return {
      image_is_ai_generated: false,
      image_upload_rights_confirmed: true,
    };
  }

  return {
    image_is_ai_generated: false,
    image_upload_rights_confirmed: null,
  };
}

/**
 * Server-seitige Auflösung anhand Storage-Pfad (KI vs. Nutzer-Upload)
 * und Formular-Flags — verhindert Fehlklassifikation bei profile-media-URLs.
 */
export function resolveNpcPortraitMetaForServer(
  userId: string,
  input: {
    imageUrl?: string | null;
    portraitIsAiGenerated?: boolean;
    uploadRightsConfirmed?: boolean | null;
  },
): NpcPortraitMeta {
  const imageUrl = input.imageUrl?.trim() ?? "";
  if (!imageUrl) {
    return {
      image_is_ai_generated: false,
      image_upload_rights_confirmed: null,
    };
  }

  const storageKind =
    classifyProfileMediaNpcPortrait(imageUrl, userId) ??
    classifyProfileMediaBestariumPortrait(imageUrl, userId);
  if (storageKind === "ai-generated") {
    return {
      image_is_ai_generated: true,
      image_upload_rights_confirmed: null,
    };
  }
  if (storageKind === "user-upload") {
    return {
      image_is_ai_generated: false,
      image_upload_rights_confirmed: true,
    };
  }

  return buildNpcPortraitMeta({
    imageUrl,
    portraitFile: null,
    portraitIsAiGenerated: input.portraitIsAiGenerated === true,
    uploadRightsConfirmed: input.uploadRightsConfirmed === true,
    urlRightsConfirmed: input.uploadRightsConfirmed === true,
  });
}

export function assertUploadRightsConfirmed(confirmed: boolean): void {
  if (!confirmed) {
    throw new Error(UPLOAD_RIGHTS_ERROR);
  }
}
