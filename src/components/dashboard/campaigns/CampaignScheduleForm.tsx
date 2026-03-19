"use client";

import { useState, useTransition } from "react";
import { Calendar, RefreshCw, Check } from "lucide-react";
import {
  updateCampaignSchedule,
  generateRecurringSessions,
} from "@/src/app/dashboard/campaigns/[id]/actions";

const DAY_OPTIONS = [
  { value: "1", label: "Montag" },
  { value: "2", label: "Dienstag" },
  { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" },
  { value: "5", label: "Freitag" },
  { value: "6", label: "Samstag" },
  { value: "0", label: "Sonntag" },
];

const INTERVAL_OPTIONS = [
  { value: "", label: "Kein fester Rhythmus" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "biweekly", label: "Alle 2 Wochen" },
  { value: "monthly", label: "Monatlich" },
];

const DURATION_OPTIONS = [
  { value: "2", label: "2 Stunden" },
  { value: "3", label: "3 Stunden" },
  { value: "4", label: "4 Stunden" },
  { value: "5", label: "5 Stunden" },
  { value: "6", label: "6 Stunden" },
];

type Props = {
  campaignId: string;
  initialInterval: string | null;
  initialDay: number | null;
  initialTime: string | null;
  initialDuration: number | null;
  initialFrequencyNote: string | null;
};

export function CampaignScheduleForm({
  campaignId,
  initialInterval,
  initialDay,
  initialTime,
  initialDuration,
  initialFrequencyNote,
}: Props) {
  const [interval, setInterval] = useState(initialInterval ?? "");
  const [day, setDay] = useState(
    initialDay !== null && initialDay !== undefined
      ? String(initialDay)
      : "5",
  );
  const [time, setTime] = useState(initialTime ?? "19:00");
  const [duration, setDuration] = useState(
    String(initialDuration ?? 4),
  );
  const [note, setNote] = useState(initialFrequencyNote ?? "");

  const [isSaving, startSaveTransition] = useTransition();
  const [isGenerating, startGenTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const hasSchedule = interval !== "";

  const handleSave = () => {
    setSaveMsg(null);
    startSaveTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("schedule_interval", interval);
        fd.set("schedule_day", hasSchedule ? day : "");
        fd.set("schedule_time", hasSchedule ? time : "");
        fd.set("schedule_duration_hours", hasSchedule ? duration : "4");
        fd.set("frequency", note);
        await updateCampaignSchedule(campaignId, fd);
        setSaveMsg("Spielplan gespeichert!");
        setTimeout(() => setSaveMsg(null), 3000);
      } catch (err: any) {
        setSaveMsg(`Fehler: ${err.message}`);
      }
    });
  };

  const handleGenerate = () => {
    setGenMsg(null);
    startGenTransition(async () => {
      try {
        const result = await generateRecurringSessions(campaignId);
        setGenMsg(
          `${result.created} neue Termine erstellt` +
            (result.skipped > 0
              ? ` (${result.skipped} bestehende übersprungen)`
              : ""),
        );
        setTimeout(() => setGenMsg(null), 5000);
      } catch (err: any) {
        setGenMsg(`Fehler: ${err.message}`);
      }
    });
  };

  const selectClass =
    "w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none appearance-none";
  const inputClass =
    "w-full rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white focus:border-hero-vibrant outline-none";

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h3 className="font-barlow font-bold text-lg text-accent-gold uppercase mb-4 border-b border-hero-border pb-2 flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Spielplan &amp; Termine
      </h3>

      <div className="space-y-4">
        {/* Intervall */}
        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300">
            Intervall
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className={selectClass}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {hasSchedule && (
          <>
            {/* Wochentag */}
            <div>
              <label className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300">
                Wochentag
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={selectClass}
              >
                {DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Uhrzeit */}
            <div>
              <label className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300">
                Uhrzeit
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Dauer */}
            <div>
              <label className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300">
                Session-Dauer
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className={selectClass}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Anmerkung */}
        <div>
          <label className="block mb-2 font-barlow font-bold uppercase text-xs text-gray-300">
            Anmerkung zum Spielrhythmus
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z.B. Außer in Schulferien, ab 18:30 Einlass"
            className={inputClass}
          />
          <p className="mt-1 font-libre text-xs text-gray-500">
            Optionaler Freitext, wird auf der öffentlichen Kampagnenseite
            angezeigt.
          </p>
        </div>

        {/* Speichern */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Spielplan speichern
        </button>

        {saveMsg && (
          <p
            className={`font-libre text-sm text-center ${
              saveMsg.startsWith("Fehler") ? "text-red-400" : "text-green-400"
            }`}
          >
            {saveMsg}
          </p>
        )}

        {/* Termine generieren */}
        {hasSchedule && (
          <div className="border-t border-hero-dark pt-4 mt-4">
            <p className="font-libre text-sm text-gray-300 mb-3">
              Erstelle automatisch Termine für die nächsten 8 Wochen basierend
              auf dem eingestellten Spielplan. Bereits vorhandene Termine werden
              nicht doppelt erstellt.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2.5 font-barlow font-bold uppercase text-sm text-accent-gold hover:bg-accent-gold/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              Termine generieren (nächste 8 Wochen)
            </button>

            {genMsg && (
              <p
                className={`font-libre text-sm text-center mt-2 ${
                  genMsg.startsWith("Fehler")
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {genMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
