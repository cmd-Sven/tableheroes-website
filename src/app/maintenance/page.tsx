"use client";

import Link from "next/link";

export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-fixed bg-cover bg-center"
      style={{ backgroundImage: "url('/images/dark-marmor.jpg')" }}
    >
      <div className="px-4 py-10 sm:px-6 lg:px-8 w-full max-w-xl">
        <div
          className="rounded-xl border-2 border-accent-gold/60 shadow-2xl bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/grunge-paper-background.jpg')" }}
        >
          <div className="bg-black/40 rounded-xl p-8 sm:p-10 text-center space-y-6">
            <h1 className="font-cinzel font-bold text-2xl sm:text-3xl text-accent-gold">
              Die Pforten sind noch geschlossen
            </h1>

            <p className="font-barlow text-sm sm:text-base text-gray-100 leading-relaxed">
              Unsere Chronisten arbeiten noch an den magischen Siegeln dieser Welt. Die vollständige
              Weltverwaltung wird in Kürze freigeschaltet.
            </p>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md border-2 border-accent-gold/70 bg-background-dark/80 font-barlow font-bold uppercase tracking-wide text-accent-gold shadow-lg hover:bg-accent-gold hover:text-background-dark transition-colors"
              >
                Zurück zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




