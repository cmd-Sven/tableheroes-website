"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PreloadStep } from "@/src/components/session/LiveSessionLoadingScreen";
import { preloadDiceRollSound } from "@/src/lib/session/dice-nat-sounds";

type AssetManifest = {
  backgroundUrl?: string | null;
  battlemapUrl?: string | null;
  npcPortraits?: string[];
  characterPortraits?: string[];
  /** Token / prop images already on the active battlemap */
  tokenImageUrls?: string[];
  weatherIcons?: boolean;
  /** Würfel-MP3 + Face-Textur-Cache + R3F-Chunk warmhalten */
  diceAssets?: boolean;
};

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
    img.src = src;
  });
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const src = raw.trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push(src);
  }
  return out;
}

const WEATHER_ICON_PATHS = [
  "/images/Session_ui/Wetter_icons/sonne.webp",
  "/images/Session_ui/Wetter_icons/nur_wolken.webp",
  "/images/Session_ui/Wetter_icons/Regen.webp",
  "/images/Session_ui/Wetter_icons/Gewitter.webp",
  "/images/Session_ui/Wetter_icons/Schnee.webp",
  "/images/Session_ui/Wetter_icons/Blizzard.webp",
];

async function warmDiceRuntime(): Promise<void> {
  const [{ warmCommonDiceFaceTextures }] = await Promise.all([
    import("@/src/lib/session/die-face-mesh"),
    preloadDiceRollSound(),
    import("@/src/components/session/dice/DiceRollCanvas").then(() => {}),
  ]);
  warmCommonDiceFaceTextures(null);
}

export function usePreloadSessionAssets(manifest: AssetManifest | null) {
  const [steps, setSteps] = useState<PreloadStep[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const ranRef = useRef(false);

  const updateStep = useCallback(
    (id: string, status: PreloadStep["status"]) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
    },
    [],
  );

  useEffect(() => {
    if (!manifest || ranRef.current) return;
    ranRef.current = true;

    const initialSteps: PreloadStep[] = [];
    const tasks: { id: string; run: () => Promise<void> }[] = [];

    if (manifest.backgroundUrl) {
      initialSteps.push({ id: "bg", label: "Szene laden", icon: "map", status: "pending" });
      tasks.push({
        id: "bg",
        run: () => preloadImage(manifest.backgroundUrl!),
      });
    }

    if (manifest.battlemapUrl) {
      initialSteps.push({ id: "bm", label: "Battlemap laden", icon: "swords", status: "pending" });
      tasks.push({
        id: "bm",
        run: () => preloadImage(manifest.battlemapUrl!),
      });
    }

    const portraits = uniqueUrls([
      ...(manifest.characterPortraits ?? []),
      ...(manifest.npcPortraits ?? []),
    ]);
    if (portraits.length > 0) {
      initialSteps.push({ id: "portraits", label: "Portraits laden", icon: "users", status: "pending" });
      tasks.push({
        id: "portraits",
        run: () => Promise.all(portraits.map(preloadImage)).then(() => {}),
      });
    }

    const tokenImages = uniqueUrls(manifest.tokenImageUrls ?? []).filter(
      (url) => !portraits.includes(url),
    );
    if (tokenImages.length > 0) {
      initialSteps.push({
        id: "tokens",
        label: "Token-Bilder laden",
        icon: "users",
        status: "pending",
      });
      tasks.push({
        id: "tokens",
        run: () => Promise.all(tokenImages.map(preloadImage)).then(() => {}),
      });
    }

    if (manifest.weatherIcons) {
      initialSteps.push({ id: "weather", label: "UI-Assets laden", icon: "shield", status: "pending" });
      tasks.push({
        id: "weather",
        run: () => Promise.all(WEATHER_ICON_PATHS.map(preloadImage)).then(() => {}),
      });
    }

    if (manifest.diceAssets) {
      initialSteps.push({
        id: "dice",
        label: "Würfel vorbereiten",
        icon: "dices",
        status: "pending",
      });
      tasks.push({
        id: "dice",
        run: () => warmDiceRuntime(),
      });
    }

    if (tasks.length === 0) {
      setDone(true);
      return;
    }

    setSteps(initialSteps);

    let completed = 0;
    const total = tasks.length;

    const timeout = window.setTimeout(() => setDone(true), 5500);

    (async () => {
      for (const task of tasks) {
        updateStep(task.id, "loading");
        try {
          await task.run();
          updateStep(task.id, "done");
        } catch {
          updateStep(task.id, "error");
        }
        completed++;
        setProgress(Math.round((completed / total) * 100));
      }
      window.clearTimeout(timeout);
      setDone(true);
    })();

    return () => window.clearTimeout(timeout);
  }, [manifest, updateStep]);

  return { steps, progress, done };
}
