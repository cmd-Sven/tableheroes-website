"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Loader2, Pencil, Trash2, Users } from "lucide-react";
import {
  createCommunityEvent,
  updateCommunityEvent,
  deleteCommunityEvent,
  getCommunityEventRsvpCounts,
} from "@/src/lib/actions/community-event-actions";
import {
  COMMUNITY_EVENT_KINDS,
  COMMUNITY_EVENT_KIND_LABELS,
  type CommunityEvent,
  type CommunityEventKind,
} from "@/src/lib/community-events/types";

type Props = {
  initialEvents: CommunityEvent[];
  initialRsvpCounts: Record<string, { zusage: number; absage: number; viaOnline: number }>;
};

type FormState = {
  title: string;
  description: string;
  event_kind: CommunityEventKind;
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
  next.setDate(next.getDate() + 14);
  next.setHours(19, 0, 0, 0);
  return {
    title: "",
    description: "",
    event_kind: "Stammtisch",
    dateTime: toLocalDateTime(next.toISOString()),
    duration: 3,
    location: "",
    rsvpDeadlineDays: "2",
    isLive: true,
    visible_on_landing: true,
  };
}

function formatEventWhen(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AdminEventsClient({ initialEvents, initialRsvpCounts }: Props) {
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
      event_kind: event.event_kind,
      dateTime: toLocalDateTime(event.start_time),
      duration:
        event.end_time
          ? Math.max(
              1,
              Math.round(
                (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) /
                  (3600000),
              ),
            )
          : 3,
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
      event_kind: form.event_kind,
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
        ? await updateCommunityEvent(editingId, payload)
        : await createCommunityEvent(payload);

      if (!result.success) {
        toast.error(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      toast.success(editingId ? "Termin aktualisiert." : "Community-Termin angelegt.");
      setFormOpen(false);
      setEditingId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(eventId: string, status: "Completed" | "Cancelled") {
    const result = await updateCommunityEvent(eventId, { status });
    if (!result.success) toast.error(result.error);
    else {
      toast.success(status === "Completed" ? "Als abgeschlossen markiert." : "Abgesagt.");
      router.refresh();
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Termin wirklich löschen?")) return;
    setDeletingId(eventId);
    try {
      const result = await deleteCommunityEvent(eventId);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-libre text-sm text-gray-400 max-w-2xl">
          Vereinstermine ohne Kampagne — z. B. Stammtisch oder 5-Jahres-Feier. Alle freigeschalteten
          Mitglieder können sich mit dem Spielerprofil anmelden (ohne Charakter).
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-background-dark hover:bg-hero-dark"
        >
          <Calendar className="h-4 w-4" />
          Termin planen
        </button>
      </div>

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4"
        >
          <h2 className="font-barlow font-bold text-lg uppercase text-accent-gold">
            {editingId ? "Termin bearbeiten" : "Neuer Community-Termin"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Art
              </label>
              <select
                value={form.event_kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_kind: e.target.value as CommunityEventKind }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              >
                {COMMUNITY_EVENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {COMMUNITY_EVENT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Titel
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="z. B. 5 Jahre TableHeroes — große Feier"
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Beschreibung
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Datum & Uhrzeit
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
                max={12}
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) || 3 }))}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Ort
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Adresse oder Treffpunkt"
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
                Anmeldefrist
              </label>
              <select
                value={form.rsvpDeadlineDays}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rsvpDeadlineDays: e.target.value as FormState["rsvpDeadlineDays"],
                  }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 text-white"
              >
                <option value="1">1 Tag vorher</option>
                <option value="2">2 Tage vorher</option>
                <option value="3">3 Tage vorher</option>
                <option value="none">Keine Frist</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isLive}
                  onChange={(e) => setForm((f) => ({ ...f, isLive: e.target.checked }))}
                />
                Vor Ort (1 Online-Platz)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.visible_on_landing}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visible_on_landing: e.target.checked }))
                  }
                />
                Auf Startseite anzeigen
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded bg-accent-gold px-4 py-2 font-barlow text-sm font-bold uppercase text-background-dark disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="rounded border border-hero-border px-4 py-2 font-barlow text-sm uppercase text-gray-300"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-barlow font-bold text-sm uppercase text-gray-400">Geplant</h3>
        {upcoming.length === 0 ? (
          <p className="font-libre text-gray-500 italic">Noch keine Community-Termine geplant.</p>
        ) : (
          upcoming.map((event) => {
            const counts = rsvpCounts[event.id] ?? { zusage: 0, absage: 0, viaOnline: 0 };
            return (
              <div
                key={event.id}
                className="rounded-lg border border-hero-border/40 bg-background-dark/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                      {COMMUNITY_EVENT_KIND_LABELS[event.event_kind]}
                    </p>
                    <h4 className="font-cinzel text-lg font-bold text-white">{event.title}</h4>
                    <p className="mt-1 font-libre text-sm text-gray-400">
                      {formatEventWhen(event.start_time)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 font-barlow text-xs text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      {counts.zusage} Zusage · {counts.viaOnline} Online · {counts.absage} Absage
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow text-[10px] uppercase text-gray-300 hover:text-white"
                    >
                      <Pencil className="h-3 w-3" /> Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(event.id, "Completed")}
                      className="rounded border border-hero-vibrant/40 px-2 py-1 font-barlow text-[10px] uppercase text-hero-vibrant"
                    >
                      Abschließen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(event.id, "Cancelled")}
                      className="rounded border border-amber-700/50 px-2 py-1 font-barlow text-[10px] uppercase text-amber-400"
                    >
                      Absagen
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === event.id}
                      onClick={() => handleDelete(event.id)}
                      className="inline-flex items-center gap-1 rounded border border-red-900/50 px-2 py-1 font-barlow text-[10px] uppercase text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {past.length > 0 ? (
        <section className="space-y-3">
          <h3 className="font-barlow font-bold text-sm uppercase text-gray-400">Vergangen</h3>
          {past.map((event) => (
            <div
              key={event.id}
              className="rounded border border-hero-dark/50 bg-black/20 px-4 py-3 opacity-80"
            >
              <p className="font-cinzel font-bold text-white">{event.title}</p>
              <p className="font-libre text-xs text-gray-500">
                {formatEventWhen(event.start_time)} · {event.status}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
