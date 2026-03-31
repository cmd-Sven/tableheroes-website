"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  Eye,
  Footprints,
  Thermometer,
} from "lucide-react";
import {
  WEATHER_PRESET_ORDER,
  WEATHER_PRESETS,
  formatWeatherSummary,
  getWeatherMechanicalLines,
  isWeatherPresetId,
  normalizeIntensity,
  type WeatherIntensity,
  type WeatherPresetId,
  weatherPresetIcon,
} from "@/src/lib/session-weather";

export type SessionWeatherLiveSlice = {
  weather: string | null;
  weather_preset?: string | null;
  weather_intensity?: number | null;
  weather_temperature?: string | null;
};

type Patch = Partial<{
  weather: string | null;
  weather_preset: string | null;
  weather_intensity: number | null;
  weather_temperature: string | null;
}>;

function iconForHintLine(line: string) {
  const l = line.toLowerCase();
  if (
    l.includes("sicht") ||
    l.includes("nebel") ||
    l.includes("blend") ||
    l.includes("dunst")
  ) {
    return Eye;
  }
  if (
    l.includes("gelände") ||
    l.includes("fortbewegung") ||
    l.includes("orientierung") ||
    l.includes("marsch") ||
    l.includes("schnee") ||
    l.includes("rutsch")
  ) {
    return Footprints;
  }
  return Cloud;
}

