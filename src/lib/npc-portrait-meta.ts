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

export function assertUploadRightsConfirmed(confirmed: boolean): void {
  if (!confirmed) {
    throw new Error(UPLOAD_RIGHTS_ERROR);
  }
}
