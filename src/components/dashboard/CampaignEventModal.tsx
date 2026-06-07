"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Calendar, Users } from "lucide-react";
import { createCampaignEvent } from "@/src/app/dashboard/campaigns/[id]/session-actions";

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function toLocalDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CampaignEventModal({ campaignId, isOpen, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [duration, setDuration] = useState(2);
  const [rsvpDeadlineDays, setRsvpDeadlineDays] = useState<"1" | "2" | "3" | "none">("2");
  const [isLive, setIsLive] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      const next = new Date();
      next.setDate(next.getDate() + 7);
      next.setHours(19, 0, 0, 0);
      setDateTime(toLocalDateTime(next));
      setTitle("");
      setDescription("");
      setDuration(2);
      setRsvpDeadlineDays("2");
      setIsLive(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Bitte gib einen Titel ein.");
      return;
    }

    const [datePart, timePart] = dateTime.split("T");
    const [hours, minutes] = (timePart || "19:00").split(":").map(Number);
    const start = new Date(
      `${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
    );
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

    startTransition(async () => {
      try {
        await createCampaignEvent({
          campaign_id: campaignId,
          title: title.trim(),
          description: description.trim() || null,
          type: "Planning",
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          rsvp_deadline_days:
            rsvpDeadlineDays === "none" ? null : (Number(rsvpDeadlineDays) as 1 | 2 | 3),
          is_live: isLive,
        });
        onSuccess();
        onClose();
      } catch (err: unknown) {
        alert((err as Error).message || "Fehler beim Anlegen.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-hero-border bg-background-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hero-dark bg-background-card px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-gold" />
            <h2 className="font-barlow text-lg font-bold uppercase text-white">Spielplanung</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <p className="font-libre text-sm text-gray-400">
            Kampagnen-interner Planungstermin — Anmeldung mit Spielerprofil, ohne Charakter.
            Stammtisch und Vereinsfeiern legst du unter Admin → Community-Termine an.
          </p>

          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Spielplanung vor Session 5"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white outline-none focus:border-hero-vibrant"
              required
            />
          </div>

          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Beschreibung (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Agenda, Vorbereitung …"
              className="w-full resize-none rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Datum & Uhrzeit
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white outline-none focus:border-hero-vibrant"
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Dauer (Stunden)
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 2)}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white outline-none focus:border-hero-vibrant"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Anmeldefrist
              </label>
              <select
                value={rsvpDeadlineDays}
                onChange={(e) =>
                  setRsvpDeadlineDays(e.target.value as "1" | "2" | "3" | "none")
                }
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-barlow text-sm text-white outline-none focus:border-hero-vibrant"
              >
                <option value="1">1 Tag vorher</option>
                <option value="2">2 Tage vorher</option>
                <option value="3">3 Tage vorher</option>
                <option value="none">Keine Frist</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 font-libre text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={isLive}
                  onChange={(e) => setIsLive(e.target.checked)}
                  className="rounded border-hero-dark"
                />
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-accent-gold/80" />
                  Vor Ort (1 Online-Platz)
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-hero-dark pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-border px-4 py-2 font-barlow text-sm font-bold uppercase text-gray-300 hover:text-white"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-background-dark hover:bg-hero-dark disabled:opacity-50"
            >
              {isPending ? "Speichern …" : "Termin anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
