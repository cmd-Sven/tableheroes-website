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
                Sven Sieber<br />
                Ostlandweg 16<br />
                49009 Osnabrück<br />
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:designer@sven-sieber.de"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  designer@sven-sieber.de
                </a>
                <br />
                Discord:{" "}
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
                <li>Notizen, Session-Protokolle und Kampagnen-Chroniken</li>
              </ul>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Audio-Aufzeichnung während Spielrunden (Session-Chronist)
              </h3>
              <p>
                Für ausgewählte Live-Sessions kann der Spielleiter (GM) eine{" "}
                <strong>Audio-Aufzeichnung</strong> starten, um daraus eine Session-Chronik
                zu erstellen. Dabei werden insbesondere folgende Daten verarbeitet:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>
                  <strong>Audiodaten</strong> der Spielrunde (Gespräche am Tisch oder in
                  der Online-Konferenz), gespeichert in kurzen Abschnitten (Chunks)
                </li>
                <li>
                  <strong>Transkripte</strong> (Text-Umschrift der Aufnahme, automatisch
                  erzeugt)
                </li>
                <li>
                  <strong>KI-Zusammenfassungen</strong> und Spieler-Chroniken (Recap,
                  markierte Ereignisse, NSC, Orte, Quests)
                </li>
                <li>
                  Metadaten zur Aufnahme (Zeitpunkt, Modus, Status, technische
                  Chunk-Informationen)
                </li>
              </ul>
              <p className="mt-4">
                <strong>Wann und wie wird aufgezeichnet?</strong>
                <br />
                Die Aufzeichnung erfolgt <strong>nicht automatisch</strong>. Sie wird
                ausschließlich vom GM gestartet, pausiert und beendet. Vor dem Start muss
                der GM einen Hinweis zur Aufzeichnung bestätigen; in der Live-Session wird
                angezeigt, wenn Audio aufgezeichnet wird (
                <em>„Achtung: Das Audio Ihrer Session wird aufgezeichnet.“</em>
                ). Teilnehmende sollten zu Beginn der Runde mündlich informiert werden.
              </p>
              <p className="mt-4">
                <strong>Aufnahmemodi:</strong>
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>
                  <strong>Tisch-Runde:</strong> Aufnahme über das Mikrofon des GM-Geräts
                  am Spieltisch (Stimmen der anwesenden Personen können erfasst werden)
                </li>
                <li>
                  <strong>Online-Runde (Jitsi):</strong> Aufnahme im Rahmen der
                  Videokonferenz über{" "}
                  <a
                    href="https://meet.osna.social/tableheroes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hero-vibrant hover:text-accent-gold transition-colors"
                  >
                    meet.osna.social/tableheroes
                  </a>
                </li>
              </ul>
              <p className="mt-4">
                <strong>Wer hat Zugriff?</strong> Audiodaten, Transkripte und Chroniken
                sind für den GM sowie für freigeschaltete Teilnehmende der jeweiligen
                Kampagne in TableHeroes einsehbar. Eine Veröffentlichung außerhalb der
                Plattform erfolgt nicht ohne gesonderte Zustimmung.
              </p>
              <p className="mt-4">
                <strong>Speicherdauer:</strong> Die Daten verbleiben, solange die
                zugehörige Kampagne bzw. Session auf TableHeroes besteht, sofern sie nicht
                früher gelöscht werden (z. B. auf Anfrage oder bei Löschung der Session).
              </p>
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
                <li>
                  Erstellung von Session-Chroniken aus Audio-Aufzeichnungen (Transkription
                  und KI-gestützte Zusammenfassung für GM und Spieler der Kampagne)
                </li>
              </ul>
              <p className="mt-4">
                <strong>Rechtsgrundlagen (Art. 6 DSGVO):</strong> Die Verarbeitung Ihrer
                Kontodaten und Kampagnendaten erfolgt zur Vertragserfüllung bzw. vor
                Vertragsschluss (Art. 6 Abs. 1 lit. b DSGVO). Technische Protokolldaten
                verarbeiten wir auf Grundlage berechtigter Interessen an Betrieb und
                Sicherheit der Plattform (Art. 6 Abs. 1 lit. f DSGVO). Die
                Audio-Aufzeichnung während Spielrunden erfolgt auf Grundlage der
                Einwilligung des GM vor Session-Start sowie der mündlichen Information
                der Teilnehmenden zu Beginn der Runde; ohne diese kann der
                Chronist-Dienst nicht genutzt werden (Art. 6 Abs. 1 lit. a DSGVO).
              </p>
            </section>

            {/* Weitergabe */}
            <section>
              <h2 className="font-barlow font-bold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
                5. Weitergabe von Daten
              </h2>
              <p>
                Eine Weitergabe Ihrer personenbezogenen Daten an Dritte zu Werbezwecken
                erfolgt nicht. Zur Bereitstellung unserer Dienste setzen wir jedoch
                folgende <strong>Auftragsverarbeiter</strong> ein (Art. 28 DSGVO), die
                Daten in unserem Auftrag und nach unseren Weisungen verarbeiten:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>
                  <strong>Supabase Inc.</strong> (Hosting, Datenbank, Authentifizierung,
                  Speicherung von Audio-Chunks) — USA
                </li>
                <li>
                  <strong>OpenAI, L.L.C.</strong> (automatische Spracherkennung /
                  Transkription und KI-Zusammenfassungen für Session-Chroniken sowie
                  weitere KI-Funktionen in der Plattform) — USA
                </li>
              </ul>
              <p className="mt-4">
                Bei Übermittlungen in Drittländer (insbesondere USA) stützen wir uns,
                soweit erforderlich, auf geeignete Garantien (z. B. Standardvertragsklauseln
                der Auftragsverarbeiter). Audio-Dateien werden zur Transkription an OpenAI
                übermittelt; dort entsteht ein Texttranskript, das bei uns gespeichert wird.
              </p>
              <p className="mt-4">
                Darüber hinaus geben wir Daten nur weiter, wenn:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Sie ausdrücklich eingewilligt haben</li>
                <li>die Weitergabe zur Erfüllung gesetzlicher Verpflichtungen erforderlich ist</li>
                <li>die Weitergabe zur Durchsetzung unserer Rechte erforderlich ist</li>
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
                <li>
                  Widerruf erteilter Einwilligungen (z. B. zur Nutzung der
                  Audio-Aufzeichnung) mit Wirkung für die Zukunft
                </li>
              </ul>
              <p className="mt-4">
                Betroffene von Audio-Aufzeichnungen können jederzeit die Löschung der
                zugehörigen Audiodaten, Transkripte oder Chroniken verlangen, soweit
                keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
              </p>
              <p className="mt-4">
                Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
                <a
                  href="mailto:designer@sven-sieber.de"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  designer@sven-sieber.de
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
                Wir nutzen Supabase für die Datenspeicherung, Authentifizierung und das
                Hosting von Audio-Chunks (Bucket „session-audio-chunks“). Anbieter ist
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
                OpenAI
              </h3>
              <p>
                Für die Session-Chronik (Spracherkennung via Whisper und
                KI-Zusammenfassungen) sowie weitere KI-Funktionen (z. B. Lore- und
                Charakter-Assistenten) nutzen wir Dienste von OpenAI, L.L.C., USA.
                Dabei können Audio- und Textinhalte an OpenAI übermittelt werden.
                Details:{" "}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  Datenschutzerklärung von OpenAI
                </a>
                .
              </p>

              <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2 mt-4">
                Jitsi / meet.osna.social
              </h3>
              <p>
                Für Online-Spielrunden mit Audio-Aufzeichnung kann eine Videokonferenz
                über{" "}
                <a
                  href="https://meet.osna.social/tableheroes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hero-vibrant hover:text-accent-gold transition-colors"
                >
                  meet.osna.social/tableheroes
                </a>{" "}
                genutzt werden. Beim Aufruf dieser externen Konferenz gelten die
                Datenschutzbestimmungen des jeweiligen Betreibers. TableHeroes speichert
                in diesem Modus die Audio-Aufzeichnung über den Session-Chronist in
                Supabase.
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
                <strong>Stand:</strong> Juni 2026
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
