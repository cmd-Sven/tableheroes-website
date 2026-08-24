import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Trophy,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { getGuestbookEntries, getBackers } from "@/src/lib/actions/support-actions";
import { GuestbookForm } from "@/src/components/support/GuestbookForm";
import { GuestbookList } from "@/src/components/support/GuestbookList";
import { HallOfHeroes } from "@/src/components/support/HallOfHeroes";
import { PayPalButton } from "@/src/components/support/PayPalButton";
import { SupportDevStats } from "@/src/components/support/SupportDevStats";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [entries, backers] = await Promise.all([
    getGuestbookEntries(),
    getBackers(),
  ]);

  return (
    <div
      className="min-h-screen bg-background-dark"
      style={{
        backgroundImage: "url('/images/dark-marmor.webp')",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
      }}
    >
      <div className="min-h-screen bg-black/60">
        <div className="container mx-auto max-w-5xl px-6 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-gray-300 text-sm hover:text-accent-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Startseite
          </Link>
        </div>

        <div className="container mx-auto max-w-5xl px-6 py-12 space-y-16">
          {/* Hero */}
          <header className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-gold/30 bg-accent-gold/5 px-4 py-1.5 mb-4">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="font-barlow font-bold text-xs uppercase tracking-wider text-accent-gold">
                Von Spielern, für Spieler
              </span>
            </div>
            <h1
              className="font-barlow font-extrabold text-4xl md:text-5xl uppercase tracking-wide text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #cab926 0%, #f5e6a3 40%, #cab926 60%, #a89320 100%)",
              }}
            >
              Unterstütze Table Heroes
            </h1>
            <p className="font-libre text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              Table Heroes ist und bleibt <strong className="text-white">komplett kostenlos</strong>.
              Kein Abo, kein Pay-to-Win, keine versteckten Gebühren. Jeder Spieler hat
              die gleichen Möglichkeiten.
            </p>
          </header>

          {/* 1) Bewertungen / Einträge ganz oben */}
          <section className="space-y-8">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2">
              Stimmen unserer Abenteurer
            </h2>

            {user ? (
              <GuestbookForm />
            ) : (
              <div className="rounded-lg border border-hero-dark bg-black/30 p-6 text-center">
                <p className="font-libre text-gray-400 mb-3">
                  Melde dich an, um eine Bewertung und einen Kommentar zu hinterlassen
                  – und einmalig 100 Punkte zu erhalten.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark/50 px-5 py-2.5 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
                >
                  Zum Login
                </Link>
              </div>
            )}

            <GuestbookList entries={entries} />
          </section>

          {/* 2) Animierte Stats statt Kosten-Übersicht */}
          <SupportDevStats />

          {/* 3) Achievement + PayPal */}
          <section className="rounded-xl border border-accent-gold/20 bg-accent-gold/[0.03] p-8 md:p-10 space-y-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-accent-gold/40 bg-accent-gold/10">
                <Trophy className="h-8 w-8 text-accent-gold" />
              </div>
              <div className="space-y-3">
                <h2 className="font-cinzel font-bold text-xl text-accent-gold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Exklusives Backer-Achievement
                </h2>
                <p className="font-libre text-gray-300 leading-relaxed">
                  Jeder Unterstützer erhält ein{" "}
                  <strong className="text-white">einzigartiges &quot;Backer&quot;-Achievement</strong> auf
                  seinem Profil – ein goldenes Ehrenzeichen, das zeigt: Du hast geholfen,
                  diese Welt am Leben zu halten. Außerdem wird dein Dashboard mit einem
                  <strong className="text-accent-gold"> dezenten goldenen Schimmer</strong> veredelt.
                </p>
                <p className="font-libre text-sm text-gray-500 italic">
                  Kein Gameplay-Vorteil. Nur Ehre und Dankbarkeit.
                </p>
              </div>
            </div>

            <PayPalButton />

            <p className="font-libre text-sm text-gray-500 text-center">
              Du kannst mich auch per{" "}
              <a
                href="mailto:kontakt@tableheroes.de"
                className="text-accent-gold hover:underline"
              >
                E-Mail
              </a>{" "}
              oder auf{" "}
              <a
                href="https://discord.gg/JzfXw9b7v7"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-gold hover:underline"
              >
                Discord
              </a>{" "}
              erreichen.
            </p>
          </section>

          {/* 4) Motivation & Ehrenhalle */}
          <section className="rounded-xl border border-accent-gold/15 bg-black/30 p-8 md:p-10">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-6">
              Warum Unterstützung?
            </h2>
            <div className="font-libre text-gray-300 leading-relaxed space-y-4">
              <p>
                Hinter Table Heroes steckt <strong className="text-white">eine einzige Person</strong> –
                ein Spielleiter, der seine Leidenschaft für Pen &amp; Paper in eine Plattform verwandelt hat.
                Jede Karte, jede Funktion, jeder NPC-Dialog wurde in unzähligen Abendstunden erschaffen.
              </p>
              <p>
                Die Plattform wird <strong className="text-white">privat finanziert</strong>. Server, Tools,
                Lizenzen – das alles kostet Geld. Wenn du helfen möchtest, diese Kosten zu decken,
                freue ich mich über jede Unterstützung. Aber:
                <strong className="text-accent-gold"> Es gibt dafür keine Extra-XP, keine Vorteile im Spiel.</strong>
                {" "}Fairness steht an erster Stelle.
              </p>
            </div>
          </section>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />
            <span className="font-cinzel text-sm text-accent-gold/50">
              Ehrenhalle
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />
          </div>

          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-cinzel font-bold text-2xl text-accent-gold">
                Ehrenhalle der Helden
              </h2>
              <p className="font-libre text-gray-400 max-w-xl mx-auto leading-relaxed">
                Diese tapferen Seelen halten die Reiche von Table Heroes am Leben.
                Wir danken euch für eure Treue!
              </p>
            </div>
            <HallOfHeroes backers={backers} />
          </section>
        </div>
      </div>
    </div>
  );
}
