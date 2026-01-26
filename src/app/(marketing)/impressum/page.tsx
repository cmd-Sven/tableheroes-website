import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background-dark">
      <div className="container mx-auto max-w-4xl px-6 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-gray-300 text-sm hover:text-hero-vibrant transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>

        {/* Content */}
        <div className="rounded-lg border border-hero-dark bg-background-card p-8 md:p-12 shadow-lg">
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant mb-8">
            Impressum
          </h1>

          <div className="space-y-8 font-libre text-gray-200 leading-relaxed">
            {/* Angaben gemäß § 5 TMG */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                Angaben gemäß § 5 TMG
              </h2>
              <p>
                <strong>TableHeroes</strong><br />
                Sven Sieber<br />
                Ostlandweg 16<br />
                49009 Osnabrück
              </p>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                Kontakt
              </h2>
              <p>
                <strong>E-Mail:</strong>{" "}
                <a
                  href="mailto:designer@sven-sieber.de"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  designer@sven-sieber.de
                </a>
                <br />
                <strong>Discord:</strong>{" "}
                <a
                  href="https://discord.gg/JzfXw9b7v7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  discord.gg/JzfXw9b7v7
                </a>
              </p>
            </section>

            {/* Verantwortlich für den Inhalt */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
              </h2>
              <p>
                Sven Sieber<br />
                Ostlandweg 16<br />
                49009 Osnabrück
              </p>
            </section>

            {/* Haftungsausschluss */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                Haftungsausschluss
              </h2>
              
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Haftung für Inhalte
              </h3>
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
                nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
                Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
                Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige 
                Tätigkeit hinweisen.
              </p>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Haftung für Links
              </h3>
              <p>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
                Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
                Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der 
                Seiten verantwortlich.
              </p>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Urheberrecht
              </h3>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
                dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
                der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
