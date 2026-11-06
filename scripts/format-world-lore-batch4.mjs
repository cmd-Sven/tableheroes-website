/**
 * Letzte mittellange Texte ohne ## (>700 Zeichen).
 * Apply: node scripts/format-world-lore-batch4.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    env[m[1]] = m[2];
  }
  return env;
}

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const UPDATES = {
  "c63a7ac3-a2a1-46e4-aa91-cbddc915c6ae": `Die Eisenfeste thront erhaben inmitten von Explora, ihre dunklen Steinmauern von der Zeit gezeichnet und von einer dichten Nebeldecke umhüllt.

## Atmosphäre

Der Geruch von feuchtem Stein und abgestandenem Blut hängt in der Luft und vermischt sich mit dem rauchigen Aroma von Feuer und geschmolzenem Metall, die aus der Waffenschmiede dringen. Aus den Schatten der hinteren Gänge greifen das Echo von Befehlen und das Klirren von Ketten und Rüstungen die Luft, während die Wächter in straffem Formationsmarsch ihren Pflichten nachgehen.

## Eindruck

Wer die Schwelle überschreitet, spürt den stetigen Druck der Erwartung, das Kribbeln von latentem Unheil — und die ständige Erinnerung an die magische Katastrophe, die über die Stadt gebrochen ist, bewahrt in den kühlen, finsteren Hallen dieser Kaserne.`,

  "42e54977-9741-4fe0-9318-a056c72027c7": `Die alte Anlegestelle von Explora befindet sich an der Ostspitze der Insel Kassadras und ist ein Überbleibsel einer glorreichen Vergangenheit.

## Geschichte

Vor 200 Jahren war dieser Ort der letzte Hafen, an dem die majestätischen Flugschiffe der Luftfahrer landeten und Flüchtlinge in Sicherheit brachten.

## Heute

Heute ist die Anlegestelle ein verlassener, verwitterter Ort, umgeben von schroffen Klippen und dem unbarmherzigen Zorn des Meeres. Die rostigen Überreste der Anlegestelle erzählen Geschichten von Verzweiflung, Hoffnung und dem unaufhaltsamen Fluss der Zeit.

Gelegentlich wird die Stille von den Echos alter Legenden durchbrochen, die besagen, dass die Seelen der Flüchtlinge, die einst hier ankamen, noch immer in der Nähe wandern — auf der Suche nach Frieden und Erlösung.`,

  "4dadc56f-1098-4e20-9546-b2ec6a2276a2": `Als du die Schwelle zur Zenitischen Amboss überschreitest, umfängt dich die drückende Hitze, die von dem schüffelnden Feuer im zentralen Schmelzofen ausgeht.

## Werkstatt

Der Geruch von glühendem Metall mischt sich mit dem stechenden Duft des Vattrak-Erzes, das verarbeitet wird. Sorgfältig geschmiedete Hämmer und prächtige Schilde hängen an den Wänden, die mit einer dicken Schicht aus Ruß und Geschichte bedeckt sind.

## Der Schmied

Das gleichmäßige Klopfen von Harport Grummbel Toss, einem stämmigen Mann mit einem unbändigen Bart, der mit jedem Hieb Kraft und Präzision ausstrahlt, erfüllt den Raum. Seine Augen funkeln vor Stolz, während er dir einen herrschaftlichen Schild präsentiert, der die Strahlen des Zenits in ein faszinierendes Spiel von Schatten und Licht verwandelt.`,

  "cf45af31-6f74-419d-b1e0-f65e8cc8cd39": `> Hüter der Wälder, Schatten unter den Bäumen, Kinder der Wildnis.

Aus dem Erbe der Hochelfen hervorgegangen, zogen sich die Waldelfen tief in die uralten Wälder Kassadras zurück — fernab von den leuchtenden Hallen ihrer Vorfahren. Dort, im Einklang mit der Natur, formten sie eine Lebensweise, die auf Harmonie, Instinkt und Freiheit beruht.

## Sinne und Können

Ihre Sinne sind geschärft wie die Klinge ihres Jagdmessers, ihr Blick so wachsam wie der eines Luchses. Waldelfen gelten als meisterhafte Fährtenleser, geschickte Bogenschützen und verschlossene Wächter ihrer Reiche.

## Verbindung zur Natur

Viele sehen in ihnen die lebendige Verbindung zwischen dem Volk der Elfen und dem wilden Herz Kassadras’. Sie verehren die Natur nicht nur — sie sind ein Teil von ihr.`,

  "4e6d3ab1-39e0-4dce-96ef-7314c413360d": `Der Außenposten Alpha liegt mitten in den Wäldern von Explora und ist ein wichtiger Stützpunkt zur Fleischlieferung, Förderung von Torf und Blausalz sowie dem Ertrag an wertvollen Kräutern aus den umliegenden Sümpfen.

## Paladine der Enklave

Die Paladine der Enklave haben hier ebenfalls eine kleine Bastion, um von hier aus die Arbeiter zu schützen und die Handelsroute gen Explora zu sichern. Ein Hauptmann mit insgesamt fünf weiteren Paladinen ist hier stationiert.

## Jäger und Arbeiter

Zusätzlich gibt es eine Jägerszunft von fast zwölf Jägern und Jägerinnen, die in Trupps für eine kontinuierliche Fleischlieferung sorgen.

Der Großteil der Arbeiter besteht jedoch aus Grubenschauflern, Torfstechern und Siedeschwelgern, um Torf zu fördern und das Blausalz herauszuwaschen.`,

  "03c9a2cf-2e63-4045-9378-1ba0faca31a7": `Wenn du die Stadt Falghalar betrittst, umfängt dich sofort der feuchte, schwere Geruch von raffiniertem Wasser aus den hohen Aquädukten.

## Atmosphäre

Die Luft ist kühl und flirrt, während schwacher Nebel über die glänzenden Pflastersteine schwebt und die Silhouetten der blauen Trachten der Bewohner verschleiert. Über dir schnellt Wasser aus schmalen Kämmen und hallt in einem sanften Plätschern durch die Gassen, dessen Melodie von einem Gesang verkleideter Marktfrauen und dem Lärm von Tiermenschen unterbrochen wird.

## Zentrum

In der Ferne erhebt sich die mächtige Festung im Zentrum, ihre Türme umgeben von seidigen Schwaden, wie ein unheimlicher Wächter über das rege Treiben des Marktplatzes, wo Händler und Bewohner ihre Geschäfte abwickeln.`,

  "14c3f714-b1cd-4a65-9d59-5938810ee2ae": `Den größten Anteil machen die roten Tieflinge in der Kultur der Tieflinge aus; sie sind ruhiger und auch freundlicher. Ihre Aufgeschlossenheit über ihr Schicksal lässt sie in einem anderen Licht sehen.

## Vorurteile

Leider haben viele andere Rassen und Völker immer noch typische Vorurteile gegenüber ihresgleichen: Sie werden oft als Monster oder Dämon bezeichnet und sind mancherorts auch unerwünscht.

## Wesen und Fähigkeiten

Sie sind robuster und ausdauernder gegenüber Hitze und scheuen das Feuer nicht. Ihr Wesen und Auftreten gleicht dem von Menschen, und inzwischen konnten sich viele von ihnen ohne Probleme eine Existenz innerhalb von Städten und Dörfern aufbauen.

Sie gelten als besonders begabt, wenn es um das Lernen, Studieren und Unterrichten geht.`,

  "98607bcb-6776-443e-b706-b2c81fb46335": `Ein kalter Wind weht durch den düsteren Eingang der Tunnel von Arta-Maahr, während die gewaltige Statue eines zwergischen Kriegers über den stillen Pfad wacht.

## Sinne

Die Luft ist schwer von dem modrigen Geruch alter Steine und dem schwachen Hauch von Eisen, der wie ein gespenstisches Echo von vergangenen Zeiten wirkt. Das gedämpfte Licht dringt nur schwach durch den Nebel, der sich um die Öffnung schmiegt und eine beunruhigende Stille hinterlässt, in der nur das gelegentliche Tropfen von Wasser zu hören ist.

## Eindruck

Ein mulmiges Gefühl breitet sich in euren Mägen aus, als ob die Tunnel selbst euch zu einer längst vergangenen Zeit rufen, in der sich hier die Geheimnisse der Zwerge und ihre vergessenen Geschichten entfalten könnten.`,

  "892b57d3-e599-4eaa-873d-edd03db9b3de": `Die Alte Anlegestelle ist fast jedem in Explora ein Begriff und wurde einst vor über 70 Jahren geschlossen. Es war der allererste Anlegeplatz auf das Inselreich und bot den ersten Flüchtlingen aus Kassadras die Möglichkeit, die Insel mit ihren Luftschiffen anzusteuern.

## Sperrung

Die Paladine haben diesen Bereich gesperrt, da er verfallen und verlassen ist. Da es keine Luftschiffe mehr gibt und Kassadras weiterhin als gefährlich gilt, wurden keine weiteren Investitionen getätigt, um die Anlage wieder in Betrieb zu nehmen.

## Gerüchte

Es gibt jene, die sogar davon berichten, dass die Ostspitze auch deshalb aufgegeben wurde, weil diese Inselsektion als brüchig und instabil gilt. Seit einigen Jahren kommt es dort angeblich zu leichten Erdbeben.`,

  "d139b913-2b71-49b5-aa6d-a59250662677": `**Die Maschinenzwerge**

Die Maschinenzwerge sind ein kleiner, aber äußerst innovativer Clan, der in der Schlucht von Koraxx lebt. Sie sind bekannt für ihre meisterhafte Beherrschung von Technologie und Mechanik, während sie die Verwendung von Magie strikt ablehnen und stattdessen magische Energien in Behältern versklaven, um ihre Maschinen zu betreiben.

## Der Große Plan

Unter der Leitung des „Großen Architekten“ verfolgen sie einen mysteriösen „Großen Plan“, der seit über 450 Jahren im Gange ist.

## Allianz mit den Gnomen

Mit den Maschinenzwergen zusammen tummeln sich die Gnome — ebenfalls große Erfinder und technisch begabt. Eine Allianz zwischen ihnen hat das Fortbestehen ihrer Art gesichert, mit dem Versprechen, den großen Plan umzusetzen.`,

  "498bf8fe-de2a-4322-a013-832439c75d07": `Der Markt- und Handelsviertel von Explora ist einer der belebtesten Teile der Stadt, in der fast alle Rassen anzutreffen sind. Der Markt wird fast täglich betrieben mit wechselnden Ständen für die unterschiedlichsten Dinge — hauptsächlich natürlich um Nahrungsmittel zu verkaufen, aber auch andere Konsumgüter.

## Gilden und Zünfte

Zudem findet man hier viele Zunfthäuser einiger Gilden wie die der Handelsgilde, Bergwerksgilde Eifriger Hammer oder das opulente Haus der Seidenzunft.

## Straßenkunst und Taverne

Das Stadtbild wird hier auch von zahlreichen Straßenkünstlern geprägt, die direkt von der Kunstschule Eloquenzia kommen. Außerdem ist hier auch die berühmte Taverne „Zur rostigen Glocke“ anzutreffen, die gen Abend öffnet und für jeden etwas zu bieten hat.`,

  "742fbe3c-0af8-4745-b67b-49828d01199e": `Die Schattenlande von Aurelis sind ein düsteres, brodelndes Reich voller Geheimnisse und unterdrückter Ängste.

## Atmosphäre

Der Luft haftet der kaustische Geruch von verbranntem Holz und fauligem Fleisch an, während das Licht der Sonne hinter einem schweren Schleier aus grauen Wolken verborgen bleibt. Über die Straßen gleiten Schatten und murmeln Nachrichten von längst vergangenen Konflikten, während das gelegentliche Kreischen einer Krähe die bedrückende Stille durchbricht.

## Orte

Hier, in den verwinkelten Gassen von Greifenberg, Mal-Vantarth und Jokental, scheinen die Zeit und die Hoffnung eingefroren zu sein, während die Bewohner in schönen Lügen gefangen und die einst blühenden Märkte in schäbige Ruinen verkommen sind.`,

  "af7a5249-ae3f-4185-87e1-c430776e50c9": `Die Wälder von Explora reichen von der Westseite bis hin zur Ostseite und sind deutlich älter als die Stadt Explora selbst. Die Flüchtlinge versuchen mithilfe der Waldelfen schon seit den ersten Ankömmlingen, die Wälder zu schützen und sinnvoll zu nutzen. Es gibt abgesteckte Bereiche, welche für die Gewinnung von Rohstoffen vorgesehen sind.

## Bruch der Abmachung

Doch die einst besiegelte Abmachung existiert nicht mehr. Die Waldelfen haben sich weiter zurückgezogen und müssen ohnmächtig mit ansehen, wie die Welt um sie herum sich weiter verändert und seltsame Transporte, gefüllt mit dunkler Energie, durch ihre Wälder streifen.

## Widerstand

Natürlich wollen sie dies nicht hinnehmen und greifen die Transporte immer wieder an.`,
};

async function main() {
  console.log(APPLY ? "APPLY" : "DRY-RUN", Object.keys(UPDATES).length);
  if (!APPLY) return;
  for (const [id, description] of Object.entries(UPDATES)) {
    const { error } = await supabase.from("world_lore").update({ description }).eq("id", id);
    if (error) throw new Error(`${id}: ${error.message}`);
    console.log("ok", id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
