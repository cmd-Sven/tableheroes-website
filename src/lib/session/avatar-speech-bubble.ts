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
  diceGlyphs?: { sides: number; value: number }[];
};

const DICE_ACTIVITY_TYPES = new Set([
  "dice",
  "attack_pending",
  "skill_check",
  "saving_throw",
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
export function parseDiceBubbleParts(
  meta: unknown,
): { sides: number; value: number }[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const row = meta as Record<string, unknown>;
  if (Array.isArray(row.bubbleParts)) {
    return row.bubbleParts
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const rec = p as Record<string, unknown>;
        const sides = Math.round(Number(rec.sides));
        const value = Math.round(Number(rec.value));
        if (!Number.isFinite(sides) || !Number.isFinite(value)) return null;
        return { sides, value };
      })
      .filter((p): p is { sides: number; value: number } => p != null);
  }
  const used = typeof row.usedRoll === "number" ? row.usedRoll : null;
  const sides = typeof row.sides === "number" ? row.sides : 20;
  if (used != null) return [{ sides, value: used }];
  return [];
}

/** Kurztext für Würfel-Sprechblase aus Activity-Meta (inkl. Modifikatoren / Erschöpfung). */
export function formatDiceSpeechBubbleText(meta: unknown, fallbackText?: string): string {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const row = meta as Record<string, unknown>;
    // Chat-Breakdown (z. B. „15 − 2 = 13“) — enthält Erschöpfung & andere Mods
    if (typeof row.display === "string" && row.display.trim()) {
      return row.display.trim();
    }
    const total = typeof row.total === "number" ? row.total : null;
    const used = typeof row.usedRoll === "number" ? row.usedRoll : null;
    const mod = typeof row.modifier === "number" ? row.modifier : 0;
    if (total != null && used != null && mod !== 0) {
      const modStr = mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`;
      return `${used}${modStr} = ${total}`;
    }
    if (total != null) {
      const label =
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim()
          : typeof row.weaponName === "string" && row.weaponName.trim()
            ? row.weaponName.trim()
            : null;
      if (label) return `${label} → ${total}`;
      if (typeof row.formula === "string" && row.formula.trim()) {
        return `${row.formula.trim()} → ${total}`;
      }
      return String(total);
    }
  }

  const parts = parseDiceBubbleParts(meta);
  if (parts.length > 0) {
    return parts.map((p) => String(p.value)).join(" · ");
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
  const type = String(entry.type ?? "");
  if (type !== "player_action" && type !== "chat" && type !== "message") return null;
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
      diceGlyphs: parseDiceBubbleParts(entry.meta),
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
