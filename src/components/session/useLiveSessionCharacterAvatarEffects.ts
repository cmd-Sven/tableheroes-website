/** Roll-FX and speech-bubble window events for live session character avatars. */
import { useEffect, useRef, useState } from "react";
import {
  AVATAR_ROLL_FX_DURATION_MS,
  AVATAR_ROLL_FX_EVENT,
  moodKeyForRollFx,
  type AvatarRollFxDetail,
  type AvatarRollFxKind,
} from "@/src/lib/session/avatar-roll-fx";
import {
  AVATAR_SPEECH_BUBBLE_DURATION_MS,
  AVATAR_SPEECH_BUBBLE_EVENT,
  type AvatarSpeechBubbleDetail,
  type AvatarSpeechBubbleKind,
} from "@/src/lib/session/avatar-speech-bubble";
import type { MoodStateKey } from "@/src/lib/characters/mood-states";

function rememberSourceId(set: Set<string>, sourceId: string | undefined): boolean {
  if (!sourceId) return false;
  if (set.has(sourceId)) return true;
  set.add(sourceId);
  if (set.size > 40) {
    const oldest = set.values().next().value;
    if (oldest) set.delete(oldest);
  }
  return false;
}

export function useLiveSessionCharacterAvatarEffects(characterId: string) {
  const [rollFx, setRollFx] = useState<{
    kind: AvatarRollFxKind;
    moodKey: MoodStateKey;
    endsAt: number;
  } | null>(null);
  const [speechBubble, setSpeechBubble] = useState<{
    kind: AvatarSpeechBubbleKind;
    text: string;
    key: string;
    diceGlyphs?: { sides: number; value: number }[];
  } | null>(null);
  const rollFxTimerRef = useRef<number | null>(null);
  const speechBubbleTimerRef = useRef<number | null>(null);
  const seenRollFxIdsRef = useRef<Set<string>>(new Set());
  const seenSpeechBubbleIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function onRollFx(e: Event) {
      const detail = (e as CustomEvent<AvatarRollFxDetail>).detail;
      if (!detail || detail.characterId !== characterId) return;
      if (rememberSourceId(seenRollFxIdsRef.current, detail.sourceId)) return;
      const duration = detail.durationMs ?? AVATAR_ROLL_FX_DURATION_MS;
      const moodKey = moodKeyForRollFx(detail.kind);
      setRollFx({ kind: detail.kind, moodKey, endsAt: Date.now() + duration });
      if (rollFxTimerRef.current != null) window.clearTimeout(rollFxTimerRef.current);
      rollFxTimerRef.current = window.setTimeout(() => {
        setRollFx(null);
        rollFxTimerRef.current = null;
      }, duration);
    }

    function onSpeechBubble(e: Event) {
      const detail = (e as CustomEvent<AvatarSpeechBubbleDetail>).detail;
      if (!detail || detail.characterId !== characterId) return;
      if (rememberSourceId(seenSpeechBubbleIdsRef.current, detail.sourceId)) return;
      const duration = detail.durationMs ?? AVATAR_SPEECH_BUBBLE_DURATION_MS;
      const key = detail.sourceId ?? `${Date.now()}-${detail.text}`;
      setSpeechBubble({
        kind: detail.kind,
        text: detail.text,
        key,
        diceGlyphs: detail.diceGlyphs,
      });
      if (speechBubbleTimerRef.current != null) window.clearTimeout(speechBubbleTimerRef.current);
      speechBubbleTimerRef.current = window.setTimeout(() => {
        setSpeechBubble(null);
        speechBubbleTimerRef.current = null;
      }, duration);
    }

    window.addEventListener(AVATAR_ROLL_FX_EVENT, onRollFx);
    window.addEventListener(AVATAR_SPEECH_BUBBLE_EVENT, onSpeechBubble);
    return () => {
      window.removeEventListener(AVATAR_ROLL_FX_EVENT, onRollFx);
      window.removeEventListener(AVATAR_SPEECH_BUBBLE_EVENT, onSpeechBubble);
      if (rollFxTimerRef.current != null) window.clearTimeout(rollFxTimerRef.current);
      if (speechBubbleTimerRef.current != null) window.clearTimeout(speechBubbleTimerRef.current);
    };
  }, [characterId]);

  return { rollFx, speechBubble };
}
