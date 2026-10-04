"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cloud, CloudFog, CloudRain, CloudSnow, Sun } from "lucide-react";
import {
  WEATHER_FX_OPTIONS,
  weatherFxLabel,
  type WeatherFxId,
  type WeatherFxMode,
} from "./aurenfurt-weather-fx";

const ICONS: Record<WeatherFxId, typeof Cloud> = {
  regen: CloudRain,
  schnee: CloudSnow,
  nebel: CloudFog,
  sonnenschein: Sun,
  bewoelkt: Cloud,
};

type Props = {
  enabled: boolean;
  mode: WeatherFxMode;
  autoEffect: WeatherFxId;
  onEnabledChange: (enabled: boolean) => void;
  onModeChange: (mode: WeatherFxMode) => void;
};

export function HoloWeatherControl({ enabled, mode, autoEffect, onEnabledChange, onModeChange }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const shown = mode === "auto" ? autoEffect : mode;
  const Icon = ICONS[shown];
  const buttonLabel = enabled ? weatherFxLabel(shown) : "Wetter aus";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={panelRef} className="pointer-events-auto relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={labelId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide shadow-lg backdrop-blur-md ${
          enabled
            ? "border-accent-gold/70 bg-hero-dark/95 text-accent-gold"
            : "border-hero-dark bg-background-dark/90 text-gray-400"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {buttonLabel}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={labelId}
            role="group"
            aria-label="Wettereffekte"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-20 mt-1 w-52 rounded border border-hero-border bg-background-card p-2 shadow-lg"
          >
            <p className="font-libre text-[11px] leading-relaxed text-gray-300">
              Nur die Kartenansicht. Die Stadt rechnet weiter mit dem Tageswetter.
            </p>
            <button
              type="button"
              aria-pressed={enabled}
              onClick={() => onEnabledChange(!enabled)}
              className={`mt-2 w-full rounded border px-2 py-1 text-left font-barlow text-[10px] font-bold uppercase tracking-wide ${
                enabled
                  ? "border-hero-vibrant text-hero-vibrant"
                  : "border-hero-dark text-gray-400"
              }`}
            >
              {enabled ? "Effekte an" : "Effekte aus"}
            </button>
            <button
              type="button"
              aria-pressed={mode === "auto"}
              onClick={() => onModeChange("auto")}
              className={`mt-1 w-full rounded px-2 py-1 text-left font-barlow text-[10px] font-bold uppercase tracking-wide ${
                mode === "auto" ? "bg-white/10 text-accent-gold" : "text-gray-200 hover:bg-white/5"
              }`}
            >
              Automatisch · {weatherFxLabel(autoEffect)}
            </button>
            {WEATHER_FX_OPTIONS.map((option) => {
              const OptionIcon = ICONS[option.id];
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onModeChange(option.id)}
                  className={`mt-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-barlow text-[10px] font-bold uppercase tracking-wide ${
                    active ? "bg-white/10 text-accent-gold" : "text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <OptionIcon className="h-3.5 w-3.5" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
