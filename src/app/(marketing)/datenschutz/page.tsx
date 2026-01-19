import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DatenschutzPage() {
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
            Datenschutzerklärung
          </h1>

          <div className="space-y-8 font-libre text-gray-200 leading-relaxed">
            {/* Einleitung */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                1. Datenschutz auf einen Blick
              </h2>
              
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Allgemeine Hinweise
              </h3>
              <p>
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren 
                personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene 
                Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              </p>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Datenerfassung auf dieser Website
              </h3>
              <p>
                <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
                <br />
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen 
                Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
              </p>
            </section>

            {/* Verantwortliche Stelle */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                2. Verantwortliche Stelle
              </h2>
              <p>
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
              </p>
              <p className="mt-4">
                <strong>TableHeroes</strong><br />
                Max Mustermann<br />
                Musterstraße 123<br />
                49074 Osnabrück<br />
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:kontakt@tableheroes.de"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  kontakt@tableheroes.de
                </a>
              </p>
            </section>

            {/* Datenerfassung */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                3. Welche Daten erheben wir?
              </h2>
              
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Registrierung und Login
              </h3>
              <p>
                Wenn Sie sich bei TableHeroes registrieren, erheben wir folgende Daten:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>E-Mail-Adresse</li>
                <li>Benutzername</li>
                <li>Passwort (verschlüsselt gespeichert)</li>
                <li>Profilbild (optional)</li>
              </ul>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Nutzungsdaten
              </h3>
              <p>
                Bei der Nutzung der Plattform werden automatisch folgende Daten erfasst:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>IP-Adresse</li>
                <li>Browsertyp und -version</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Uhrzeit der Serveranfrage</li>
              </ul>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Kampagnen und Charakterdaten
              </h3>
              <p>
                Wenn Sie Kampagnen erstellen oder an Kampagnen teilnehmen, speichern wir:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Kampagneninformationen (Name, Beschreibung, System)</li>
                <li>Charakterinformationen</li>
                <li>Notizen und Session-Protokolle</li>
              </ul>
            </section>

            {/* Verwendungszweck */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                4. Verwendungszweck der Daten
              </h2>
              <p>
                Wir verwenden Ihre Daten ausschließlich für folgende Zwecke:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Bereitstellung und Verbesserung unserer Dienste</li>
                <li>Verwaltung Ihres Benutzerkontos</li>
                <li>Kommunikation bezüglich Kampagnen und Events</li>
                <li>Technische Sicherheit und Fehlerbehebung</li>
              </ul>
            </section>

            {/* Weitergabe */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                5. Weitergabe von Daten
              </h2>
              <p>
                Wir geben Ihre personenbezogenen Daten nicht an Dritte weiter, es sei denn:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Sie haben ausdrücklich eingewilligt</li>
                <li>Die Weitergabe ist zur Erfüllung gesetzlicher Verpflichtungen erforderlich</li>
                <li>Die Weitergabe ist zur Durchsetzung unserer Rechte erforderlich</li>
              </ul>
            </section>

            {/* Ihre Rechte */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                6. Ihre Rechte
              </h2>
              <p>
                Sie haben jederzeit das Recht auf:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Auskunft über Ihre gespeicherten personenbezogenen Daten</li>
                <li>Berichtigung unrichtiger Daten</li>
                <li>Löschung Ihrer Daten</li>
                <li>Einschränkung der Datenverarbeitung</li>
                <li>Datenübertragbarkeit</li>
                <li>Widerspruch gegen die Datenverarbeitung</li>
              </ul>
              <p className="mt-4">
                Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
                <a
                  href="mailto:kontakt@tableheroes.de"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  kontakt@tableheroes.de
                </a>
              </p>
            </section>

            {/* Hosting & Dienste */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                7. Hosting und externe Dienste
              </h2>
              
              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Supabase
              </h3>
              <p>
                Wir nutzen Supabase für die Datenspeicherung und Authentifizierung. Anbieter ist 
                Supabase Inc., USA. Weitere Informationen finden Sie in der{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  Datenschutzerklärung von Supabase
                </a>
                .
              </p>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Discord
              </h3>
              <p>
                Wir verlinken auf unseren Discord-Server. Discord ist ein Dienst der Discord Inc., USA. 
                Wenn Sie auf Discord zugreifen, gelten die{" "}
                <a
                  href="https://discord.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  Datenschutzbestimmungen von Discord
                </a>
                .
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                8. Cookies
              </h2>
              <p>
                Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die auf Ihrem Endgerät 
                gespeichert werden. Wir verwenden Cookies ausschließlich für:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Session-Verwaltung (Login-Status)</li>
                <li>Technische Funktionen der Website</li>
              </ul>
              <p className="mt-4">
                Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert 
                werden und Cookies nur im Einzelfall erlauben.
              </p>
            </section>

            {/* Änderungen */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                9. Änderungen dieser Datenschutzerklärung
              </h2>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den 
                aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen 
                in der Datenschutzerklärung umzusetzen.
              </p>
              <p className="mt-4">
                <strong>Stand:</strong> Dezember 2024
              </p>
            </section>

            {/* Hinweis */}
            <section className="mt-12 p-6 rounded-md border border-accent-gold/30 bg-yellow-950/20">
              <p className="text-sm text-gray-300">
                <strong className="text-accent-gold">Hinweis:</strong> Dies ist eine 
                Platzhalter-Datenschutzerklärung. Bitte lassen Sie diese von einem Rechtsanwalt 
                überprüfen und an Ihre spezifischen Gegebenheiten anpassen, bevor Sie die Website 
                öffentlich betreiben.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
