"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { setPlayerDashboardTutorialDismissed } from "@/src/app/dashboard/dashboard-actions";

const TUTOR_IMAGE_SRC = "/images/tutor_pen%26paper.jpg";

const STEPS: string[] = [
  `Du hast es geschafft! Willkommen in deinem Spieler-Dashboard, die Schnellübersicht über alle Bereiche. Vorerst gibt es noch nicht viele Informationen für dich, da du dich noch nicht auf eine Spielsession beworben hast und aktiv an einer Kampagne teilnimmst. Ich werde dir aber erklären, was du Schritt für Schritt machen musst, um zurechtzukommen.`,

  `Dein Profil einstellen. Auf der linken Seite findest du die Sidebar. Dort kannst du die verschiedenen Bereiche aufrufen. Erst einmal „klickst“ du gleich auf Einstellungen. Dort kannst du dein Profil-Banner (oben) gestalten. Hast du das erledigt, kommen wir danach zu der Bewerbungsmöglichkeit auf Kampagnen.`,

  `Auf offene Kampagnen bewerben. Um an einer Gruppe teilzunehmen, musst du dich auf eine Kampagne „bewerben“. Eine Übersicht der offenen Kampagnen findest du in der Übersicht hier weiter unten. „Klicke“ dazu auf die jeweilige Kampagne, um dir die Details anzuschauen. Dort findest du einen Button auf der rechten Seite, um dich auf die jeweilige Kampagne zu bewerben.`,

  `Hast du dich beworben, muss der Spielleiter dies nur noch bestätigen. Eventuell kennt ihr euch bereits oder du hast dich über den Discord vorgestellt. Nachdem du dich beworben hast, gibt der SL dich frei und du darfst einen Spielcharakter für die Kampagne entwerfen. Gleichzeitig hast du Zugriff auf die Lore der Kampagne und kannst dir vorab freigegebene Datensätze anschauen.`,
];

type Props = {
  /** true = Nutzer hat die Hilfe ausgeblendet (wird nicht gerendert) */
  initialDismissed: boolean;
};

export function PlayerDashboardTutorial({ initialDismissed }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dismissedLocal, setDismissedLocal] = useState(initialDismissed);
  const [confirmHide, setConfirmHide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDismissedLocal(initialDismissed);
    if (!initialDismissed) {
      setStep(0);
      setConfirmHide(false);
    }
  }, [initialDismissed]);

  if (dismissedLocal) return null;

  const isLast = step === STEPS.length - 1;

  async function handleDismiss() {
    setError(null);
    setSaving(true);
    try {
      await setPlayerDashboardTutorialDismissed(true);
      setDismissedLocal(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-md border border-hero-border bg-background-card p-4 shadow-lg md:p-6"
      aria-labelledby="player-dashboard-tutorial-title"
    >
      <h2
        id="player-dashboard-tutorial-title"
        className="sr-only"
      >
        Einführung ins Spieler-Dashboard
      </h2>
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
        <div className="relative w-full shrink-0 overflow-hidden rounded-md border border-hero-dark md:w-[min(100%,280px)] lg:w-[320px]">
          <div className="relative aspect-[16/10] w-full bg-slate-900">
            <Image
              src={TUTOR_IMAGE_SRC}
              alt="Tutor für Pen-and-Paper"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 320px"
              priority
            />
          </div>
        </div>
        <div className="flex min-h-[12rem] flex-1 flex-col">
          <p className="font-libre text-gray-200 leading-relaxed">
            <span className="font-barlow font-bold text-accent-gold">
              Schritt {step + 1} von {STEPS.length}
            </span>
            <br />
            <span className="mt-2 inline-block">{STEPS[step]}</span>
          </p>
          {error && (
            <p className="mt-2 font-libre text-sm text-red-400">{error}</p>
          )}
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6">
            <button
              type="button"
              onClick={() => {
                setStep((s) => Math.max(0, s - 1));
                setConfirmHide(false);
              }}
              disabled={step === 0 || saving}
              className="font-barlow font-bold uppercase inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark px-3 py-2 text-sm text-gray-200 transition-colors hover:border-hero-vibrant hover:text-white disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>

            <div className="ml-auto flex flex-col items-end gap-3 sm:flex-row sm:items-center">
              {isLast ? (
                <>
                  <label className="font-libre flex max-w-md cursor-pointer items-start gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={confirmHide}
                      onChange={(e) => setConfirmHide(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-hero-dark bg-slate-900 text-hero-vibrant focus:ring-hero-vibrant"
                    />
                    <span>
                      Hinweise gelesen – diese Hilfe nicht mehr auf dem Dashboard
                      anzeigen
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={!confirmHide || saving}
                    className="font-barlow font-bold uppercase inline-flex items-center gap-1 rounded bg-hero-vibrant px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Fertig
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  disabled={saving}
                  className="font-barlow font-bold uppercase inline-flex items-center gap-1 rounded bg-hero-vibrant px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
