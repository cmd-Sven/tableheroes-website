export const AVATAR_SPEECH_BUBBLE_EVENT = "th:avatar-speech-bubble";

/** Sichtbarkeit inkl. Fade (ca. 3–5 s). */
export const AVATAR_SPEECH_BUBBLE_DURATION_MS = 4000;

export const AVATAR_SPEECH_BUBBLE_MAX_CHARS = 72;

export type AvatarSpeechBubbleKind = "dice" | "chat";

export type AvatarSpeechBubbleDetail = {
  characterId: string;
  text: string;
  kind: AvatarSpeechBubbleKind;
  /** Activity-Log-ID zur Deduplizierung (lokal + remote). */
  sourceId?: string;
  durationMs?: number;
};

const DICE_ACTIVITY_TYPES = new Set([
  "dice",
  "attack_pending",
  "skill_check",
  "damage_roll",
]);

const EQUIPMENT_CHAT_SKIP_RE =
  /wechselt Ausrüstung|wechselt Waffenkombination|benutzt:|nutzt „|wirkt „|Loadout/i;

export function truncateSpeechBubbleText(
  text: string,
  maxChars = AVATAR_SPEECH_BUBBLE_MAX_CHARS,
): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function dispatchAvatarSpeechBubble(detail: AvatarSpeechBubbleDetail): void {
  if (typeof window === "undefined") return;
  const text = truncateSpeechBubbleText(detail.text);
  if (!text || !detail.characterId) return;
  window.dispatchEvent(
    new CustomEvent(AVATAR_SPEECH_BUBBLE_EVENT, {
      detail: { ...detail, text },
    }),
  );
}

/** Kurztext für Würfel-Sprechblase aus Activity-Meta. */
export function formatDiceSpeechBubbleText(meta: unknown, fallbackText?: string): string {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const row = meta as Record<string, unknown>;
    const total = typeof row.total === "number" ? row.total : null;
    const sides = typeof row.sides === "number" ? row.sides : null;
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : typeof row.weaponName === "string" && row.weaponName.trim()
          ? row.weaponName.trim()
          : null;

    if (label && total != null) {
      return `${label} → ${total}`;
    }
    if (sides != null && total != null) {
      return `W${sides} → ${total}`;
    }
    if (typeof row.display === "string" && row.display.trim()) {
      return row.display.trim();
    }
    if (typeof row.formula === "string" && row.formula.trim() && total != null) {
      return `${row.formula.trim()} → ${total}`;
    }
  }

  if (fallbackText?.trim()) {
    const colon = fallbackText.indexOf(": ");
    if (colon >= 0) return fallbackText.slice(colon + 2).trim();
    return fallbackText.trim();
  }
  return "Würfel…";
}

/** Chat-Text aus player_action-Eintrag; null wenn kein Chat (z. B. Ausrüstung). */
export function chatSpeechBubbleTextFromEntry(entry: {
  type?: string | null;
  text?: string | null;
}): string | null {
  if (entry.type !== "player_action") return null;
  const text = (entry.text ?? "").trim();
  if (!text || EQUIPMENT_CHAT_SKIP_RE.test(text)) return null;

  const colon = text.indexOf(": ");
  if (colon >= 0) {
    const body = text.slice(colon + 2).trim();
    return body || null;
  }
  return text;
}

export function speechBubbleFromActivityEntry(entry: {
  id?: string | null;
  type?: string | null;
  text?: string | null;
  character_id?: string | null;
  meta?: unknown;
}): AvatarSpeechBubbleDetail | null {
  const characterId = entry.character_id?.trim();
  if (!characterId) return null;
  const type = String(entry.type ?? "");

  if (DICE_ACTIVITY_TYPES.has(type)) {
    return {
      characterId,
      kind: "dice",
      text: formatDiceSpeechBubbleText(entry.meta, entry.text ?? undefined),
      sourceId: entry.id ?? undefined,
    };
  }

  const chat = chatSpeechBubbleTextFromEntry(entry);
  if (chat) {
    return {
      characterId,
      kind: "chat",
      text: chat,
      sourceId: entry.id ?? undefined,
    };
  }

  return null;
}