export function SessionWeatherControls({
  liveState,
  updateLiveState,
  isGM,
}: {
  liveState: SessionWeatherLiveSlice | null;
  updateLiveState: (patch: Patch) => void;
  isGM: boolean;
}) {
  const [mode, setMode] = useState<"template" | "manual">("template");
  const [preset, setPreset] = useState<WeatherPresetId | "">("");
  const [intensity, setIntensity] = useState<WeatherIntensity>(2);
  const [temp, setTemp] = useState("");
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    if (!liveState) return;
    const p = liveState.weather_preset;
    const i = normalizeIntensity(liveState.weather_intensity);
    const t = liveState.weather_temperature ?? "";
    const w = liveState.weather ?? "";

    if (isWeatherPresetId(p) && i) {
      setMode("template");
      setPreset(p);
      setIntensity(i);
      setTemp(t);
      setManualText("");
    } else {
      setMode("manual");
      setPreset("");
      setIntensity(2);
      setTemp(t);
      setManualText(w);
    }
  }, [
    liveState?.weather_preset,
    liveState?.weather_intensity,
    liveState?.weather_temperature,
    liveState?.weather,
  ]);

  function commitTemplate(next: {
    preset?: WeatherPresetId | "";
    intensity?: WeatherIntensity;
    temp?: string;
  }) {
    const pr = (next.preset !== undefined ? next.preset : preset) as WeatherPresetId | "";
    const int = next.intensity ?? intensity;
    const te = next.temp !== undefined ? next.temp : temp;
    if (!pr) return;
    const summary = formatWeatherSummary(pr, int, te.trim() || null, null);
    updateLiveState({
      weather_preset: pr,
      weather_intensity: int,
      weather_temperature: te.trim() || null,
      weather: summary,
    });
  }

  function commitManual(nextText: string, nextTemp: string) {
    const text = nextText.trim();
    const temperature = nextTemp.trim();
    let weather: string | null = null;
    if (text && temperature) weather = `${text} · ${temperature}`;
    else if (text) weather = text;
    else if (temperature) weather = `Temperatur: ${temperature}`;
    updateLiveState({
      weather_preset: null,
      weather_intensity: null,
      weather_temperature: temperature || null,
      weather,
    });
  }

  const readout =
    liveState &&
    formatWeatherSummary(
      isWeatherPresetId(liveState.weather_preset)
        ? liveState.weather_preset
        : null,
      normalizeIntensity(liveState.weather_intensity),
      liveState.weather_temperature ?? null,
      liveState.weather,
    );

  if (!isGM) {
    return (
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        <Cloud className="h-4 w-4 shrink-0 text-accent-gold" />
        <span className="font-libre text-sm text-gray-200 break-words">
          {readout || "Wetter unbekannt"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-[1_1_280px] flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center gap-2 shrink-0">
        <Cloud className="h-4 w-4 text-accent-gold" />
        <span className="font-barlow text-[10px] font-bold uppercase text-gray-500 whitespace-nowrap">
          Wetter
        </span>
      </div>

      <select
        value={mode === "manual" ? "__manual__" : preset || ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__manual__") {
            setMode("manual");
            setPreset("");
            const w = liveState?.weather?.trim() ?? "";
            const te = liveState?.weather_temperature ?? "";
            setManualText(w);
            setTemp(te);
            commitManual(w, te);
            return;
          }
        if (v === "") {
          setMode("template");
          setPreset("");
          setTemp("");
          setManualText("");
          updateLiveState({
            weather_preset: null,
            weather_intensity: null,
            weather_temperature: null,
            weather: null,
          });
          return;
        }
          setMode("template");
          const next = v as WeatherPresetId;
          setPreset(next);
          const int: WeatherIntensity = intensity || 2;
          setIntensity(int);
          commitTemplate({ preset: next, intensity: int, temp });
        }}
        className="min-w-[140px] max-w-full rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-sm text-white focus:border-hero-vibrant outline-none"
      >
        <option value="">Vorlage wählen…</option>
        {WEATHER_PRESET_ORDER.map((id) => (
          <option key={id} value={id}>
            {WEATHER_PRESETS[id].label}
          </option>
        ))}
        <option value="__manual__">Freitext (klassisch)</option>
      </select>

      {mode === "template" && preset ? (
        <>
          <div className="flex items-center gap-1">
            <span className="font-barlow text-[9px] uppercase text-gray-500 mr-1">
              Stufe
            </span>
            {([1, 2, 3] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setIntensity(lvl);
                  commitTemplate({ intensity: lvl });
                }}
                className={`min-w-[2rem] rounded border px-2 py-1 font-barlow text-xs font-bold uppercase transition-colors ${
                  intensity === lvl
                    ? "border-hero-vibrant bg-hero-vibrant/25 text-hero-vibrant"
                    : "border-hero-dark bg-background-dark text-gray-400 hover:border-hero-border"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            onBlur={() => commitTemplate({ temp })}
            placeholder="Temperatur (z. B. −5 °C, schwül)"
            className="min-w-[160px] max-w-full flex-1 rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
          />
        </>
      ) : null}

      {mode === "manual" ? (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onBlur={() => commitManual(manualText, temp)}
            placeholder="Wetter frei beschreiben…"
            className="min-w-[200px] flex-1 rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
          />
          <input
            type="text"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            onBlur={() => commitManual(manualText, temp)}
            placeholder="Temperatur"
            className="min-w-[140px] rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
          />
        </div>
      ) : null}
    </div>
  );
}

export function SessionWeatherPlayerHint({
  liveState,
}: {
  liveState: SessionWeatherLiveSlice | null;
}) {
  if (!liveState) return null;

  const pRaw = liveState.weather_preset;
  const presetId = isWeatherPresetId(pRaw) ? pRaw : null;
  const inten = normalizeIntensity(liveState.weather_intensity);
  const temp = liveState.weather_temperature?.trim();
  const legacy = liveState.weather?.trim();

  const structured = presetId != null && inten != null;
  const show = structured || Boolean(legacy) || Boolean(temp);

  if (!show) return null;

  if (structured && presetId && inten) {
    const meta = WEATHER_PRESETS[presetId];
    const levelLabel = meta.levels[inten - 1];
    const Icon = weatherPresetIcon(presetId);
    const lines = getWeatherMechanicalLines(presetId, inten);

    return (
      <div
        className="rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-3 shadow-inner"
        role="status"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-accent-gold" />
          <Icon className="h-4 w-4 shrink-0 text-hero-vibrant" />
          <p className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
            Wetter &amp; Bedingungen
          </p>
        </div>
        <p className="font-cinzel text-sm font-bold text-gray-100">
          Achtung: {meta.label} — {levelLabel}{" "}
          <span className="text-accent-gold">(Stufe {inten})</span>
        </p>
        {temp ? (
          <p className="mt-1 flex items-center gap-2 font-libre text-sm text-gray-300">
            <Thermometer className="h-4 w-4 shrink-0 text-sky-400" />
            Temperatur: {temp}
          </p>
        ) : null}
        {lines.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-hero-border/30 pt-3">
            {lines.map((line) => {
              const LineIcon = iconForHintLine(line);
              return (
                <li
                  key={line}
                  className="flex items-start gap-2 font-libre text-sm text-gray-200 leading-snug"
                >
                  <LineIcon className="mt-0.5 h-4 w-4 shrink-0 text-hero-vibrant" />
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-hero-border/40 bg-background-dark/60 px-4 py-3"
      role="status"
    >
      <div className="mb-1 flex items-center gap-2">
        <Cloud className="h-4 w-4 text-accent-gold" />
        <p className="font-barlow text-[10px] font-bold uppercase text-gray-400">
          Wetter
        </p>
      </div>
      {legacy ? (
        <p className="font-libre text-sm text-gray-200">{legacy}</p>
      ) : null}
      {temp ? (
        <p
          className={`flex items-center gap-2 font-libre text-sm text-gray-200 ${
            legacy ? "mt-2" : ""
          }`}
        >
          <Thermometer className="h-4 w-4 text-sky-400" />
          {temp}
        </p>
      ) : null}
    </div>
  );
}
