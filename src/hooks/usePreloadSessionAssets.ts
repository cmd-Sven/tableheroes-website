"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PreloadStep } from "@/src/components/session/LiveSessionLoadingScreen";

type AssetManifest = {
  backgroundUrl?: string | null;
  battlemapUrl?: string | null;
  npcPortraits?: string[];
  characterPortraits?: string[];
  weatherIcons?: boolean;
};

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${src}`));
    img.src = src;
  });
}

const WEATHER_ICON_PATHS = [
  "/images/Session_ui/weather/sun.png",
  "/images/Session_ui/weather/clouds.png",
  "/images/Session_ui/weather/rain.png",
  "/images/Session_ui/weather/storm.png",
  "/images/Session_ui/weather/snow.png",
  "/images/Session_ui/weather/fog.png",
];

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

    const portraits = [
      ...(manifest.characterPortraits ?? []),
      ...(manifest.npcPortraits ?? []),
    ].filter(Boolean);
    if (portraits.length > 0) {
      initialSteps.push({ id: "portraits", label: "Portraits laden", icon: "users", status: "pending" });
      tasks.push({
        id: "portraits",
        run: () => Promise.all(portraits.map(preloadImage)).then(() => {}),
      });
    }

    if (manifest.weatherIcons) {
      initialSteps.push({ id: "weather", label: "UI-Assets laden", icon: "shield", status: "pending" });
      tasks.push({
        id: "weather",
        run: () => Promise.all(WEATHER_ICON_PATHS.map(preloadImage)).then(() => {}),
      });
    }

    if (tasks.length === 0) {
      setDone(true);
      return;
    }

    setSteps(initialSteps);

    let completed = 0;
    const total = tasks.length;

    const timeout = window.setTimeout(() => setDone(true), 4000);

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
