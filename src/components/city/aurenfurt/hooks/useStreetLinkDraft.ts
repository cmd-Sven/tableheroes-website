"use client";

import { useEffect, useMemo, useState } from "react";
import {
  STREET_CATEGORY_META,
  candidateConnectStreets,
  validateStreetConnections,
  type AurenfurtStreet,
  type StreetCategory,
} from "../aurenfurt-streets";

export type StreetLinkDraft = {
  category: StreetCategory;
  width: number;
  connectsTo: string[];
};

type UpdateStreet = (
  streetId: string,
  patch: Partial<Omit<AurenfurtStreet, "id" | "points" | "districtIds">>,
) => void;

/** Entwurf für Kategorie, Breite und Verbindungen der gewählten Straße (Draft/Save). */
export function useStreetLinkDraft(
  activeStreet: AurenfurtStreet | null,
  streets: AurenfurtStreet[],
  onUpdateStreet: UpdateStreet,
) {
  const [linkDraft, setLinkDraft] = useState<StreetLinkDraft | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeStreet) {
      setLinkDraft(null);
      setLinkError(null);
      return;
    }
    setLinkDraft({
      category: activeStreet.category,
      width: activeStreet.width,
      connectsTo: [...activeStreet.connectsTo],
    });
    setLinkError(null);
    // Sync nur bei Straßenwechsel oder gespeicherten Link-Feldern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeStreet?.id,
    activeStreet?.category,
    activeStreet?.width,
    activeStreet ? activeStreet.connectsTo.join("|") : "",
  ]);

  const connectCandidates = useMemo(() => {
    if (!activeStreet) return [];
    return candidateConnectStreets(activeStreet, streets);
  }, [activeStreet, streets]);

  const draftConnectionError = useMemo(() => {
    if (!linkDraft) return null;
    return validateStreetConnections(linkDraft, streets);
  }, [linkDraft, streets]);

  function changeDraftCategory(category: StreetCategory) {
    setLinkDraft((current) => {
      if (!current) return current;
      const width =
        current.width === STREET_CATEGORY_META[current.category].defaultWidth
          ? STREET_CATEGORY_META[category].defaultWidth
          : current.width;
      return { ...current, category, width };
    });
    setLinkError(null);
  }

  function toggleConnect(streetId: string) {
    setLinkDraft((current) => {
      if (!current) return current;
      const has = current.connectsTo.includes(streetId);
      return {
        ...current,
        connectsTo: has
          ? current.connectsTo.filter((id) => id !== streetId)
          : [...current.connectsTo, streetId],
      };
    });
    setLinkError(null);
  }

  function saveStreetLinks() {
    if (!activeStreet || !linkDraft) return;
    const error = validateStreetConnections(linkDraft, streets);
    if (error) {
      setLinkError(error);
      return;
    }
    setLinkError(null);
    onUpdateStreet(activeStreet.id, {
      category: linkDraft.category,
      width: linkDraft.width,
      connectsTo: linkDraft.connectsTo,
    });
  }

  const linkDirty =
    Boolean(activeStreet && linkDraft) &&
    (linkDraft!.category !== activeStreet!.category ||
      linkDraft!.width !== activeStreet!.width ||
      linkDraft!.connectsTo.length !== activeStreet!.connectsTo.length ||
      linkDraft!.connectsTo.some((id, i) => id !== activeStreet!.connectsTo[i]));

  return {
    linkDraft,
    setLinkDraft,
    linkError,
    setLinkError,
    linkDirty,
    draftConnectionError,
    connectCandidates,
    changeDraftCategory,
    toggleConnect,
    saveStreetLinks,
  };
}
