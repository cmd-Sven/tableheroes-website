"use client";

import { useSyncExternalStore } from "react";
import {
  commitPlacementAt,
  getPartyTokenDraft,
  getPartyTokenState,
  moveCharacterToken,
  moveGroupToken,
  partyTokenVersion,
  subscribePartyTokens,
} from "../aurenfurt-party-tokens";
import type { UvPoint } from "../aurenfurt-district-polygons";
import { FreeMapPlaceSurface } from "./FreeMapPlaceSurface";
import { HoloPartyTokenMarker } from "./HoloPartyTokenMarker";

type Props = {
  canEdit: boolean;
  onOrbitLock: (locked: boolean) => void;
  onDragActive: (active: boolean) => void;
  onPersist?: () => void;
};

/** Party-/Gruppen-Tokens + Platzierungsfläche auf der 3D-Karte. */
export function HoloPartyTokenLayer({
  canEdit,
  onOrbitLock,
  onDragActive,
  onPersist,
}: Props) {
  useSyncExternalStore(subscribePartyTokens, partyTokenVersion, partyTokenVersion);
  const state = getPartyTokenState();
  const draft = getPartyTokenDraft();
  const placing = Boolean(draft) && canEdit;
  const showIndividuals = !state.group;

  function persist() {
    onPersist?.();
  }

  function onPlace(point: UvPoint) {
    if (!canEdit) return;
    if (commitPlacementAt(point)) persist();
  }

  function onMoveGroup(_id: string, point: UvPoint) {
    moveGroupToken(point);
  }

  function onMoveCharacter(id: string, point: UvPoint) {
    moveCharacterToken(id, point);
  }

  return (
    <>
      <FreeMapPlaceSurface
        active={placing}
        onPlace={onPlace}
        onOrbitLock={onOrbitLock}
      />

      {state.group ? (
        <HoloPartyTokenMarker
          id="__group__"
          label="Gruppe"
          isGroup
          u={state.group.u}
          v={state.group.v}
          canDrag={canEdit}
          onMove={onMoveGroup}
          onCommit={() => persist()}
          onOrbitLock={onOrbitLock}
          onDragActive={onDragActive}
        />
      ) : null}

      {showIndividuals
        ? Object.entries(state.characters).map(([id, token]) => (
            <HoloPartyTokenMarker
              key={id}
              id={id}
              label={token.name}
              imageUrl={token.imageUrl}
              u={token.u}
              v={token.v}
              canDrag={canEdit}
              onMove={onMoveCharacter}
              onCommit={() => persist()}
              onOrbitLock={onOrbitLock}
              onDragActive={onDragActive}
            />
          ))
        : null}
    </>
  );
}
