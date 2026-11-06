/**
 * Batch 2: weitere Gottheiten + große Rassen-Walls strukturieren.
 * Apply: node scripts/format-world-lore-batch2.mjs --apply
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
  "d4ddadb7-94e6-4040-a2b7-7b4a9bb7f37e": `Elysia wird als strahlende und anmutige Gestalt dargestellt, umgeben von einer Aura des Lichtes und der Wärme. Ihr Lächeln ist ein Symbol für Freude und ihre Augen funkeln wie Sterne am Nachthimmel.

## Wofür steht Elysia?

Sie steht für Liebe, Hoffnung und das Streben nach Glück. Ihre Kehrseite ist die Verletzlichkeit der Liebe und die Gefahr der Enttäuschung.

## Huldigung

Ihre Anhänger feiern Feste der Liebe, bei denen sie Blumenkränze binden und Gedichte vortragen, um die Schönheit und Freude des Lebens zu ehren.

## Beziehungen

Elysia hat enge Verbindungen zu Nerath, da beide den Frieden und das Wohlbefinden fördern. Es gibt Spannungen mit Pyrondas, dessen leidenschaftliche Natur manchmal die zarte Liebe stören kann.

## Kinder

### Amoria

Göttin der Romantik. Sie steht für die leidenschaftliche und romantische Liebe und inspiriert ihre Anhänger, das Herz zu öffnen und tiefere Verbindungen einzugehen.

### Fedrix

Gott des Glücks. Er verkörpert das Streben nach Freude und Zufriedenheit im Leben. Fedrix hilft allen, die kleinen Freuden des Alltags zu erkennen und zu schätzen.

### Weilin

Göttin der Familie, des Zusammenhalts und der Freundschaft.`,

  "b1f84cf9-d0c6-4ad5-a586-a98a52935731": `Lunara wird als geheimnisvolle Gestalt im Mondlicht dargestellt.

## Wofür steht Lunara?

Geheimnisse, Intuition und Schutz in der Dunkelheit; ihre Kehrseite ist die Verführung zur Illusion.

## Huldigung

Rituale unter dem Mondlicht und das Erzählen von Geschichten.

## Beziehungen

Enge Verbindung zu Zephyra, Spannungen mit Ferroth.

## Kinder

### Nyxara

Göttin der Träume (und Alpträume). Steht für Intuition und die Macht des Unterbewusstseins.

### Umbral

Gott der Schatten. Verkörpert Dunkelheit und Geheimnisse.

### Terrentus

Gott der Ängste — und ihnen Herr zu werden und zu seinem Vorteil zu nutzen.

## Symbol / Wappen

Der Mond als Sichel wird mittig im Wappen dargestellt; dahinter werden spitz zulaufende Augen angedeutet.

## Priester / Kleriker

- **Priesterbezeichnung:** Sussura
- **Kleriker:** Nachtwächterin oder Nachtklinge

## Reliquie

Das Tragen von weißen Perlenketten ist ein typisches Zeichen der Verehrung. Bei der Ausübung von Magie wird ein Dolch oder Messer mit einem weißen Griff genutzt. Die Legierung des Dolches besteht aus Vatral.`,

  "499c55b7-10f7-4a50-8d4b-e677266d37c7": `Pyrondas, der Gott des Feuers und der Leidenschaft, ist ein sehr lebendiger und lebensfroher Gott, der oft als Tänzer, der mit Feuer spielt, dargestellt wird. Seine Anhänger verehren die Kreativität und den Ehrgeiz gegenüber kreativen Tätigkeiten.

Die Khalkmari sind beispielsweise eine Rasse, welche seine Leidenschaft verehren. Wie das Feuer steht Pyrondas aber auch für das Unkontrollierbare — bei den Khalkmari häufig auch „die innere Feuerbrunst“ bezeichnet, die nichts anderes als die Wut darstellt.

## Seine Kinder

### Cindara

Göttin der Flamme. Sie steht für Inspiration und Ideen.

### Ignis

Gott des Mutes. Verkörpert Kampfgeist und Entschlossenheit.

### Opor

Gott der Wiedergeburt und des ewigen Kreislaufs.`,

  "ff5ae1e6-1aa3-4819-a0b3-9d12d61e286a": `Nerath, der Gott der Stille und Ruhe, ist ein distanzierter Gott, der die Einsamkeit vorzieht, um im Stillen sich seiner Meditation zu widmen. Er strahlt Ruhe und Beharrlichkeit aus und strebt nach dem inneren Frieden mit sich und seiner Umwelt. Für seine Anhänger ist er ein Symbol der Reinheit mit seinem inneren Geist.

## Seine Kinder

### Seren

Göttin des Friedens.

### Kalon

Gott der Meditation.

### Imagi

Göttin der Wahrnehmung und Suggestion.`,

  "68ddfc8f-adeb-4a32-a047-c4c2e2c455a0": `Zephyra ist die Göttin des Windes und wird häufig als ein himmlisches Wesen mit Flügeln gezeigt, das eine stolze silberne Rüstung trägt und mit Schwert und Schild durch die Lüfte fliegt.

In einem Kampf gegen die Urmonster soll sie laut Überlieferung ihre Flügel eingebüßt haben und wird deshalb auch oft mit ihrem Pferd Lysand gezeigt.

## Charakter

Der Wind ist auch das Symbol, welches ihren Charakter beschreiben soll: wild, ungezügelt, manchmal sehr ruhig, aber auch schnell aufbrausend und unaufhaltsam.

## Bedeutung für die Elfen

Für die Elfen ist sie das Symbol der Freiheit und der Willensstärke, da sie einst die Erste war, welche sich von der Korruption der Dunkelheit befreien konnte und den Versuchungen Malaghors widerstand.`,

  "796377d7-0a35-4060-a40e-daeffdb0a4ae": `**Fatum – Der Herr der Tausend Pfade**

Gott der Möglichkeiten, der Vielseitigkeit und des Wandels.

Fatum ist die personifizierte Dynamik von Kassadras. Er ist kein Gott der starren Prophezeiungen, sondern der Gott des „Was wäre wenn“. In der Ikonographie wird er als eine Gestalt beschrieben, die niemals stillsteht — ein Schemen, der sich in Form, Alter und Geschlecht ständig wandelt, um die unendliche Vielfalt der Existenz widerzuspiegeln.

## Aspekte und Dogma

Fatum lehrt, dass Stillstand der wahre Tod ist. Seine Anhänger preisen die Anpassungsfähigkeit und die Schönheit der Vielfalt. Doch wo Licht ist, ist auch Schatten: Die Kehrseite seines Wirkens ist die lähmende Entscheidungsangst. Wer alle Wege gleichzeitig sieht, läuft Gefahr, keinen einzigen zu beschreiten.

## Heilige Handlungen

Seine Rituale sind selten starr. Man huldigt ihm durch das Feiern von Wendepunkten (wie den Jahreszeitenwechseln) und Zeremonien, welche die rohe, wandlungsfähige Kraft der Natur ehren.

## Symbol

Ein Wappen, das eine zentrale Gestalt mit acht Armen und drei Gesichtern zeigt — ein Zeichen für die Fähigkeit, in alle Richtungen gleichzeitig zu wirken und zu blicken.

## Göttliche Beziehungen & Nachfahren

Fatum steht in einem ewigen, spannungsgeladenen Dialog mit der Ordnung der Welt:

### Varian (Sohn & Freund)

Der Gott der Wahrheit und Entscheidung. Während Fatum alle Türen öffnet, ist es Varian, der lehrt, durch eine hindurchzugehen.

### Chromus (Rivale)

Zwischen Fatum und Chromus herrscht stetige Spannung. Wo Chromus ein festgeschriebenes Schicksal vorgibt, ist es Fatum, der die Fäden lockert und neue Möglichkeiten hineinwebt.

### Zolith (Tochter)

Die Herrin der Tierwesen. Sie verkörpert Fatums Anpassungsfähigkeit in der Wildnis und die fließende Grenze zwischen den Spezies.

### Schimarr (Tochter)

Die Göttin der Unendlichkeit. Sie hütet das ewige Streben nach Erfüllung, das niemals endet.`,

  "520e7f4e-974b-4608-aae0-4acb1ec37ea7": `Terragon ist ein gewaltiger Gott, riesig wie eine Statue, und strotzt vor Kraft und Mut. Er ist der Hüter der Erde, der Wächter der Bodenschätze und wird von den Zwergen gefeiert als ihr Schöpfer und Urvater.

Er beherrscht die Handwerkskunst, Dinge zu formen und zu erschaffen — so wie er einst in Perfektion die Zwerge geformt haben soll.`,

  "99084c23-1734-4d5a-aa83-3fe4ef6398e0": `Vatrimus ist die Sonne am Himmel von Kassadras und keine Gottheit, die man direkt verehrt. Er steht für das Licht und das Gute in allem.

Der „Uralte“, der einst im Kampf gegen Malaghor sein Leben ließ, wurde wiedergeboren als riesige, lichtspendende Sonne. Dieses Licht soll alle Wesen bestärken und führen.`,

  "679c18de-e56a-4bfe-921f-55f3cb547e6a": `*Die Erstgeborenen Zephyras, Bewahrer einer sterbenden Reinheit*

Die Hochelfen waren einst zahlreich, über alle Höhen und Berge Kassadras verstreut, ihre Himmelsstädte funkelten wie Sterne über der Welt. Doch der Große Kataklysmus, der DarkFall und das Verstummen der Magie forderten unter ihnen einen verheerenden Tribut.

Heute gibt es nur noch wenige Hundert Hochelfen auf der Welt. Ihre einstigen Städte sind Ruinen oder Relikte, versunken in Schluchten oder von der Wildnis verschlungen. Ihre Blutlinien sind dünn geworden, viele Familien gelten als ausgelöscht oder verloren.

Die wenigen Überlebenden leben zurückgezogen, in versteckten Enklaven hoch in den Bergen oder auf schwebenden Inseln, abgeschirmt durch Magie und Tradition. Jeder neue Hochelf, der geboren wird, ist ein Ereignis von weltgeschichtlicher Bedeutung.

## Die drei großen Familien der Hochelfen

Trotz ihres Niedergangs existieren drei große Linien fort — alte, ehrwürdige Häuser, die das Erbe der Hochelfen bewahren und verteidigen.

### 1. Haus Vanyari — Die Hüter der Arkanen Flamme

Das Haus Vanyari gilt als älteste und weiseste Linie der Hochelfen. Ihre Mitglieder waren von jeher Magier, Gelehrte und Runenweber, die tief mit den Ursprüngen der Magie verbunden sind. Es heißt, dass ihre Ahnen selbst am Webstuhl der Weltmagie mitgewirkt haben.

**Merkmale**

- Helle Haut mit silbernem oder platinblondem Haar
- Augen in tiefem Violett oder hellem Blau
- Kleidung meist in Weiß, Silber und Lavendel, oft mit Runensymbolik

**Bekannt für**

- Die Entwicklung der ersten Magieakademien
- Das Runenlied von Tira-Vael, eine arkane Formel, die Magie in Musik übersetzt
- Ihre Forschung über das Verschwinden der Magie nach dem Kataklysmus

> „Magie ist kein Werkzeug. Sie ist Erinnerung, in Bewegung gebracht.“ — Isadora Vanjyari Jin, Mutter des Hauses Vanyari

### 2. Haus Elorithar — Die Klingen der Linie

Elorithar ist das Haus der Kriegerkaste der Hochelfen, berühmt für ihre unvergleichliche Disziplin, Kampfkunst und strategische Weitsicht. In vergangenen Zeitaltern führten sie die elfischen Legionen in die Schlachten gegen das Böse — nicht als Eroberer, sondern als Schutzwächter der Ordnung.

**Merkmale**

- Hellgoldene Hauttöne, oft mit bernsteinfarbenen oder grauen Augen
- Tragen polierte Rüstungen mit eingravierten Ahnensiegeln
- Meistern sowohl Schwert als auch Magie im Kampf

**Bekannt für**

- Die Gründung der legendären Silbergarde von Teryn’Kael
- Den Ehrenkodex „Der Schwur der Linie“, dem jeder Elorithar bis zum Tod folgt
- Ihre Ausbildungseinrichtungen, in denen Taktik und Ehrenkampf gelehrt werden

> „Ein Schwert trägt Verantwortung. Nur der Reine darf es führen.“ — Venekalt Elrothiar Litn´hoal, Gardenführer der Silbergarde

### 3. Haus Myrdael — Die Träumer des Himmels

Haus Myrdael steht für die Philosophen, Sternenbeobachter und Visionäre der Hochelfen. Es ist das mystischste unter den drei großen Häusern — viele seiner Mitglieder widmen ihr Leben der Deutung von Zeit, Raum und Schicksal.

**Merkmale**

- Zartgoldene oder perlmuttartige Haut
- Augen in leuchtendem Türkis, oft mit leichtem Glimmen
- Tragen schlichte, aber elegante Gewänder mit Symbolen der Sterne und Sphären

**Bekannt für**

- Die Sternenbibliothek von Aer’Tamar, die größte Sammlung elfischer Weissagungen
- Die Lehre des „Ewigen Pfades“, einer Philosophie über die Verbindung zwischen Seele und Kosmos
- Ihre Beteiligung am ursprünglichen Pakt mit den Feyelfen

> „Wer den Himmel versteht, fürchtet den Abgrund nicht.“`,

  "c354d7dc-0013-4e15-aa92-a7563579f672": `Die Alben sind das genaue Gegenstück zu den klassischen Mondelfen und sind einst aus ihnen hervorgegangen. Ihre gänzlich dunkle Natur hat auch einige von ihnen zu Dunkelalben werden lassen, die wiederum als komplett korrumpiert betrachtet werden können.

Die, die sich der Korruption entziehen konnten und mithilfe ihrer Willenskraft sich der Dunkelheit widersetzten, wurden zu Alben. Von Natur aus sind sie wilder und leidenschaftlicher, und viele betrachten sie einfach als die „bösen Elfen“. Dabei sind ihre Absichten nicht ganz so böse, wie man vielleicht denken mag: Sie streben nach der Perfektion, eins mit der Nacht zu werden, und sehen sich als die Beschützer des Gleichgewichts.

## Wesen und Alltag

Sie neigen mehr zu Auseinandersetzungen, und es gibt zahlreiche Vertreter von ihnen, die mitten in der Stadt leben und eher zwielichtigen Dingen nachgehen. Sie haben oft keinerlei Behaarung und das Leuchten in ihren Augen ist komplett erloschen. Magie sehen sie als Werkzeug, und den Gebrauch davon sehen sie als Schwäche.

## Erscheinung

Ihre Haut ist glatt grau/weiß und wirkt fast ledern. Ihre Körper sind gezeichnet von unzähligen Tätowierungen und Kampfspuren.

## Beziehungen zu anderen Elfen

Gegenüber Mondelfen sind sie eher feindselig, während sie sich über die „normalen“ Elfen nur lustig machen.`,

  "f0b8f442-a794-41b0-a1c7-c8b7876d9991": `Der Zwergenclan Dahrinok lebt in den tiefen Wäldern des Dahorinwalds, umgeben von der majestätischen Bergkette des Dahorinkamms. Diese Zwerge sind für ihre enge Verbindung zur Natur und ihre außergewöhnlichen Fähigkeiten in der Holzverarbeitung und im Steinbau bekannt. Sie gelten als äußerst wild und misstrauisch und werden unter den anderen Zwergen oft als „Wartlok“ oder „Schraat“ bezeichnet, was grob als „Wildling“ oder „Wildbart“ übersetzt werden kann.

## Kultur und Lebensweise

Die Dahrinok-Zwerge sind deutlich größer und breiter als ihre Artgenossen, oft mindestens einen Fuß größer, was sie imposant und furchterregend erscheinen lässt. Ihre Körper sind von Tätowierungen geschmückt, und viele von ihnen färben einzelne Bart- oder Haarsträhnen, um ihre Individualität und Verbindung zur Natur auszudrücken.

Die Dahrinok sind geschickte Handwerker, die eine Vielzahl von Produkten aus Holz und Stein herstellen. Ihre Heimat ist geprägt von uralten Bäumen und schroffen Felsen, die sie respektieren und in ihre Arbeiten einfließen lassen. Sie sind nicht nur geschätzte Baumeister, sondern auch fähige Jäger und Sammler, die die Ressourcen des Dahorinwalds nachhaltig nutzen.

## Die Bolmer

Die Bolmer sind die Dahrinok-Zwerge, die von der anderen Seite des großen Flusses Zil´bolm stammen. Unter den Menschen werden sie auch als „Flussvolk“ bezeichnet, da sie in den sumpfigen Ausläufern des Flusses leben und über den Dahorin-Sumpf herrschen. Sie haben eine deutlich dunklere Haut und tarnen sich zusätzlich mit Schlamm und Teer.`,

  "5b486cdd-f076-4429-86ca-2a89d1221845": `Zu den Katzenwesen der Tiermenschen zählen Katzen, Tiger, Löwen, Panther, Geparden, Leoparden, Luchse und katzenähnliche Kreaturen. Sie gelten als besonders agil und flink und werden durch einen ausgeprägten Instinkt geleitet, der ihre Wahrnehmung nochmals steigert.

Katzenwesen sind vorzugsweise Einzelgänger und misstrauen fremden Völkern und Rassen grundsätzlich. Wer aber einmal ihr Vertrauen gewonnen hat, wird sie aber auch so schnell nicht wieder los.

## Unterarten

### Graufelle

Eine Unterart, die sich vorzugsweise in den Städten ausgebreitet hat und unter diesen Umständen sich als Überlebenskünstler herausgestellt hat.

### Shiam

Die wilderen Vertreter, die sich vorzugsweise in Freiheit bewegen und die Natur vorziehen.

## Erscheinung und Haltung

Katzenwesen bewegen sich von Natur aus geschmeidig und elegant und haben immer einen Sinn für das Ästhetische. Sie sind ebenfalls darauf bedacht, dass ihr Fell glänzt und sauber und gepflegt aussieht.`,

  "cb8e525a-0f42-4737-a636-8e36848e5266": `Die Aurumzwerge sind Zwerge, die sich auf die Kunst des Goldes spezialisiert haben. Sie leben in prunkvollen Städten, die in den goldenen Hügeln und tiefen Minen des Königreichs Aurumheim erbaut wurden. Diese Zwerge sind nicht nur geschickte Goldschmiede und Juweliere, sondern auch Liebhaber des Luxus und der schönen Künste.

## Lebensweise

Die Aurumzwerge genießen das Leben in vollen Zügen. Sie umgeben sich mit prachtvollen Luxusgütern und schätzen die feinsten Dinge, die das Leben zu bieten hat. Ihre Liebe zur Musik ist legendär; sie singen gern und lauschen den Klängen von Trommeln und Lauten, die oft bei Festen und Feierlichkeiten erklingen. Teurer Tabak ist ein weiteres Highlight ihrer Kultur, das sie in exquisiten Pfeifen genießen.

## Haltung

Die Aurumzwerge sind stolz auf ihren Reichtum und ihre Kunstfertigkeit. Sie sind überzeugt, das Glück gepachtet zu haben, und zeigen oft eine arrogante und überhebliche Haltung gegenüber anderen Völkern und sogar anderen Zwergenclans. Ihr Selbstbewusstsein ist ebenso ausgeprägt wie ihr Sinn für Ästhetik; sie tragen vorzugsweise elegante Gewänder aus feinem Stoff und Leder, die ihren Status unterstreichen.`,

  "e205dbcd-f366-4cb4-b237-cb66ab4334bb": `Die Maschinenzwerge waren eifrige Techniker, die mithilfe von Vattrak mächtige Maschinen zum Laufen brachten. In den alten Geschichten sprach man von automatisierten Konstrukten und steuerbaren Fabriken und fliegenden Metallschiffen — alles, um dem großen Plan des Architekten zu folgen.

## Das Luftschiff Stahlbeißer

Am bekanntesten und eindrucksvollsten war das riesige Metallschiff „Stahlbeißer“, das fast schon einer fliegenden Stadt glich. Doch der größte Verwendungszweck zeigte auch die radikale Art des Einflusses auf die Umwelt. Am unteren Rumpf des Schiffes befand sich eine gigantische Mähdrechervorrichtung, die ganze Wälder in wenigen Stunden rodete.

## Rohstoffe und Reich

Das Reich der Maschinenzwerge gierte nach etlichen Rohstoffen. Metall, Holz, Stein und andere wertvolle Rohstoffe wurden verwendet, um das Reich der Maschinenzwerge unterirdisch aufzubauen — ein riesiges Netzwerk, das sich unter Kassadras erstreckte.

## Konflikte

Die Stahlbeißer ist ein monströses Luftschiff, das extrem laut und riesig durch die Wälder von Kassadras pflügte, weshalb es auch häufig zu Konflikten, vor allem mit den Waldelfen, kam. Doch die Stahlbeißer verfügte ebenso über eine stattliche Ausrüstung zur Verteidigung: Kanonen und aufladbare Vattrakspulen, die mit mächtigen Blitzen auf ihr Ziel schießen konnten.`,

  "2b1ec9e2-651b-4611-8684-aed039ca463b": `Die Ank´teth-Brut ist ein riesiger Schwarm, der im Kraterbecken von Zalandar im Erdreich dominiert. Die käferartigen Kreaturen waren einst harmlos und waren ein wichtiger Bestandteil des Ökosystems, bis die dunkle Korruption im Kraterbecken von Zalandar sie extrem veränderte. Sie wurden zu gigantischen Monstern, die das Erdreich mit ihren Tunneln regelrecht einnahmen.

## Schwarmglieder

Es gibt viele unterschiedliche Käfermonster unter ihnen — harmlose wie die Ank´teth-Arbeiter und -Drohnen und äußerst gefährliche wie die Zeloten, Krieger des Schwarms.

## Die Schwarmhexe

Seit die Schwarmhexe aus ihrer Mitte hervortrat und sich als Oberhaupt der Brut präsentiert, scheinen diese Kreaturen auch Ziele und Absichten zu verfolgen. Die Schwarmhexe scheint dabei ihr „Gehirn“ zu sein und spricht im Namen der Brut sogar für den gesamten Schwarm.

## Malanthir und die Schwarze Bastion

Sie gieren nach dem dunklen Malanthir und dessen Macht, wobei nicht klar ist, was sie wirklich vorhaben und wonach sie streben. Sie scheuen nicht vor Gewalt zurück und sind extrem anpassungsfähig. Beim Sturm auf die Schwarze Bastion haben sie die riesigen Ank´teth-Kolosse eingesetzt, die aus ihrem Hinterleib riesige Sporen schleudern konnten, um die Mauer anzugreifen.

Glücklicherweise ist die Schwarze Bastion bisher standhaft geblieben und konnte verhindern, dass die Brut das Kraterbecken von Zalandar verlassen konnte.`,
};

async function main() {
  console.log(APPLY ? "APPLY" : "DRY-RUN", Object.keys(UPDATES).length, "entries");
  if (!APPLY) {
    for (const [id, text] of Object.entries(UPDATES)) {
      const heads = text.split("\n").filter((l) => /^#{2,3}\s/.test(l));
      console.log(id, heads.join(" | ") || "(paragraphs only)");
    }
    return;
  }
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
