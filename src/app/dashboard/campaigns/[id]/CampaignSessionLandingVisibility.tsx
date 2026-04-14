"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { updateSession } from "@/src/app/dashboard/campaigns/[id]/session-actions";

export type NextSessionLandingRow = {
  id: string;
  title: string | null;
  start_time: string;
  visible_on_public_landing: boolean;
  show_open_slots_on_landing: boolean;
  registration_closed_on_landing: boolean;
  show_session_title_on_landing: boolean;
};

function YesNoRow({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block font-barlow font-bold text-xs uppercase text-gray-200"
      >
        {label}
      </label>
      {hint ? (
        <p className="font-libre text-[11px] text-gray-500 leading-relaxed">{hint}</p>
      ) : null}
      <select
        id={id}
        disabled={disabled}
        value={value ? "ja" : "nein"}
        onChange={(e) => onChange(e.target.value === "ja")}
        className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white focus:border-hero-vibrant outline-none disabled:opacity-50"
      >
        <option value="ja">Ja</option>
        <option value="nein">Nein</option>
      </select>
    </div>
  );
}

type Props = {
  campaignId: string;
  session: NextSessionLandingRow | null;
};

export function CampaignSessionLandingVisibility({ campaignId, session }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visibleLanding, setVisibleLanding] = useState(true);
  const [showSlots, setShowSlots] = useState(true);
  const [showFullMsg, setShowFullMsg] = useState(false);
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    if (!session) return;
    setVisibleLanding(session.visible_on_public_landing);
    setShowSlots(session.show_open_slots_on_landing);
    setShowFullMsg(session.registration_closed_on_landing);
    setShowTitle(session.show_session_title_on_landing);
  }, [session]);

  if (!session) {
    return (
      <div className="mt-6 border-t border-hero-border/40 pt-5">
        <h4 className="font-barlow font-bold text-sm uppercase text-gray-300 mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent-gold" />
          Öffentliche Terminkarte
        </h4>
        <p className="font-libre text-xs text-gray-500">
          Es gibt keinen zukünftigen <strong>geplanten</strong> Termin. Lege unter „Termine &amp;
          Rückmeldung“ einen Termin an – die Einstellungen gelten dann für den nächsten
          festen Termin.
        </p>
      </div>
    );
  }

  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(session.start_time));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateSession(session.id, {
          visible_on_public_landing: visibleLanding,
          show_open_slots_on_landing: showSlots,
          registration_closed_on_landing: showFullMsg,
          show_session_title_on_landing: showTitle,
        });
        router.refresh();
      } catch (err: unknown) {
        alert((err as Error).message || "Speichern fehlgeschlagen.");
      }
    });
  };

  return (
    <form
      onSubmit={handleSave}
      className="mt-6 border-t border-hero-border/40 pt-5 space-y-4"
    >
      <h4 className="font-barlow font-bold text-sm uppercase text-gray-300 mb-1 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-accent-gold" />
        Öffentliche Terminkarte
      </h4>
      <p className="font-libre text-[11px] text-gray-500 leading-relaxed mb-2">
        Gilt für den <strong>nächsten geplanten Termin</strong>
        {session.title?.trim() ? ` („${session.title.trim()}“)` : ""}:{" "}
        <span className="text-gray-400">{dateLabel} Uhr</span>
      </p>

      <YesNoRow
        id={`${campaignId}-vis-landing`}
        label="Auf der Start-Landingpage sichtbar"
        hint="Nein = Termin nur in der Kampagne / für eingeloggte Nutzer – nicht auf der Startseiten-Terminliste."
        value={visibleLanding}
        onChange={setVisibleLanding}
        disabled={isPending}
      />
      <YesNoRow
        id={`${campaignId}-slots`}
        label="Freie Gruppenplätze sichtbar"
        hint="Nein = keine Anzeige belegter oder freier Plätze auf der öffentlichen Karte."
        value={showSlots}
        onChange={setShowSlots}
        disabled={isPending}
      />
      <YesNoRow
        id={`${campaignId}-full-msg`}
        label='Anzeige "Alle Gruppenplätze voll"'
        hint="Ja = dieser Text erscheint auf der Karte – unabhängig davon, ob die Gruppe wirklich voll ist."
        value={showFullMsg}
        onChange={setShowFullMsg}
        disabled={isPending}
      />
      <YesNoRow
        id={`${campaignId}-sess-title`}
        label="Session-Name in der Terminkarte"
        hint="Nein = Kampagnenname und Datum bleiben, der Session-Titel wird nicht gezeigt."
        value={showTitle}
        onChange={setShowTitle}
        disabled={isPending}
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md border border-hero-border bg-hero-dark px-4 py-2.5 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50"
      >
        {isPending ? "Speichern…" : "Sichtbarkeit Terminkarte speichern"}
      </button>
    </form>
  );
}
