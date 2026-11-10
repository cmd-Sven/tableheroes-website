/**
 * Party- und Gruppen-Tokens auf der Aurenfurt-3D-Karte (UV-Koordinaten).
 * Client-Store + optional Session-Persistenz.
 */

export type PartyTokenUv = { u: number; v: number };

export type PlacedPartyCharacterToken = PartyTokenUv & {
  name: string;
  imageUrl: string | null;
};

export type AurenfurtPartyTokenState = {
  group: PartyTokenUv | null;
  characters: Record<string, PlacedPartyCharacterToken>;
};

export type PartyTokenPlacementDraft =
  | { kind: "group"; name: string; imageUrl: string | null }
  | { kind: "character"; characterId: string; name: string; imageUrl: string | null };

const EMPTY: AurenfurtPartyTokenState = { group: null, characters: {} };

let state: AurenfurtPartyTokenState = { ...EMPTY, characters: {} };
let draft: PartyTokenPlacementDraft | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0.02, Math.min(0.98, value));
}

function normalizeUv(raw: unknown): PartyTokenUv | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { u?: unknown; v?: unknown };
  if (typeof row.u !== "number" || typeof row.v !== "number") return null;
  return { u: clamp01(row.u), v: clamp01(row.v) };
}

export function normalizePartyTokenState(raw: unknown): AurenfurtPartyTokenState {
  if (!raw || typeof raw !== "object") return { group: null, characters: {} };
  const row = raw as {
    group?: unknown;
    characters?: unknown;
  };
  const characters: Record<string, PlacedPartyCharacterToken> = {};
  if (row.characters && typeof row.characters === "object") {
    for (const [id, entry] of Object.entries(row.characters as Record<string, unknown>)) {
      if (!id || !entry || typeof entry !== "object") continue;
      const token = entry as {
        u?: unknown;
        v?: unknown;
        name?: unknown;
        imageUrl?: unknown;
      };
      if (typeof token.u !== "number" || typeof token.v !== "number") continue;
      characters[id] = {
        u: clamp01(token.u),
        v: clamp01(token.v),
        name: typeof token.name === "string" && token.name.trim() ? token.name.trim() : "Held",
        imageUrl:
          typeof token.imageUrl === "string" && token.imageUrl.trim()
            ? token.imageUrl.trim()
            : null,
      };
    }
  }
  return {
    group: normalizeUv(row.group),
    characters,
  };
}

export function subscribePartyTokens(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function partyTokenVersion() {
  return version;
}

export function getPartyTokenState(): AurenfurtPartyTokenState {
  return {
    group: state.group ? { ...state.group } : null,
    characters: { ...state.characters },
  };
}

export function getPartyTokenDraft(): PartyTokenPlacementDraft | null {
  return draft ? { ...draft } : null;
}

export function replacePartyTokenState(next: AurenfurtPartyTokenState) {
  state = normalizePartyTokenState(next);
  emit();
}

export function setPartyTokenDraft(next: PartyTokenPlacementDraft | null) {
  draft = next;
  emit();
}

export function clearPartyTokenDraft() {
  draft = null;
  emit();
}

export function placeGroupToken(point: PartyTokenUv) {
  state = {
    group: { u: clamp01(point.u), v: clamp01(point.v) },
    characters: { ...state.characters },
  };
  draft = null;
  emit();
}

export function moveGroupToken(point: PartyTokenUv) {
  if (!state.group) return;
  state = {
    ...state,
    group: { u: clamp01(point.u), v: clamp01(point.v) },
  };
  emit();
}

export function clearGroupToken() {
  state = { ...state, group: null };
  emit();
}

export function placeCharacterToken(
  characterId: string,
  point: PartyTokenUv,
  meta: { name: string; imageUrl: string | null },
) {
  if (!characterId) return;
  state = {
    group: null,
    characters: {
      ...state.characters,
      [characterId]: {
        u: clamp01(point.u),
        v: clamp01(point.v),
        name: meta.name,
        imageUrl: meta.imageUrl,
      },
    },
  };
  draft = null;
  emit();
}

export function moveCharacterToken(characterId: string, point: PartyTokenUv) {
  const current = state.characters[characterId];
  if (!current) return;
  state = {
    ...state,
    characters: {
      ...state.characters,
      [characterId]: {
        ...current,
        u: clamp01(point.u),
        v: clamp01(point.v),
      },
    },
  };
  emit();
}

export function clearCharacterToken(characterId: string) {
  if (!state.characters[characterId]) return;
  const next = { ...state.characters };
  delete next[characterId];
  state = { ...state, characters: next };
  emit();
}

export function commitPlacementAt(point: PartyTokenUv) {
  if (!draft) return false;
  if (draft.kind === "group") {
    placeGroupToken(point);
    return true;
  }
  placeCharacterToken(draft.characterId, point, {
    name: draft.name,
    imageUrl: draft.imageUrl,
  });
  return true;
}
