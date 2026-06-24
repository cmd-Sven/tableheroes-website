export type PublicImageRights = {
  imageUrl?: string | null;
  imageIsAiGenerated?: boolean | null;
  imageUploadRightsConfirmed?: boolean | null;
};

/** Öffentliche Seite: Bild nur bei bestätigten Rechten oder KI-Kennzeichnung. */
export function canShowPublicImage(rights: PublicImageRights): boolean {
  const url = rights.imageUrl?.trim();
  if (!url) return false;
  if (rights.imageIsAiGenerated === true) return true;
  return rights.imageUploadRightsConfirmed === true;
}

export function publicImageBlockReason(rights: PublicImageRights): string | null {
  const url = rights.imageUrl?.trim();
  if (!url) return null;
  if (canShowPublicImage(rights)) return null;
  return "Bild wird öffentlich nicht angezeigt: Bitte Nutzungsrechte bestätigen oder als KI-generiert kennzeichnen.";
}
