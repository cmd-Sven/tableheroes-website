"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Calendar, ChevronLeft, Loader2, Pencil, Trash2, Users } from "lucide-react";
import {
  createGmPlanningEvent,
  updateGmPlanningEvent,
  deleteGmPlanningEvent,
} from "@/src/lib/actions/community-event-actions";
import type { CommunityEvent } from "@/src/lib/community-events/types";

type Props = {
  initialEvents: CommunityEvent[];
  initialRsvpCounts: Record<string, { zusage: number; absage: number; viaOnline: number }>;
};

type FormState = {
  title: string;
  description: string;
  dateTime: string;
  duration: number;
  location: string;
  rsvpDeadlineDays: "1" | "2" | "3" | "none";
  isLive: boolean;
  visible_on_landing: boolean;
};

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultForm(): FormState {
  const next = new Date();
  next.setDate(next.getDate() + 10);
  next.setHours(19, 0, 0, 0);
  return {
    title: "",
    description: "",
    dateTime: toLocalDateTime(next.toISOString()),
    duration: 2,
    location: "",
    rsvpDeadlineDays: "2",
    isLive: true,
    visible_on_landing: true,
  };
}

function formatEventWhen(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function GmPlanningEventsClient({ initialEvents, initialRsvpCounts }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [rsvpCounts, setRsvpCounts] = useState(initialRsvpCounts);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
    setRsvpCounts(initialRsvpCounts);
  }, [initialEvents, initialRsvpCounts]);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setFormOpen(true);
  }

  function openEdit(event: CommunityEvent) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? "",
      dateTime: toLocalDateTime(event.start_time),
      duration:
        event.end_time
          ? Math.max(
              1,
              Math.round(
                (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) /
                  3600000,
              ),
            )
          : 2,
      location: event.location ?? "",
      rsvpDeadlineDays:
        event.rsvp_deadline_days === 1
          ? "1"
          : event.rsvp_deadline_days === 3
            ? "3"
            : event.rsvp_deadline_days == null
              ? "none"
              : "2",
      isLive: event.is_live !== false,
      visible_on_landing: event.visible_on_landing,
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Bitte Titel eingeben.");
      return;
    }

    const [datePart, timePart] = form.dateTime.split("T");
    const [hours, minutes] = (timePart || "19:00").split(":").map(Number);
    const start = new Date(
      `${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
    );
    const end = new Date(start.getTime() + form.duration * 3600000);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: form.location.trim() || null,
      rsvp_deadline_days:
        form.rsvpDeadlineDays === "none" ? null : (Number(form.rsvpDeadlineDays) as 1 | 2 | 3),
      is_live: form.isLive,
      visible_on_landing: form.visible_on_landing,
    };

    setSaving(true);
    try {
      const result = editingId
        ? await updateGmPlanningEvent(editingId, payload)
        : await createGmPlanningEvent(payload);

      if (!result.success) {
        toast.error(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      toast.success(editingId ? "Einladung aktualisiert." : "Spielplanungs-Termin angelegt.");
      setFormOpen(false);
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(eventId: string, status: "Completed" | "Cancelled") {
    const result = await updateGmPlanningEvent(eventId, { status });
    if (!result.success) toast.error(result.error);
    else {
      toast.success(status === "Completed" ? "Als abgeschlossen markiert." : "Abgesagt.");
      router.refresh();
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Einladung wirklich löschen?")) return;
    setDeletingId(eventId);
    try {
      const result = await deleteGmPlanningEvent(eventId);
      if (!result.success) toast.error(result.error);
      else {
        toast.success("Termin gelöscht.");
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  const upcoming = events.filter((e) => e.status === "Scheduled");
  const past = events.filter((e) => e.status !== "Scheduled");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-2 font-barlow text-sm font-bold uppercase text-gray-400 hover:text-hero-vibrant"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="font-barlow text-3xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            Spielplanung &amp; Einladungen
          </h1>
          <p className="mt-2 max-w-2xl font-libre text-gray-400">
            Termine vor dem Kampagnenstart — Kennenlernen, System abstimmen, Interesse
            wecken. Erscheint als Einladung auf Spieler-Dashboards und optional auf der
            Startseite. Teilnahme nur mit registriertem Account.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2.5 font-barlow text-sm font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
        >
          Einladung anlegen
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4"
        >
          <h2 className="font-barlow text-lg font-bold uppercase text-accent-gold">
            {editingId ? "Einladung bearbeiten" : "Neue Einladung"}
          </h2>
          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Titel
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="z. B. Kennenlernrunde — Fantasy offen"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Beschreibung
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Worum geht es? System noch offen, nur zum Kennenlernen …"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Datum &amp; Uhrzeit
              </label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setForm((f) => ({ ...f, dateTime: e.target.value }))}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
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
                max={6}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
              Ort (optional)
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.visible_on_landing}
              onChange={(e) =>
                setForm((f) => ({ ...f, visible_on_landing: e.target.checked }))
              }
            />
            Auf Startseite unter „Termine &amp; Einladungen“ anzeigen
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded border border-hero-border px-4 py-2 font-barlow text-sm uppercase text-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <section>
        <h2 className="mb-4 font-barlow text-lg font-bold uppercase text-white">
          Geplante Einladungen
        </h2>
        {upcoming.length === 0 ? (
          <p className="font-libre text-gray-500">Noch keine Spielplanungs-Termine.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((event) => {
              const counts = rsvpCounts[event.id];
              return (
                <li
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent-gold/30 bg-accent-gold/5 p-4"
                >
                  <div>
                    <p className="font-cinzel font-bold text-white">{event.title}</p>
                    <p className="mt-1 font-libre text-sm text-gray-400">
                      {formatEventWhen(event.start_time)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    {counts ? (
                      <p className="mt-1 flex items-center gap-1 font-barlow text-xs text-gray-500">
                        <Users className="h-3.5 w-3.5" />
                        {counts.zusage} Zusage · {counts.absage} Absage
                        {counts.viaOnline > 0 ? ` · ${counts.viaOnline} Online` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      className="rounded border border-hero-border p-2 text-gray-300 hover:text-white"
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(event.id, "Completed")}
                      className="rounded border border-hero-border px-3 py-1 font-barlow text-xs uppercase text-gray-400"
                    >
                      Beendet
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      className="rounded border border-red-900/50 p-2 text-red-400"
                      aria-label="Löschen"
                    >
                      {deletingId === event.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 font-barlow text-lg font-bold uppercase text-gray-500">
            Vergangen
          </h2>
          <ul className="space-y-2">
            {past.map((event) => (
              <li
                key={event.id}
                className="rounded border border-hero-dark/50 px-4 py-3 font-libre text-sm text-gray-500"
              >
                <Calendar className="mr-2 inline h-4 w-4" />
                {event.title} — {formatEventWhen(event.start_time)} ({event.status})
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
