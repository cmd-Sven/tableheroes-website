"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { updateSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";

type SessionData = {
  id: string;
  title: string | null;
  start_time: string;
  end_time?: string | null;
  status?: string;
  rsvp_deadline_days?: number | null;
  is_live?: boolean;
};

type Props = {
  session: SessionData;
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionEditModal({
  session,
  campaignId,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState(session.title ?? "");
  const [dateTime, setDateTime] = useState(toLocalDateTime(session.start_time));
  const [duration, setDuration] = useState(4);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && session) {
      setTitle(session.title ?? "");
      setDateTime(toLocalDateTime(session.start_time));
      if (session.start_time && session.end_time) {
        const start = new Date(session.start_time).getTime();
        const end = new Date(session.end_time).getTime();
        setDuration(Math.round((end - start) / (60 * 60 * 1000)) || 4);
      }
    }
  }, [isOpen, session]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Bitte gib einen Titel ein.");
      return;
    }

    const [datePart, timePart] = dateTime.split("T");
    const [hours, minutes] = (timePart || "18:00").split(":").map(Number);
    const start = new Date(`${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

    startTransition(async () => {
      try {
        await updateSession(session.id, {
          title: title.trim(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        });
        onSuccess();
        onClose();
      } catch (err: unknown) {
        alert((err as Error).message || "Fehler beim Speichern.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-hero-dark bg-background-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-barlow font-bold text-lg uppercase text-hero-vibrant flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Termin bearbeiten
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block font-barlow font-bold text-sm uppercase text-gray-300">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
              placeholder="z.B. Spielabend 1"
            />
          </div>

          <div>
            <label className="mb-1 block font-barlow font-bold text-sm uppercase text-gray-300">
              Datum & Uhrzeit *
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-barlow font-bold text-sm uppercase text-gray-300">
              Dauer (Stunden)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white focus:border-hero-vibrant outline-none"
            >
              {[2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h}>
                  {h} Stunden
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-dark px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold text-sm uppercase text-background-dark hover:bg-hero-dark transition-colors disabled:opacity-50"
            >
              {isPending ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
