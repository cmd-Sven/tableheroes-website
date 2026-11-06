/**
 * Restlücken: lange Lore ohne brauchbare ##-Struktur.
 * Apply: node scripts/format-world-lore-batch3.mjs --apply
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
  "b7254049-a00b-413a-9467-fb41d0c55680": `Die Mondelfen sind eine eigenständige Rasse, entstanden nicht aus dem göttlichen Schöpfungswillen Zephyras — wie alle Elfen —, sondern aus der stillen, unergründlichen Gnade Lunaras, der Göttin des Mondes und der Nacht. Sie sind nicht verwandt mit den Elfen, sondern eine eigene Linie göttlicher Kinder — den dunklen, stillen Geschwistern der hellen Völker.

Während Zephyra die Elfen aus Licht und Harmonie gebar, schuf Lunara die Mondelfen aus Stille, Schatten und Traum. Ihre Kinder sind keine Sonnenwanderer; sie wurden geboren, um das Unbekannte zu bewahren, das Unsichtbare zu schützen und das Verborgene zu verstehen, nicht zu fürchten.

Die ersten Mondelfen stiegen aus dem Wasser der nächtlichen Moore, gehüllt in Nebel und Mondlicht, mit Augen, die nie Lieder sangen, aber jede Wahrheit spiegelten. In der Welt Kassadras gelten sie als anders, fremd, ja mitunter unheimlich — doch sie sind weder bösartig noch verdorben. Sie sind das Gleichgewicht zur hellen Seite des Schöpfungsliedes.

## Herkunft und Schöpfergöttin

Elfen stammen von Zephyra, Göttin des Lichts, der Ordnung und der Magie. Mondelfen stammen von Lunara, Göttin der Nacht, der Intuition und der Stille.

Elfen sind vom Klang, von Harmonie, von Struktur erfüllt. Mondelfen hingegen sind die Pause im Lied, das Flüstern zwischen den Versen, die Erinnerung im Dunkel.

## Essenz und Wirkung

Elfen wirken offen, edel, strahlend — selbst die wildesten unter ihnen. Mondelfen wirken ruhig, still, zurückgezogen — und doch mit intensiver Präsenz.

Ein Elf sucht Klarheit, Bedeutung, Licht. Ein Mondelf sucht Tiefe, Gefühl, Wahrheit jenseits von Worten.

## Beziehung zur Magie

Elfen begreifen Magie als Kunst, Struktur oder Prinzip — sei es als Lied, Form oder Werkzeug. Mondelfen spüren Magie als Fluss, Ahnung, Spiegelung. Für sie ist Magie nicht zum Lehren da — sie wird empfangen.

Ihre Fähigkeiten sind oft intuitiv, erscheinen spontan, wirken traumhaft oder sogar irrational — aber sie folgen einer inneren, verborgenen Logik, die sich selten in Worte fassen lässt.

## Körperliche Merkmale

Mondelfen besitzen eine anmutige, doch unheimlich wirkende Erscheinung, die sie deutlich von anderen Völkern — insbesondere von den klassischen Elfen — abhebt.

### Hautfarbe

Ihre Haut ist hellblau bis blass-lila, oft schimmernd wie Mondlicht auf Wasser. Diese Färbung variiert je nach Herkunft, Nähe zu magischen Quellen oder der göttlichen Verbindung zu Lunara. In völliger Dunkelheit wirkt sie beinahe leuchtend, was sie in ihren nebligen Sümpfen beinahe geisterhaft erscheinen lässt. Sie können dieses Leuchten kontrollieren; bei starken Gefühlsausbrüchen kann es aber vorkommen, dass sie unwissentlich heller werden.

### Augen — liedlos und tief

Wie zuvor beschrieben, sind ihre Augen liedlos — sie reflektieren kein Licht, wirken unbewegt und spiegeln nichts wider. Die Farbe reicht von silbrig-grau über tiefviolett bis schwarz. Sie wirken leer, aber das ist eine Täuschung — in Wahrheit sehen sie mehr als andere.

### Spitze Eckzähne

Ein auffälliges, oft übersehenes Merkmal sind ihre verlängerten, spitzen Eckzähne, die leicht vampirisch wirken. Sie haben keinen blutsaugenden Zweck — aber sie stammen aus der alten Schutzfunktion, als Mondelfen Tiere und Dämonen der Nacht bekämpften. In Mythen heißt es, diese Zähne sind ein Geschenk Umbrels selbst — ein Zeichen, dass sie nicht wehrlos geboren wurden.`,

  "8b617387-91ca-4f60-8d1d-8d9d7fd97b65": `> „Am Ende ist nur die Leere – und die Leere ist in uns.“

Der Glaube an Malaghor ist in Kassadras keine organisierte Kirche mit prunkvollen Kathedralen. Es ist ein schleichendes Gift oder eine bittere Erkenntnis, je nachdem, wen man fragt. Der Kult lehrt, dass Ordnung eine Illusion ist, die das wahre, chaotische Wesen der Existenz nur mühsam verdeckt.

## Die zwei Gesichter des Kultes

### 1. Die „Stillen Beobachter“ (die philosophische Seite)

Diese Anhänger sind oft Gelehrte, Einsiedler oder Menschen, die Schreckliches erlebt haben. Sie sehen Malaghor nicht als böse, sondern als den natürlichen Zustand des Universums.

- **Überzeugung:** Licht erzeugt Schatten. Wer das Chaos akzeptiert, kann nicht mehr davon überrascht werden.
- **Praxis:** Sie üben keinerlei Magie aus, da sie glauben, dass das Formen von Magie ein arroganter Versuch ist, dem Chaos eine Ordnung aufzuzwingen.
- **Erscheinung:** Sie tragen einfache, aschgraue oder schwarze Gewänder und halten ihre Gesichter oft im Schatten ihrer Kapuzen verborgen, um die eigene Identität in der Bedeutungslosigkeit des Nichts aufzulösen.

### 2. Die „Sklaven des Abgrunds“ (die dunklen Diener)

Für die dunklen Völker von Kassadras ist Malaghor eine Quelle schrecklicher Macht. Sie sehen im Wahnsinn keine Krankheit, sondern eine Entfesselung des Geistes.

- **Überzeugung:** Malaghor ist der Sklavenhalter, dem man dienen muss, um nicht von ihm verschlungen zu werden. Macht durch Korruption ist ihr einziger Weg.
- **Die Malanthir-Korruption:** Diese Diener nutzen das verbotene Malanthir-Erz. Es verleiht ihnen arkane Macht, doch der Preis ist hoch: bleiche Haut, schwarze Adern, leuchtende Augen oder vollkommener geistiger Zerfall (Wahnsinn).

## Hierarchie & Bezeichnungen

### Priester: Der Observator

Die Observatoren sind die „Seher des Nichts“. Ihre Aufgabe ist es, den Verfall der Welt zu beobachten und zu dokumentieren. Sie greifen selten direkt ein, sondern flüstern Worte des Zweifels, um die Ordnung zu untergraben.

### Kleriker: Der Nihilit

Im Gegensatz zu den Observatoren sind Nihiliten jene, die den Vortex aktiv verbreiten. Sie kanalisieren die Leere, um den Geist ihrer Feinde zu zerschmettern oder das Gefüge der Realität zu lockern.

## Symbolik & Reliquien

- **Das Wappen:** Ein strudelnder schwarzer Vortex. Er symbolisiert den Sog des Vergessens, dem am Ende alles anheimfällt.
- **Die Reliquie:** Splitter des Malanthir-Erzes. Mächtige Diener tragen oft Splitter dieses Erzes bei sich — meist in Form von Schmuck, der direkt auf der Haut brennt. Für sie ist der Schmerz eine ständige Erinnerung an Malaghors Anwesenheit.
- **Der Fokus:** Nihiliten nutzen oft Bruchstücke von obsidianartigem Gestein oder dunkle Spiegel, in denen man kein Spiegelbild sieht, sondern nur einen tiefen, schwarzen Schlund.

## Verhältnis zu anderen Mächten

- **Gegenüber Vattrak (das helle Ende):** Es besteht eine tiefe Feindschaft. Während Vattrak alles in einer weißen Leere auslöschen will, will Malaghor, dass alles in das ursprüngliche, schwarze Chaos zurückkehrt.
- **Gegenüber Fatum:** Fatum und Malaghor teilen das Element des Chaos. Doch während Fatum das Chaos nutzt, um neue Wege zu bauen, sieht Malaghor im Chaos nur das endgültige Ende aller Wege.`,

  "307d0eba-6ca3-4985-9eeb-ed18e1577c88": `> „Folge dem Wind, bevor er sich dreht.“

Der Orden der Ungebundenen Schwinge ist eine Gemeinschaft, die Freiheit über alles schätzt. Es gibt keine festen Tempelmauern; für einen Anhänger Zephyras ist jeder Ort, an dem der Wind weht, ein heiliger Boden. Die Religion betont die Bewegung — Stillstand wird als spiritueller Tod betrachtet.

## Organisation & Hierarchie

Die Struktur des Ordens ist so flüchtig wie eine Brise. Man findet sie in den höchsten Bergen oder den tiefsten Wäldern von Kassadras.

### Die Opalus (Priester)

Diese Priester sind die Bewahrer der Lieder und Tänze. Sie werden oft als Seher betrachtet, die den Willen der Göttin im Rauschen der Blätter lesen.

### Die Windwächter (Kleriker)

Sie kanalisieren die elementare Kraft. Sie können die Luft reinigen, Segel füllen oder Feinde mit Sturmböen von den Füßen reißen.

### Die Lysand-Ritter (Paladine)

Benannt nach dem legendären geflügelten Pferd der Göttin. Sie sind die wandernden Beschützer der Reisenden und Unterdrückten. Sie kämpfen für die Unabhängigkeit (Aeloria) und gegen jede Form von Sklaverei oder Gefangenschaft.

## Glaubenslehre & Die Kinder des Sturms

Das Dogma basiert auf der Trinität ihrer Kinder:

- **Der Ruf der Aeloria (Abenteuerlust):** Der Drang, den Horizont zu überschreiten. Jede Reise ist ein Gebet.
- **Der Zorn des Boreas (Gewalt):** Das Wissen, dass Freiheit manchmal mit der rohen Kraft des Donners verteidigt werden muss.
- **Die Weisung des Talandis (Führung):** Er sorgt dafür, dass man sich in der Freiheit nicht verliert. Er ist der Kompass im Sturm.

## Die Legende von Lysand

Ein zentrales Element des Glaubens ist die Geschichte, wie Zephyra ihre eigenen Flügel verlor (ein Symbol für ein großes Opfer in der Urzeit von Kassadras). Seitdem reitet sie auf dem geflügelten Pferd Lysand. Das Wappen — ein Pferd, das vom Wind emporgehoben wird — erinnert die Gläubigen daran, dass man auch ohne eigene Flügel fliegen kann, wenn man dem Wind vertraut.

## Beziehungen & Spannungen

- **Lunara:** Eine tiefe Verbundenheit. Der Wind und der Mond leiten die Seeleute und Nachtwanderer gemeinsam durch die Dunkelheit.
- **Pyrondas:** Hier herrscht massive Spannung. Feuer braucht Wind zum Atmen, doch der Wind fürchtet die verzehrende Hitze, die die Luft verbrennt. Stürme und Feuerbrünste sind in Kassadras oft Zeichen eines göttlichen Streits.

## Heilige Symbole & Magische Reliquien

- **Die Weiße Feder:** Das Zeichen der Zugehörigkeit. Oft wird sie am Hut, am Stab oder an der Rüstung getragen.
- **Der Stirnreif des Vatrak-Erzes:** Da Zephyra eng mit dem Licht verbunden ist, nutzen ihre Magieanwender silberne Stirnreifen mit Vatrak-Erz. Im Gegensatz zum fanatischen Gebrauch durch Chromus-Sekten nutzen die Windwächter das Vatrak-Licht, um die Luft zum Leuchten zu bringen und Blitze zu leiten.
- **Der Feder-Ring:** Ein einfaches Erkennungsmerkmal für alle Gläubigen.`,

  "4e554e7f-3c59-4651-aa27-edf45e242e3e": `> „Im Schatten liegt die Wahrheit, im Licht nur die Sicht.“

Der Orden des Silbernen Schweigens ist die Gemeinschaft derer, die die Nacht nicht fürchten, sondern als Schutzraum verstehen. In Kassadras gelten die Anhänger Lunaras als Hüter von Geheimnissen, Spione des Guten oder stille Wächter über den Schlaf der Sterblichen.

## Organisation & Hierarchie

Die Tempel der Lunara sind oft verborgene Grotten oder Türme mit offenen Dächern, die nur bei Nacht ihre wahre Pracht entfalten, wenn das Mondlicht auf den polierten Marmor trifft.

### Die Sussura (Priesterschaft)

Ihr Name leitet sich vom Flüstern ab. Sie sind die Bewahrer der mündlichen Überlieferungen und Geschichtenerzähler. Ein Sussura spricht selten laut; sie lehren, dass die wichtigsten Wahrheiten zwischen den Zeilen (oder im Dunkeln) liegen.

### Die Nachtwächterinnen (Kleriker)

Sie nutzen Lunaras Magie zum Schutz. Sie erschaffen Schutzzonen gegen die Schrecken der Nacht und nutzen Intuition, um Lügen zu erkennen. Sie sind die Hüterinnen der Träume (Nyxara).

### Die Nachtklingen (Paladine/Streiter)

Sie sind die scharfe Seite des Mondlichts. Eine Nachtklinge kämpft mit Präzision und Tarnung. Sie nutzen die Angst (Terrentus) als Waffe gegen ihre Feinde und bewegen sich durch die Schatten (Umbral), als wären sie ein Teil von ihnen.

## Glaubenslehre & Mysterien

- **Intuition über Logik:** Der Orden lehrt, dass der Verstand getäuscht werden kann, das Bauchgefühl (die Intuition) unter dem Mondlicht jedoch niemals lügt.
- **Schutz der Träume:** Durch Nyxara sehen sie es als ihre heilige Pflicht, den Schlaf der Unschuldigen vor den Schrecken des Vortex zu bewahren.
- **Die Illusion:** Die Anhänger wissen um die Gefahr der Täuschung. Sie nutzen Illusionen, um sich zu verbergen, warnen aber davor, sich in den eigenen Träumen zu verlieren.

## Symbole & Reliquien

- **Das Wappen:** Eine Mondsichel in der Mitte, hinter der spitz zulaufende Augen angedeutet sind — ein Zeichen dafür, dass Lunara alles sieht, selbst wenn man glaubt, im Dunkeln allein zu sein.
- **Die Reliquie:** Weiße Perlenketten. Jede Perle symbolisiert ein bewahrtes Geheimnis oder eine überstandene Angst. Je länger die Kette eines Sussura, desto weiser ist er.
- **Die Vatral-Klinge:** Zur Ausübung von Magie und im Kampf nutzen sie Dolche oder Messer mit weißen Griffen. Die Klinge besteht aus Vatral — einer seltenen Legierung, die im Mondlicht bläulich glimmt und Illusionen zerschneiden kann.

## Beziehungen im Pantheon

- **Zephyra:** Die engste Verbündete. Der Wind trägt das Flüstern der Sussura über ganz Kassadras.
- **Ferroth:** Spannungen herrschen vor, da Ferroth für das harte, unnachgiebige Metall und das laute Handwerk steht, was den subtilen, ätherischen Werten Lunaras widerspricht.`,

  "e2f5c7d6-80ac-424e-95b4-7241411e4780": `> „Was war, ist geschrieben. Was kommt, ist gezählt.“

Das Konklave der Ewigen Ordnung ist die Kirche des Chromus. Ihre Anhänger glauben an die Unabwendbarkeit des Schicksals und die heilige Struktur der Zeit. In ihren Augen ist das Universum eine gewaltige, präzise Maschine, in der jedes Leben ein Zahnrad darstellt. Wer gegen das Schicksal kämpft, stört den Rhythmus der Welt.

## Organisation & Hierarchie

Die Kirche ist streng hierarchisch und von militärischer Disziplin geprägt, was den Einfluss seines Sohnes Imperus widerspiegelt.

### Die Physici (Singular: Physicus)

Die Priester des Konklaves. Sie sind Chronisten, Mathematiker und Sternendeuter. Sie berechnen Zyklen und führen Rituale zur Reflexion über vergangene Entscheidungen durch.

### Die Instruktoren

Die Kleriker des Chromus. Sie sorgen dafür, dass die Regeln der Zeit und der Gesellschaft eingehalten werden. In der Schlacht kontrollieren sie den Fluss der Zeit — sie beschleunigen Verbündete oder lassen Feinde in Zeitlupe erstarren.

### Die Aeterna-Wächter (Paladine)

Unbeugsame Krieger, die das „Jetzt“ schützen und gegen jene kämpfen, die versuchen, den natürlichen Lauf von Leben und Tod (den Zyklus von Fundrah) zu korrumpieren.

## Glaubenslehre & Kosmologie

- **Das Dogma:** Alles hat seine Zeit. Geburt, Wachstum und das Ende eines Zyklus sind heilig. Die Anhänger schätzen Disziplin (Imperus) und den richtigen Moment (Chrona).
- **Die Schattenseite:** Die lähmende Akzeptanz der Unausweichlichkeit. Kritiker werfen dem Konklave vor, fatalistisch zu sein — warum kämpfen, wenn das Ende ohnehin feststeht?
- **Beziehung zu Fatum:** Es herrscht ein tiefer, gegenseitiger Respekt. Chromus liefert den Rahmen (die Zeit), während Fatum die Möglichkeiten darin testet. Ohne Chromus gäbe es keine Zeit, in der Fatum wirken könnte; ohne Fatum wäre Chromus' Welt eine leblose Uhr.

## Symbole & Reliquien

- **Das Wappen:** Eine Stilisierung des Wechsels von Tag auf Nacht, überstrahlt vom Kosmos mit Planeten und Sternen. Es zeigt die Unendlichkeit und die Wiederkehr der Zyklen.
- **Das heilige Amulett:** Ein schweres, goldenes Rad, auf dem alle Zyklen des Jahres eingraviert sind. Es dient den Gläubigen als Kompass für ihr Leben.
- **Das Zepter der Äonen:** Ein rituelles Zepter, dessen Spitze eine Sanduhr bildet. Das Besondere: Sie enthält Vatrak-Erz-Staub. Da Vattrak das Licht und die „helle Zerstörung“ repräsentiert, nutzt das Konklave dieses Erz, um die reinigende, alles verzehrende Kraft der Zeit (das Ende eines Zyklus) magisch zu bündeln.`,

  "8429508f-e70f-4e65-8311-3f19f79f2a7f": `> „In der Liebe liegt unsere Stärke, in der Hoffnung unsere Zukunft.“

Der Bund der Silbernen Rose ist die am weitesten verbreitete Religion für das soziale Wohl in Kassadras. Sie ist weniger eine starre Institution als vielmehr ein Netzwerk aus Heilern, Diplomaten und Schützern, die das Glück der Gemeinschaft über alles stellen.

## Organisation & Hierarchie

Die Tempel der Elysia sind oft offene Pavillons oder prachtvolle Gärten, in denen das Sonnenlicht und die Düfte der Natur die Liturgie bestimmen.

### Die Amantes (Priesterschaft)

Sie sind die „Liebenden“ der Göttin. Ihre Aufgabe ist die Seelsorge, das Verfassen von Liebesliedern und die Durchführung von Zeremonien (Hochzeiten, Geburten, Versöhnungen).

### Die Friedenshüter (Kleriker)

Diese Kleriker fungieren als medizinisches und diplomatisches Korps. Sie nutzen Elysias Licht, um Wunden zu schließen und verhärtete Fronten aufzubrechen.

### Die Pugnatoren (Paladine)

Die „Kämpfer für das Licht“. Sie sind der bewaffnete Arm des Bundes. Ein Pugnator greift nicht aus Hass an, sondern um das zu verteidigen, was er liebt. Sie sind die Schilde gegen die Tyrannei.

## Glaubenslehre & Werte

- **Das Streben nach Glück:** Inspiriert durch Fedrix, wird gelehrt, dass wahre Erleuchtung in den kleinen Freuden des Alltags liegt.
- **Die Tiefe der Bindung:** Durch Amoria und Weilin wird die Bedeutung von Romantik, Freundschaft und Familie hervorgehoben.
- **Die Akzeptanz der Wunde:** Der Bund lehrt, dass Schmerz und Enttäuschung Teil des Lebens sind. Nur wer bereit ist, verletzt zu werden, kann wahrhaft lieben.

## Symbole & Heilige Gegenstände

- **Das Wappen:** Zwei sich überlagernde Herzen, die von einem goldenen Glühen (Elysias Aura) erfüllt sind.
- **Die Reliquie:** Die Versilberte Rose. Jeder Anhänger trägt sie als Ring oder Brosche. In den Händen eines Klerikers wird sie zum Kanal für Heilmagie; als silberner Zauberstab bündelt sie das Licht gegen die Schatten.
- **Ritus der Blumenkränze:** Bei Festen binden Anhänger Kränze, die sie sich gegenseitig aufsetzen, um den Bund der Freundschaft oder Liebe für das kommende Jahr zu besiegeln.

## Beziehungen im Pantheon

- **Nerath:** Die engsten Verbündeten. Wo Nerath den Frieden durch Ordnung sichert, füllt Elysia diesen Frieden mit Leben und Freude.
- **Pyrondas:** Hier herrscht ein ständiges Knistern. Pyrondas' verzehrendes Feuer droht oft, die zarte Blüte der elysischen Liebe zu verbrennen. Der Bund sieht seine Leidenschaft als gefährlich instabil an.`,

  "25f4d984-2578-42f7-8758-5d2bd57788da": `> „Der Weg ist kein Strich, sondern ein Gewebe.“

Der Pfad der Tausend Wendungen ist der Glaube an Fatum, den Gott der Möglichkeiten. Diese Religion heiligt den Wandel, die individuelle Wahl und die unendliche Vielfalt der Existenz. Sie lehrt, dass Stillstand Verfall bedeutet und dass das Schicksal niemals starr ist, sondern in jedem Moment durch eine neue Entscheidung umgeschrieben werden kann.

## Organisation & Hierarchie

Die Kirche ist dezentral organisiert und passt sich den Gegebenheiten der jeweiligen Länder an.

- **Der Klerus:** Die Priesterschaft, zuständig für Philosophie, die Feier des Wandels und die Pflege der Naturrituale.
- **Die Karnifexe:** Die Kleriker des Fatum. Sie sind die aktiven Wirker der göttlichen Magie, die oft dort eingreifen, wo Möglichkeiten unterdrückt werden.
- **Die Vindices (Singular: Vindex):** Die Paladine des Pfades. Als „Rächer der Pfade“ beschützen sie die Freiheit der Wahl und kämpfen gegen Mächte, die das Schicksal gewaltsam erzwingen wollen.

## Glaubenslehre & Kosmologie

- **Das Dogma:** Anpassungsfähigkeit ist die höchste Tugend. Die Anhänger misstrauen dem blendenden, absoluten Licht von Vattrak, das Vielfalt auslöscht, und suchen stattdessen in der Dunkelheit von Malanthir nach verborgenen, neuen Wegen.
- **Die Schattenseite:** Der Pfad warnt vor der Entscheidungsangst — der Gefahr, sich in der Unendlichkeit der Möglichkeiten zu verlieren und handlungsunfähig zu werden.

## Symbole & Reliquien

- **Das Wappen:** Eine Gestalt mit drei Gesichtern und acht Armen, die in alle Richtungen agiert.
- **Das Erkennungszeichen:** Ein hellblauer Umhang oder eine Schärpe, übersät mit einem Muster aus Dutzenden Sternen.
- **Der Fokus:** Ein Stab oder Amulett, das in einem in sich verdrehten Knoten endet.
- **Heiligtum:** Das legendäre Astrolabium der Ungezählten Pfade, ein rotierendes Artefakt aus Messing und Sternenlicht, das die ständige Bewegung des Universums widerspiegelt.`,

  "3aa3a160-c0d2-437f-ad66-7407914ad3b2": `Die Menschen von Kassadras sind das facettenreichste und anpassungsfähigste Volk der bekannten Welt. Sie zeichnen sich nicht durch eine einzige, alles überlagernde Eigenschaft aus, sondern durch ihre unbändige Willenskraft, mit der sie sich an die extremsten Lebensräume und drastischsten Veränderungen ihrer Umwelt anpassen. Ob in den stürmischen Himmelsweiten, den prunkvollen Küstenstädten, den fruchtbaren Ebenen oder den akademischen Hochburgen — die Menschheit hat jeden Winkel des Kontinents geprägt.

## Geschichte und Pioniergeist

Historisch ist die Geschichte der Menschen untrennbar mit den großen Katastrophen und Umbrüchen Kassadras verwoben. Wo mächtige Beben die Geografie zerrissen und alte Ordnungen vernichteten, bewiesen die Menschen einen unerschütterlichen Pioniergeist. Sie bauten Brücken, trotzten den Elementen und erfanden völlig neue Wege, um Handel zu treiben, Gemeinschaften zu gründen und das Überleben ihrer Familien zu sichern.

## Gesellschaften und Moral

Ihre Gesellschaften reichen von streng organisierten, profitorientierten Handelsbünden über tief religiöse Künstlerdynastien bis hin zu freien, technologiebegeisterten Gemeinschaften. Auch ihr moralischer Kompass ist so vielfältig wie ihre Geografie: Während einige Gruppen die unberechenbaren Energien von Vattrak und Malanthir mit strikten Tabus belegen, nutzen andere sie pragmatisch als reine Werkzeuge oder studieren sie mit tabuloser, wissenschaftlicher Neugier.

## Rolle in Kassadras

Am Ende sind es dieser unermüdliche Tatendrang und die Fähigkeit, sich selbst nach den schwersten Schlägen immer wieder neu zu erfinden, die die Menschen zum Herzschlag und zum Motor der Zivilisation in Kassadras machen.`,

  "a89e767b-b6cf-4e68-9229-841e777493c8": `Der strahlende Zenith ist die dominierende theokratische Institution in Falghalar. Es ist keine Götterverehrung im klassischen Sinne, sondern eine phänomenologische Religion, die das physikalische Wunder des „Aufstiegs“ anbetet. Die Anhänger glauben, dass der unerreichbare, leuchtende Kern im Zentrum des Nebelmeers die Quelle aller Reinheit und Ordnung ist. Alles Wasser, das in der Region nach oben fließt, und alle schwebenden Inseln streben danach, zu diesem Kern zurückzukehren.

## Religiöse Praxis & gesellschaftliche Auswirkungen

### Die Hierarchie der Schwere

Die soziale Ordnung Falghalars ist direkt mit dem religiösen Dogma verknüpft. Menschen gelten als „lichtnah“ und bilden die Oberschicht. Tiermenschen (Katzen-, Hunde-, Bärenwesen etc.) werden als „metaphysisch schwer“ und sündhaft betrachtet. Ihre Sklaverei wird religiös legitimiert; sie müssen durch harte Arbeit (oft an den Aquadukten) ihre „Schwere“ abtragen.

### Architektur des Lichts

Die Kirchen sind aus spiegelndem weißen Marmor gebaut, um das Licht des Kerns einzufangen. Massive Aquadukte leiten das „heilige“ Wasser nach oben zu den schwebenden Agrar-Inseln.

### Der Orden der Strahlenden Faust

Ein fanatischer Paladinorden, der dem Klerikat untersteht. Sie patrouillieren die Straßen, überwachen die Sklaven und kontrollieren streng und schrecken nicht vor Gewalt zurück.`,

  "a9148c88-b68b-4730-bc2c-2d753018b06a": `Malanthir Erz ist ebenfalls eine magische Quelle, allerdings ist die Quelle dieser Magie aus der Dunkelheit und wird direkt mit der Macht von Malaghor in Verbindung gesetzt.

## Wirkung auf Anwender

Malanthir-Nutzer berichten von einer flüsternden Stimme, die ihnen Anweisungen gibt, um das maximale Potenzial zu entfachen; andere erzählten von einer extremen eisigen Kälte, die sich in einem ausbreitet, aber die Sinne schärft.

## Korruption

Der übermäßige Gebrauch von Malanthir verursacht Korruption, die Anwender an sich selbst kaum feststellen, aber deutliche physische Spuren hinterlassen — je nach Ausprägung und Stärke der Korruption.

## Verwendung

Malanthir kann wie Vattrak als Legierung genutzt werden, als Stein in Sockel gefasst sein oder sogar als Katalysator in Tränken und Mixturen verwendet werden. Diese Art der Alchemie birgt jedoch ein hohes Gefahrenpotenzial, da die Risiken sehr hoch sind. Dennoch gab es immer wieder Magier oder Alchemisten, die glaubten, diese Kräfte beherrschen zu können.

## Bedachter Einsatz

Es gibt Kulturen und Magier, die Malanthir bewusst und gezielt einsetzen — bis zu einer gewissen Grenze, um nicht der Korruption zu verfallen. Bis zu einem gewissen Grad und mit bedachtem Einsatz kann Malanthir ohne Probleme eingesetzt werden.`,

  "547e16be-32f1-4b49-a757-91670429087b": `Die Zwielichtgeborenen in Kassadras sind typische Mischwesen zwischen den Völkern und sind ein Ergebnis der katastrophalen Ereignisse auf Kassadras, als die Überlebenden zu Tausenden sich an sicheren Orten zurückzogen.

Es gab zahlreiche große Flüchtlingsorte wie beispielsweise Zalandar oder Explora, in denen viele Kulturen auf engem Raum miteinander lebten — und nicht selten kam es zu solchen Liebschaften.

## Bekannte Zwielichtgeborene

- Halbelfen
- Halbzwerg
- Halbork
- Halbling (Mischung Mensch und Tiefling)
- Halbgnom (Mischung Mensch und Gnom)
- Orkling (Mischung Ork und Tiefling)
- Tiefenzwerg (Tiefling und Zwerg)

## Vorurteile und Stellung

Diese Halbwesen sind oft mit diversen Vorurteilen geplagt und haben oft den Nachteil, zu keiner richtigen Kultur zu gehören. Zwerge bezeichnen sie deshalb oft als „Skarn-Blut“, und Elfen wenden sich häufig von ihnen ab, da sie als „unrein“ gesehen werden.

Dennoch machen sie inzwischen einen Großteil der Bevölkerung — gerade bei den Menschen — aus und profitieren zumeist von den Vorteilen beider Rassen.`,

  "5d01f624-6e1d-4a0b-babf-342c272a9573": `Der Fall von Explora gilt den meisten Historikern und Gelehrten als ein wichtiger Ausgangspunkt in der Geschichte kurz nach der Rückkehr der Magie und läutete erneut den Anfang wichtiger kommender Ereignisse ein, die später noch viel weitreichender waren.

## Die Rückkehr Kurrs

Der große Dämonenfürst Kurr, der einst als verbannt und für die Ewigkeit eingesperrt galt, zeigte sich der Welt von Kassadras, indem er die Macht der Stadt Explora nutzte, sie über Jahrzehnte korrumpierte und somit die nötige Energie anhäufte, Dutzende von Portalen zu erschaffen.

## Der Plan

Mit seiner Armee und seinen vier ausgewählten Heeresführern plante er, Explora zu erobern — und mit der Macht des mächtigen Vattrak-Kristalls, der für die Verteidigung der Stadt genutzt wurde, zielte er darauf ab, die Welt Stück für Stück an sich zu reißen.

## Die Helden

Doch das Schicksal oder ein letzter Funke der Götter erwählte ein paar tapfere Helden, die Krulls Pläne vereiteln sollten. Den Untergang der Stadt konnten sie nicht verhindern — aber dass Krull nicht in die Hände des Kristalls gelangte.`,

  "4533575d-f8cf-4fa7-8cdb-4589a1dec880": `Die Jakal gelten als gefühllos und leben vorzugsweise im Exil. Sie sind die Nomaden der eisigen Berge im Norden und trotzen selbst den schwersten Schneestürmen. Sie sind besonders agil und können sich selbst auf schwierigem Gelände elegant bewegen.

## Nachteil in der Wärme

Ihr größter Nachteil liegt darin, dass sie in warmen Gebieten schneller Erschöpfung erleiden als andere Wesen, da sie an die raue Kälte der Berge angepasst sind.

## Wahrnehmung

Sie besitzen eine besondere Art der Wahrnehmung: Warme Quellen, Lebewesen oder Objekte können sie in 60 Fuß um sie herum erspüren — außer natürlich in heißen Umgebungen.

## Stämme und Findelkinder

Die wenigen Jakal-Stämme, die es gibt, sind gut verborgen, und nur selten sind ihre Vertreter in Dörfern oder Städten anzutreffen — meistens um Handel zu treiben.

Sie sind besonders neugierig und besitzen eine geringe Scheu vor anderen. Es gibt einige Findelkinder dieser Art, die ganz normal in Städten aufwachsen und einem Beruf nachgehen.`,

  "51f1c02a-529d-4f54-9ca8-f95b77457847": `Wagen die Abenteurer, die schattigen Geheimnisse des Labyrinths der Prüfungen zu erkunden, werden sie von einem dichten Dunst empfangen, der sich aus den feuchten, erdigen Gerüchen des Dschungels erhebt.

## Eintritt und Urteil

Kaum hat man die gewaltigen Zantauren-Statuen betreten, deren glühende Augen nicht nur die Huldigung, sondern auch das Urteil über die Unwürdigen kennen, erfüllt ein leises Raunen die Luft, als ob die Pyramide selbst die Herausforderungen flüstert, die vor den Herausforderern liegen.

## Atmosphäre

Statt eindringlicher Geräusche des Dschungels hallt ein unheimliches Schweigen wider, nur unterbrochen von dem gelegentlichen Tropfen von Wasser, das aus den feuchten Wänden sickert. Die moosüberzogenen schwarzen Steine scheinen Geschichten zu murmeln und vergangene Prüfungen in das Dunkel des Labyrinths einzuflechten.

Doch gerade diese Dunkelheit scheint eines der größten Mysterien dieses Ortes zu sein.`,

  "5f1ce405-8e59-43a9-b952-b0749c75cf82": `Tiermenschen unterhalten sich häufig „sprachlos“ — es sind vielmehr Haltung und bestimmte Laute, die Position der Ohren oder wohin die Augen genau blicken.

## Sprachlaute und Muster

Es gibt jedoch eine Sprache unter ihnen, die so etwas wie Silben oder Sprachlaute beinhaltet. Außenstehende würden diese Sprache als seltsames Geknurre, Bellen oder Jauchzen abtun, doch dahinter verbirgt sich ein ausgeklügeltes Sprachmuster.

Sie verständigen sich aber auf sehr einfache Weise und halten Sätze dabei sehr kurz — das liegt daran, dass nicht jede Unterart der Tiermenschen alle Laute erzeugen kann.

## Beispiele

„Komm her!“ oder „Schaue, nach oben! Pass auf!“ sind typische Beispiele.

## Herkunft

Die Sprache wurde in der Zeit erschaffen, als Tiermenschen noch Sklaven waren und lernen mussten, sich zu verständigen, ohne dass andere Rassen es mitbekommen. Sie wird häufig auch als die geheime Sprache der Tiermenschen bezeichnet.`,

  "27379e02-477c-4b34-a2ad-0fddb3133486": `Die Elfen von Kassadras sind jene Wesen, die von der Göttin Zephyra erschaffen wurden und als erstes die Welt Kassadras betraten. Diese erste Präsenz der Elfen wird „Hochelfen“ genannt und war zur Geburt der Welt Kassadras noch recht zahlreich.

## Aufspaltung

Als sie aufbrachen, die Welt zu erkunden — durch den Einfluss anderer Götter, durch brachiale Veränderungen durch das Böse und Streitigkeiten zwischen den Elfen selbst — haben sich diese im Laufe der Zeit in verschiedene Unterarten aufgeteilt.

## Die Unterarten

- Die langlebigen **Hochelfen**, die Erstgeborenen Zephyras, existieren immer noch, sind aber deutlich weniger geworden.
- Die **Waldelfen**, die Hüter der Wälder, die sich als Wächter der Natur betrachten.
- Die prophetischen **Feyelfen**, die das Schicksal der Welt zu deuten versuchen.
- Die **Smaragdelfen**, die Magie nicht verstehen wollen, sondern einfach nur beherrschen.`,

  "6c4f7472-80b2-478d-ba0c-67687d9f8d27": `**Sunmar** ist eine primitive Sprache, die von vielen Klans und Stämmen aus dem Mittelreich von Kassadras stammt. Die Sprache wirkt sehr wild und hat viele Wiederholungen.

## Verbreitung und Dialekte

Von Elfen als primitive Sprache abgestempelt, hat sie sich doch unter den niederen Völkern stark durchgesetzt und wird seitdem auch stetig weiterentwickelt. Es gibt aber auch sehr viele Dialekte dieser Sprache, die je nach Region sich sehr unterschiedlich anhören.

## Seefahrt

Unter den Seefahrern Kassadras ist sie sehr beliebt aufgrund zahlreicher Lieder und der einfachen Ausdrucksweise. Kapitäne und Navigatoren schätzen die vielen Manöverbezeichnungen.

## Schrift und Zeichen

Eine Schrift hat sich jedoch nie wirklich durchgesetzt. Es gibt dennoch einige Zeichen und Symbole, die man als Sunmar-Bilder bezeichnet und die typisch für Markierungen sind — beispielsweise um geheime Wege zu kennzeichnen.`,

  "67609d09-fc54-436b-b6a3-1c60392ac39d": `Wenn die Spieler die Schwarze Bastion betreten, werden sie von der erdrückenden Präsenz der monumentalen, schwarzen Mauern empfangen, die wie ein finsterer Wächter die Lücke im Kraterrand versiegelt.

## Sinne und Atmosphäre

Der Geruch von feuchtem Erdreich vermischt sich mit einem süßlich-metallischen Hauch, der die Luft durchzieht und den Atem der Anwesenden schwer macht. Ein unheimliches Murmeln der Kreaturen aus den Tiefen des Kraterbeckens ist hörbar, während Schatten in der Dunkelheit lauern.

## Die Verteidiger

Hier und da blitzen die schimmernden Rüstungen der Hochelfen auf, deren angespannte Silhouetten sich gegen die bleichen Lichter des aufziehenden Sturms abzeichnen. Ein Gefühl der Bedrohung und des Unheils durchdringt das Gemüt der Spieler — und das unaufhörliche Pochen des Mysteriums um die Bastion verstärkt den Druck, dass etwas Böses in der Dunkelheit lauert.`,

  "d84f907b-4665-421b-bcd1-8e0212626366": `Wolfs- oder auch Hundewesen sind jene Tiermenschen, die nach Wölfen und typischen Hunderassen ausschauen. Sie haben einen ausgeprägten Jagd- und Rudelinstinkt und sind meistens immer in größeren Gruppen anzutreffen.

## Rudel und Leittier

Sie werden immer von einem Leittier angeführt, der über das komplette Rudel herrscht.

## Stellung unter den Völkern

Allgemein gelten sie als treu und friedfertig und haben sich seit der Allianz mit den Menschen als sehr gute Unterstützer und Helfer herausgestellt. Menschen wie auch Zwerge wissen sie als tatkräftige Unterstützer zu schätzen, und häufig findet man sie auch im Wachdienst oder als Söldner wieder.

## Lykanther

Eine extremere Form ist die Gruppe der Lykanther, die sich komplett vor der menschlichen Unterdrückung befreien wollen, um zurück zu ihren Wurzeln zu finden. Sie ziehen es vor, in der Natur in Rudeln zu leben — fernab der Zivilisation.`,

  "6aa74ec7-df49-4ab8-972c-d8ffefba807b": `Beim Betreten des Kraterbeckens von Zalandar umfängt die Spieler eine dichte, feuchte Luft, die von modrigem Pflanzenmaterial und dem fauligen Geruch von verwesenden Organismen durchzogen ist.

## Ruinen und Natur

Die überwucherten Ruinen der einst stolzen Stadt Zalandar lösen ein Gefühl der Traurigkeit und des Verfalls aus, während sich massive, überwuchernde Bäume wie schattige Wächter über die zerbrochenen Steinstrukturen neigen.

## Geräusche und Boden

Ein unheimliches Konzert aus dem Kreischen unbekannter Kreaturen und dem raschen, fast unheimlichen Rascheln von Blättern begleitet die Spieler in die tiefen, geheimnisvollen Schatten des Dschungels, wo der Boden unter ihren Füßen von schmierigen Moosen und lehmigen Überresten der Vergangenheit geprägt ist.

Hier ist die Stille oft nur ein Vorzeichen für den nächsten Schrecken, der zwischen den Ästen lauert.`,

  "49ee4c40-78dc-455c-916d-3791f8f6bb78": `Karsark ist die typische zwergische Sprache, die alle Zwerge beherrschen und auch von den meisten sofort als zwergisch erkannt wird. Ihre schroffen, abgehackten Silben betonen die laute Aussprache, was auf manche Kulturen sehr hart und rau klingt.

## Wortschatz und Betonung

Karsark ist dabei sehr umfangreich und hat viele verschiedene Wörter für häufig ein und dieselbe Sache; die Betonung legt fest, welche Bedeutung es tatsächlich hat.

**Beluím** bedeutet Freund, kann aber auch mit der richtigen Betonung Kämpfer oder Krieger heißen.

## Schrift

Die karsarkische Schrift weist viele Ecken und schnelle Linien auf, die dem Schriftenhandwerk der Zwerge geschuldet sind, die immer noch das Meiste auf Steintafeln festhalten wollen.

> Kommentar des großen Archivars Allimaster:
> „Ihr werdet kaum eine Sprache finden, die so viele Schimpfwörter enthält wie Karsark.“`,

  "359c8fca-1c60-4a6c-9fb4-74f5178cefa0": `Exilanten sind keine Kultur an sich — es ist eher die Bezeichnung von Leuten, die in einer geschützten oder abgeschotteten Umgebung aufgewachsen sind, ohne ihre wahre Herkunft zu kennen. Es gibt zahlreiche solcher Orte in Kassadras, wie beispielsweise Explora und Nihildar.

## Aufwachsen in Isolation

Die dort lebenden unterschiedlichen Rassen haben keinen Kontakt zu ihrer ursprünglichen Sippe, Clan oder Volk und wurden dementsprechend auch nicht durch diese geprägt. Sie sind in einer ganz eigenen Kultur aufgewachsen — da kann es dann auch vorkommen, dass ein Zwerg einen Elfen als besten Freund hat.

## Kontakt zur Welt

Kommen Exilanten erst einmal in Kontakt mit der kompletten Welt, befreit aus ihrer Isolation, werden sie mit den typischen Vorurteilen konfrontiert. Durch diese Herkunft haben sie die größte Auswahl an Sprachen, da hier viele Kulturen zusammenkommen.`,

  "ecd57c31-372c-4dbe-ba40-df45b0a30e8e": `Als du die Schwelle der Schmiede „Kupferamboss“ betrittst, wirst du sofort von der drückenden Hitze empfangen, die aus den vier mächtigen Schmelzöfen strömt.

## Gerüche und Geräusche

Der Geruch von glühendem Metall und geschmolzenem Kupfer vermischt sich mit dem stechenden Aroma von geschwärztem Holz und schweißnassen Zügen. Das rhythmische Hämmern von schweren Hämmern hallt durch den Raum, während die Zwerge — konzentriert und schweißtriefend — wortlos an ihren Projekten arbeiten.

## Licht und Tradition

Funken fliegen durch die Luft und künstliches Licht tanzt über die dunklen Wände, während die hungrigen Flammen im Ofen pulsieren und die dichten Schatten der Schmiede lebendig werden. Hier ist die Luft erfüllt von der Energie und Hingabe dieser Meister der Metallverarbeitung, und man kann das Gewicht der jahrhundertealten Tradition förmlich spüren.`,

  // Soft-break walls trotz vorhandener ##
  "e4accb52-b007-4311-ac3a-8d79b40e0ffc": `> Träumer zwischen den Schleiern, Seher jenseits der Zeit, Kinder des Äthers.

Die Feyelfen entstammen wie ihre Geschwister den Hochelfen, doch ihr Pfad führte nicht in die Wälder oder auf die Gipfel — sondern zwischen die Welten.

Sie sind jene Elfen, die sich früh von der greifbaren Realität abwandten, um in die Tiefen der Magie selbst zu blicken. In ihren Seelen flackert das Licht uralter Erkenntnis, ihre Gedanken wandeln auf Ebenen, die den meisten Sterblichen verborgen bleiben.

Magie ist für Feyelfen kein Werkzeug, keine Macht — sondern ein Prinzip, eine Philosophie, eine Sprache der Wirklichkeit. Sie betrachten sie wie ein Gewebe, das alles durchzieht: Vergangenheit, Gegenwart und Zukunft. Durch Meditation, Zeichenlesen und astrale Träume versuchen sie, in die tieferen Strukturen der Welt einzutauchen — nicht um sie zu beherrschen, sondern um sie zu verstehen.

## Die Kunst der Weissagung

Feyelfen sind bekannt für ihre seltene Gabe der Weissagung. Sie träumen in Symbolen, sprechen in Rätseln, und ihre Prophezeiungen gleichen manchmal Gedichten, manchmal Warnungen. Es heißt, ein wahrer Seher unter den Feyelfen könne in den flüchtigen Bewegungen des Rauchs oder im Fall eines Blattes das Echo kommender Tage erkennen.

Doch Weissagung ist für sie kein präzises Werkzeug, sondern ein Akt der Deutung. Sie lehren, dass jede mögliche Zukunft nur ein Schatten von vielen ist — und dass Weisheit darin liegt, nicht in der Vorhersehung, sondern im Verstehen der Möglichkeiten.

## Erscheinungsbild und Auftreten

Feyelfen wirken oft entrückt, als lauschten sie einer fernen Melodie, die andere nicht hören. Ihre Augen leuchten in irisierenden Farben, als spiegelten sie andere Welten wider. Hauttöne reichen von bleichem Gold bis zu blassem Violett, mit feinen Linien und Symbolen, die sich unter bestimmten Lichtverhältnissen auf ihrer Haut zeigen.

Ihre Kleidung ist elegant, fließend und von schimmernden Stoffen gefertigt — oft durchzogen mit Kristallfäden oder kleinen magischen Runen, die aufleuchten, wenn sie sprechen oder zaubern. Viele tragen Masken, Amulette oder Stirnbänder, die helfen sollen, den Geist zu fokussieren oder das sogenannte „zweite Sehen“ zu fördern.

Feyelfen sprechen selten direkt. Ihre Worte sind oft verschachtelt, symbolisch oder doppeldeutig — denn für sie ist Sprache ein Spiegel der Magie: nicht linear, sondern vielschichtig.

Die Feyelfen gelten in Kassadras als geheimnisvolle Berater, Orakel oder Wanderer zwischen den Ebenen. Wer ihre Freundschaft gewinnt, erhält nicht nur eine magiebegabte Verbündete — sondern einen Blick in die tieferen Ströme der Welt selbst.

## Das Ritual der Lebensweissagung

Wenn ein Feyelf den Übergang ins Erwachsenenalter erreicht, wird er oder sie in einer mondhellen Nacht zur Halle der Spiegelträume geführt — einem heiligen Ort tief im Inneren der feyelfischen Zuflucht. Dort vollzieht sich das uralte Ritual der Schildweissagung: Eine Prophetin oder ein Seher taucht tief in die astralen Ströme und empfängt eine Vision über den künftigen Lebensweg des jungen Feyelfen.

### Feyelfen-Daten

- Die Feyelfen erhalten einen weiteren Attributspunkt auf Weisheit.
- Feyelfen erhalten die Fähigkeit, Prophezeiungen und Visionen zu erhalten, die sie nicht steuern können. Diese Fähigkeit wird auch an Halbelfen weitergegeben. Mindestens einmal pro Tag erhält ein Feyelf eine Vision oder Eingebung.

Diese Vision wird nicht als strenger Befehl verstanden, sondern als Schlüssel zur Bestimmung — ein Hinweis auf die Rolle, die dieser Feyelf im großen Lied des Schicksals einnehmen wird.

Mit dem Ritual erhält der Feyelf eine Namensergänzung in der elfischen Sprache, die das erkannte Schicksal widerspiegelt. Von diesem Moment an trägt der Feyelf diesen Zusatz als Teil seines Namens — eine ständige Erinnerung an seine Berufung und seine Verantwortung innerhalb der Gemeinschaft.

## Beispiele elfischer Schicksalsnamen

Die Namen bestehen aus dem ursprünglichen Namen des Feyelfen, gefolgt von einem Schicksalszusatz (in Hochelfisch, oft poetisch), der seine prophezeite Rolle beschreibt:

- **Elarien Val’taen** — „Segnung der Klinge“: ein Schicksal als Kriegerin und Verteidigerin der Seher
- **Thalor En’quess** — „Stille Feder“: ein Leben als Beobachter, Spion oder geheimer Chronist
- **Sirae Nel’dorien** — „Kind der Schwelle“: eine Grenzgängerin zwischen den Welten, bestimmt für Reisen in andere Ebenen
- **Kaelir Aun’thael** — „Sturmträumer“: ein Schicksal als magischer Visionär, der Zukunft und Natur verbindet
- **Virean Sol’quanar** — „Sänger der Schatten“: ein Seher, dessen Stimme dunkle Wahrheiten enthüllt
- **Lirae Thel’vanyr** — „Hüterin des Lichts“: eine prophetische Wächterin, deren Pfad von innerem Glanz geleitet wird

Ein solcher Namenszusatz wird nicht leichtfertig vergeben. Ein Feyelf, der seinen Schicksalsnamen verletzt oder ihm nicht gerecht wird, wird nicht bestraft — doch seine Gemeinschaft begegnet ihm mit tiefer Sorge. Die Weissagung mag fehlinterpretiert worden sein, oder der Pfad ist vom wahren Weg abgekommen.`,

  "abed5869-a28b-452c-bfbf-a0c8d5afef71": `> Lenker der arkanen Kraft, Schmiede des Willens, Kettenmeister der Magie

Während die Feyelfen in der Magie ein Rätsel und einen Spiegel des Kosmos sehen, betrachten die Smaragdelfen sie mit nüchterner Strenge: Magie ist Kraft — und jede Kraft muss gelenkt werden. Keine verschwurbelte Philosophie, keine träumerische Weissagung, sondern klare, kontrollierbare Anwendung.

Smaragdelfen gelten in der Welt Kassadras als jene Elfen, die Magie nicht verstehen wollen, sondern meistern und beherrschen. Für sie ist Magie wie das Feuer — großartig, gefährlich, notwendig, aber nur dann nützlich, wenn sie in eine Form gegossen wird: in Runen, Waffen, Konstrukte.

## Vattrak-Erz und die Smaragdtechnik

Der Name Smaragdelfen stammt nicht nur von der Farbe ihrer bevorzugten Edelsteine, sondern vom Kern ihrer magischen Handwerkskunst: dem Vattrak-Erz. Dieses seltene, tief in der Erde schlummernde, schimmernde Material enthält rohe arkane Energie.

Die Smaragdelfen haben gelernt, das Vattrak-Erz mit Smaragden zu verbinden, um so Magie einzufangen, zu speichern und gezielt freizusetzen. Schwerter mit Vattrak-Smaragden können Flammen schneiden, Rüstungen können Zauber ableiten, und Runenplatten werden zu arkanen Waffen oder Barrieren.

Für die Smaragdelfen ist dies der einzig verantwortungsvolle Umgang mit Magie — alles andere gilt ihnen als fahrlässig oder gar ketzerisch.

## Der Kodex der Kontrolle

Smaragdelfen leben nach einem unausgesprochenen, aber tief verwurzelten Prinzip:

> „Wo Macht wirkt, muss Wille herrschen.“

Sie glauben, dass unkontrollierte Magie Verderben bringt — sei es durch dämonische Einflussnahme, chaotische Mutationen oder Realitätsbrüche. Deshalb schrecken sie nicht davor zurück, auch radikale Maßnahmen zu ergreifen.

### Smaragdelfen-Daten

- Die Smaragdelfen erhalten einen weiteren Attributspunkt auf Konstitution.
- Smaragdelfen haben ihre Quelle der Magie in einen Smaragdstein eingefasst. Sie können einen beliebigen Zauber (Stufe abhängig von der Stufe und Qualität des Smaragdsteins) darin speichern.

## Bewahrer der Ordnung

Ungezügelte Magiewirker, insbesondere Feyelfen-Seher oder wilde Hexer, werden mit Misstrauen, oft sogar mit Feindseligkeit betrachtet.

In ihren Städten gibt es Gesetze zur Regulierung der Magie und magische „Inspektoren“, die Verstöße verfolgen. In schweren Fällen gelten sie sogar als bereit, Magiequellen zu versiegeln oder Individuen zu „neutralisieren“, wenn sie als gefährlich gelten.

Viele betrachten sie deshalb als arrogant oder fanatisch — doch die Smaragdelfen selbst sehen sich als jene, die verhindern, dass Kassadras in arkane Anarchie stürzt.

## Erscheinungsbild und Auftreten

Smaragdelfen wirken wie lebendige Statuen aus Glas und Stahl. Ihre Kleidung ist funktional, oft von dunklem Grün oder mattem Silber, durchzogen mit smaragdgeschmückten Runenplatten, die als Kanäle für gespeicherte Zauber dienen.

Ihre Augen sind oft grün oder bernsteinfarben und strahlen eine nüchterne, durchdringende Intelligenz aus. Viele tragen Handschuhe, Gürtel oder Schulterstücke mit eingelassenen Vattrak-Smaragden — als Waffen, Werkzeuge oder Zeichen ihres Ranges.

Ihre Bewegungen sind präzise, kontrolliert, fast taktisch — wie alles an ihnen. Im Gespräch wirken sie direkt, manchmal herablassend, und dulden selten Widerspruch, wenn es um magische Fragen geht.

## Gesellschaftsstruktur

Smaragdelfen organisieren sich in Zirkel, oft mit strenger Hierarchie: Magieschmiede, Runenmeister, Kontrollwächter. Forschung ist hoch angesehen — doch nur, wenn sie in praktische, sichere Anwendungen mündet.

Die mächtigsten unter ihnen tragen Titel wie:

- **„Kettenweber“** — für jene, die besonders gefährliche Zauber sicher binden können
- **„Runenfürst“** — Anführer eines Zirkels, der über magische Projekte wacht
- **„Siegelwächter“** — Spezialisten für das Versiegeln instabiler Magiequellen oder Artefakte`,
};

async function main() {
  const ids = Object.keys(UPDATES);
  console.log(APPLY ? "APPLY" : "DRY-RUN", ids.length, "entries");
  for (const [id, text] of Object.entries(UPDATES)) {
    const heads = text.split("\n").filter((l) => /^#{2,3}\s/.test(l));
    console.log("-", id.slice(0, 8), heads.length, "headings");
  }
  if (!APPLY) return;
  for (const [id, description] of Object.entries(UPDATES)) {
    const { error } = await supabase.from("world_lore").update({ description }).eq("id", id);
    if (error) throw new Error(`${id}: ${error.message}`);
    console.log("ok", id);
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
