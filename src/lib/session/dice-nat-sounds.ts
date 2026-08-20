import type { AvatarRollFxKind } from "@/src/lib/session/avatar-roll-fx";
import type { DieNatHighlight } from "@/src/lib/session/dice-nat-highlight";

const DICE_ROLL_SRC = "/sounds/dice-roll.mp3";

let audioCtx: AudioContext | null = null;
let rollAudio: HTMLAudioElement | null = null;
const playedNatIds = new Set<string>();
const playedRollIds = new Set<string>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function getRollAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!rollAudio) {
    rollAudio = new Audio(DICE_ROLL_SRC);
    rollAudio.preload = "auto";
  }
  return rollAudio;
}

function rememberId(set: Set<string>, id: string, max = 48) {
  if (set.has(id)) return false;
  set.add(id);
  if (set.size > max) {
    const first = set.values().next().value;
    if (first) set.delete(first);
  }
  return true;
}

function playTone(
  ctx: AudioContext,
  {
    frequency,
    startAt,
    duration,
    type = "sine",
    gain = 0.12,
    attack = 0.02,
    release = 0.12,
  }: {
    frequency: number;
    startAt: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    release?: number;
  },
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(gain, startAt + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration + release);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + release + 0.05);
}

function playCritSound(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  // Triumph-Arpeggio: C5 → E5 → G5 → C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone(ctx, {
      frequency: freq,
      startAt: t0 + i * 0.07,
      duration: 0.28,
      type: "triangle",
      gain: 0.11 - i * 0.01,
      attack: 0.015,
      release: 0.18,
    });
  });
  // Goldener Shimmer
  playTone(ctx, {
    frequency: 2093,
    startAt: t0 + 0.22,
    duration: 0.35,
    type: "sine",
    gain: 0.045,
    attack: 0.01,
    release: 0.25,
  });
}

function playFumbleSound(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  // Tiefer, komischer „Plumps“ + absteigender Ton
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.35);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.5);

  // Kurzer „Boing“-Nachklang
  playTone(ctx, {
    frequency: 140,
    startAt: t0 + 0.12,
    duration: 0.18,
    type: "square",
    gain: 0.035,
    attack: 0.005,
    release: 0.15,
  });
}

/**
 * Spielt Sound für kritischen Erfolg (Nat 20) oder Patzer (Nat 1).
 * Dedupliziert über sourceId (Activity-Log), damit nicht doppelt abgespielt wird.
 */
export function playDiceNatSound(
  kind: DieNatHighlight | AvatarRollFxKind,
  sourceId?: string,
): void {
  if (sourceId && !rememberId(playedNatIds, sourceId)) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (kind === "crit") {
    playCritSound(ctx);
  } else {
    playFumbleSound(ctx);
  }
}

/**
 * Würfel-Roll-MP3 beim Start einer Animation (für alle Clients).
 * Dedupliziert über sourceId.
 */
export function playDiceRollSound(
  sourceId?: string,
  durationMs = 1400,
): void {
  if (sourceId && !rememberId(playedRollIds, sourceId)) return;

  const audio = getRollAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    const playPromise = audio.play();
    if (playPromise) {
      void playPromise.catch(() => {
        /* Autoplay-Policy — nach User-Gesture via prime freigeschaltet */
      });
    }

    const stopAfter = Math.max(400, durationMs + 150);
    window.setTimeout(() => {
      if (audio.paused) return;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    }, stopAfter);
  } catch {
    /* ignore */
  }
}

/** Beim ersten Klick/Touch Audio freischalten (Browser-Autoplay-Policy). */
export function primeDiceNatSounds(): void {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume();
  }

  const audio = getRollAudio();
  if (!audio) return;
  try {
    audio.load();
    const prevVolume = audio.volume;
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = prevVolume || 1;
      })
      .catch(() => {
        audio.volume = prevVolume || 1;
      });
  } catch {
    /* ignore */
  }
}
