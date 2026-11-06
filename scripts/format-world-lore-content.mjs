/**
 * Strukturiert Lore-/NPC-Texte der World (nur Darstellung: Absätze, H2/H3, Listen).
 * Keine neuen Lore-Fakten. Dry-run: node scripts/format-world-lore-content.mjs
 * Apply:   node scripts/format-world-lore-content.mjs --apply
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
const WORLD_ID = "689a0f11-7aa3-440b-9527-c6da0a84aebb";
const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const UPDATES = {
  // Arc-Koloth (Rasse)
  "1fbdc1dc-b8e1-495b-8bad-2c4a89103cbf": `Ein Zwergenclan der schon früh an die Erdoberfläche zurückkehrte und zahlreiche Handelsabkommen mit den umliegenden Völkern einrichtete. Deswegen zählen die Arc´koloth zu den reichsten und größten Zwergenclans in Kassandras. Sie sind äußerst geschickte und talentierte Händler verschiedenster Waren. Ihre besonderen Exporte sind drei besondere Produkte:

## Brekkfell und Brekkstoffe

Die Brekkziege ist ein heiliges Tier der Zwerge in den Eisenspitzen und wird nur von diesen Zwergenfamilien gezüchtet. Da das Fell dieser Ziegenart nur sehr langsam und kurz wächst, ist der Aufwand recht hoch, daraus gewinnbringenden Stoff herzustellen, doch die Zwerge haben dies mit speziellen Gerätschaften und viel Geduld gemeistert. Der Brekkstoff wird von vielen Kulturen hochgeschätzt und gilt als sehr wertvoll und leicht verarbeitbar.

Die Brekkböcke werden zudem als Lastentiere benutzt oder sogar als Reittiere.

## Dun-Stahl

Der Dun-Stahl stammt aus der großen Zwergenschmiede unterhalb der Eisenspitze und ist eine prächtige Anlage, die von zwergischer Handwerkskunst trotzt. Der Dun-Stahl hat eine leicht grünliche Färbung durch die Härtung zwecks der Dundamar-Kristalle, die in den tiefen Höhlen unterhalb der Eisenspitzen am unterirdischen See Kondak wachsen.

Der Stahl wird bei Rüstungen und Waffen lediglich als Legierung verwendet, weil er einfach zu schwer ist. Bei Konstruktionen und größeren Gerätschaften ist die besondere Härte des Stahls unverzichtbar. Angeblich braucht der Prozess der Härtung mehrere Jahrzehnte und ist ein streng gehütetes Geheimnis der Arc´koloth-Schmiede.

## Drachenlanzen

In der Geschichte der Arc´koloth gibt es zahlreiche Überlieferungen von Kämpfen gegen große Drachen, die man bezwungen hat, weil sie die Eisenspitze einnehmen wollten. Möglich war dies nur mithilfe der legendären Drachenlanzen. Nur die Arc´koloth haben diese außergewöhnliche Waffe, welche zwei Zwerge benötigt, um sie zu führen.

Wer glaubt, dass diese besonderen Soldaten — auch Drak´koloth genannt — nur gegen Drachen effektiv sind, irrt gewaltig. Ihre besondere Technik zielt besonders auf größere Gegner, beispielsweise Trolle, Riesen oder Oger. Wer diese besondere Einheit der Arc´koloth-Zwerge im Einsatz gesehen hat, wird einen Zwerg nie wieder als schwerfällig und langsam bezeichnen.

## Die Kasten der Arc´koloth

### Kuwakai

Oder auch die Richterzwerge genannt. Im Namen der vier Hämmer — einem Zusammenschluss der Kastenanführer und oberste Instanz des gesamten Arc´koloth-Clans — bilden sie die Judikative und Exekutive zugleich. Kein anderer Zwergenclan hat so strenge Regeln und Gesetze. Diese sind im großen Buch des Feuers niedergeschrieben, das als unantastbar gilt und schon vor tausenden Jahren niedergeschrieben wurde. Aufgrund der dichten Population auf engem Raum ist dies auch notwendig, um Streit und Eskalation zu vermeiden.

Sie haben einen besonderen Sinn für Gerechtigkeit und sind Hüter von Ordnung und Ehre unter den Zwergen. Sie haben ein höheres Ansehen als ein einfacher Soldat und durch die Macht, die ihnen gegeben wurde, sind sie auch mancherorts gefürchtet. Kein Zwerg kann zu solch einer Position berufen werden, sondern wird in diese Riege hinein geboren.

### Guwatroks

Die Handwerker, Händler und Kaufleute, welche für Versorgung, Handel und Verwaltung zuständig sind. Sie sind der größte Anteil der Clans und unterteilen sich nochmals in Dutzende Zünfte — vom Kesselflicker bis zum Meisterschmied ist dort alles vertreten.

### Jok´baruk

Ab einem gewissen Alter oder mit einer bestimmten Befähigung darf ein Zwerg sich den Jok´baruk anschließen — jene Zwerge, die sich der Forschung der alten versteinerten Archive widmen. Eine uralte Bibliothek der Zwerge tief unter den Eisenspitzen. Sie sind auch jene Zwerge, die häufig in diplomatischer Mission ausgesendet werden und teilweise zu den ältesten Zwergen des Clans gehören. Zahlreiche bekannte Zwerge, die unter den anderen Völkern großes Ansehen haben, gehören zu dieser Kaste.

Die alte Bibliothek ist riesig und reicht kilometer tief in den Berg — es kommt vor, dass einige Zwerge der Jok´baruk jahrelang in den Archiven verschwinden oder gar nicht mehr auftauchen.

### Harakorik

Die Harakorik sind die geschulten Zwergenkrieger, die mit ihren gefürchteten Zwergenäxten besondere Kampftechniken beherrschen. Zu ihnen gehören auch die Drak´koloth, die als Elitekrieger ein hohes Ansehen genießen. Jeder Zwerg kann sich in den Dienst der Kaste begeben und ist dann lebenslang dieser Aufgabe verpflichtet.`,

  // Chromus
  "127a5249-0e83-41b8-854e-d3be0622967e": `Chromus, der Gott der Zeit und des unausweichlichen Schicksals, könnte mitunter einer der mächtigsten Götter des Pantheons sein. Er wird häufig in der Gestalt eines alten weisen Mannes gezeigt, dessen Blick in die Sterne gerichtet ist.

Mit der Macht der Zeit und dem Blick auf alle Schicksale hätte er die Macht, alles zu verändern, doch er betont immer, dass er nur beobachtet und „korrigiert“. Er betont immer wieder, dass es nicht seine Aufgabe ist, „Schicksale“ zu schmieden. Er sieht sich stets als neutral und würde nie Partei ergreifen — selbst als er mit seiner Schwester gegen ein Urmonster kämpfte, das ihr die Flügel ausriss, schritt er nicht ein.

## Seine Kinder

### Chrona

Göttin der verlorenen Zeit. Sie steht für den stetigen Fluss und für die Bedeutung des Moments der Entscheidung.

### Fundrah

Gott der Vergänglichkeit und des Todes.

### Imperus

Gott der Kontrolle, der Regeln und der Disziplin.`,

  // Aurenfurt
  "d0464d29-4c2d-4c94-a1ab-2d8c069674b3": `Das Kaiserreich Aurelis ist die Heimat der Menschen, genau genommen der Mittelländer, die hier ihren Ursprung haben. Durch den großen schwarzen Kataklysmus wurde das Land massiv verändert: Flora und Fauna änderten sich und ganze Landstriche verschwanden in tiefen Schluchten oder befanden sich auf großen schwebenden Plattformen.

## Hauptstadt und Kaiser

Die Stadt Aurenfurt ist die Hauptstadt und der Sitz des Kaisers Corellius Kadast dem II., der sich damit rühmt, die zersplitterten Völker wieder an einem Tisch zu bringen. Die Stadt selbst ist ein Zeichen und Monument der Hoffnung und befindet sich auf einem riesigen Plateau.

Die Stadt selbst befindet sich auf einer fliegenden Landmasse, die an vier großen Kettengliedern an Ort und Stelle gehalten wird und, wenn Gefahr droht, nach oben schwebt.

## Aufbau und Zuflucht

Die Stadt selbst ist kreisrund und besteht aus fünf Vierteln. Durch aktuelle Kriege und der Bedrohung durch das dunkle Land Xarvar sind über die letzten zehn Jahre Hunderte von Flüchtlingen in die Stadt geströmt, darunter auch Zwerge und Elfen. Inzwischen gilt Aurenfurt als eine sichere Zufluchtsstadt, aber auch als ein Siedekessel, wo viele unterschiedliche Kulturen aufeinanderprallen.

Glücklicherweise haben sie einen aktuellen Feind: Das Imperium von Xarvathar, das aktuell das Land Xarvar besetzt.

Der Kaiser muss das Kunststück gelingen, alle Völker zu einigen und gleichzeitig das Imperium zu stoppen — keine leichte Aufgabe, denn der bereits andauernde Krieg verschlang Unmengen an Ressourcen.`,

  // Lichtelfen – Struktur behalten, Absätze/Tippfehler leicht glätten ohne Faktenänderung
  "ad8331c6-d906-4b28-be0a-82ecd199609c": `*Stimmen des Lichts, Klingen der Tugend, Kinder der Göttin. Die Lichtelfen sind das leuchtende Erbe der alten Hochelfen — ein stolzes, diszipliniertes Volk, das seinen Platz in der Welt nicht durch Worte, sondern durch Taten behauptet.*

Während andere Elfen in die Tiefen der Magie oder in die Weiten der Natur eintauchten, entschieden sich die Lichtelfen, das Licht selbst zu verkörpern: Reinheit, Klarheit, Gerechtigkeit, aber auch Macht und Verantwortung. Sie gelten als die fähigsten Kämpfer unter den Elfen, geschult in der Kunst des Schwertes, der Taktik und des Glaubens. In ihrer Gesellschaft sind Ehre, Pflichtbewusstsein und Selbstdisziplin zentrale Tugenden — nicht aus blindem Gehorsam, sondern aus tiefer Überzeugung, dass Ordnung, Schutz und Aufrichtigkeit die Grundpfeiler einer freien Welt sind.

## Der Kreuzzug gegen das Böse

Zentral in der Philosophie der Lichtelfen ist die Überzeugung, dass das Böse in der Welt nicht geduldet werden darf. Für sie ist es keine abstrakte Idee, sondern eine reale, verderbende Macht — verkörpert in Dämonen, Flüchen, finsterer Magie und jenen Wesen, die sich absichtlich der Dunkelheit verschrieben haben. Daher verfolgen Lichtelfen das klare Ziel, das Böse aus Kassadras zu tilgen — nicht durch reine Vernichtung, sondern durch heilige Disziplin, rituelle Bannung und kontrollierte Verwahrung.

Besonders gefürchtet ist unter ihnen das Malantir-Erz — eine schwarze, lebendige Substanz, die als Quelle dunkler, korrumpierender Magie gilt. Es kann nicht zerstört werden, nur versiegelt. Lichtelfen suchen gezielt nach Vorkommen dieses Erzes, konfiszieren es und verwahren es in geweihten, abgeschirmten Kammern unter den heiligsten Bastionen ihrer Städte. Ebenso sammeln und sichern sie dämonische Relikte, verfluchte Waffen, Artefakte der Schattenreiche und alle Gegenstände, die von dunklen Völkern — etwa Dämoneiden, Schattenvölkern oder korrumpierten Kultisten — geschaffen wurden. Nicht aus Neugier, sondern aus Verantwortung, um deren Missbrauch zu verhindern.

> „Was nicht zerstört werden kann, muss gebunden werden. Was gebunden ist, darf nie vergessen werden.“ — Spruch der Lichtarchivare

## Der Orden von Zephyra

Der Orden von Zephyra ist der leuchtende und zugleich gefürchtete Arm dieser Überzeugung. Bestehend ausschließlich aus Paladinen, geweiht im Namen der Göttin Zephyra, ziehen sie als heilige Richter und Streiter durch Kassadras. Sie sind es, die gegen dunkle Kulte marschieren, in dämonenverseuchte Ruinen hinabsteigen und mit eiserner Entschlossenheit jene zur Strecke bringen, die die Welt mit Finsternis vergiften wollen.

Ihre Hallen bergen nicht nur Gebete, sondern versiegelte Reliquienkammern — verborgene Krypten, in denen sie finstere Artefakte unter ewigem Bann lagern. Nur wenige außerhalb des Ordens kennen die wahren Ausmaße dieser Sammlung, und das Wissen um ihre sichere Verwahrung wird als heiliger Eid gehütet.

## Erscheinungsbild und Auftreten

Lichtelfen wirken wie aus einer alten Sage geschnitten: hochgewachsen, von edler Haltung, mit hellen Haaren, goldener oder alabasterfarbener Haut und leuchtenden Augen — oft in hellem Gold, Blau oder Weiß. Ihre Bewegungen sind ruhig, kontrolliert, aber jederzeit bereit zur Aktion.

Kleidung und Rüstung sind makellos gepflegt. Selbst einfache Lichtelfen tragen ihre Tuniken mit Stolz, verziert mit Sonnen-, Flammen- oder Schwertsymbolik. Im Kampf glänzen sie wie lebendige Statuen aus Licht und Stahl. Im Gespräch sind sie direkt, höflich, aber fordernd — sie erwarten Klarheit, Ehrlichkeit und Respekt, denn sie geben diese auch.

## Gesellschaft und Tugenden

Lichtelfen leben in strukturierten Gemeinschaften, oft in hellen, steinernen Städten oder Festungen auf Hochplateaus, wo das Sonnenlicht frei fließen kann. Die Tugenden des Lichts sind in allen Bereichen ihres Lebens verankert: in der Ausbildung, der Politik, der Kunst. Sie verachten moralische Gleichgültigkeit, Korruption, Grauzonen. Für sie ist der Pfad klar: Licht oder Dunkelheit, Wahrheit oder Lüge, Pflicht oder Flucht.

Deshalb sehen sie:

- **Feyelfen** als zu unklar und relativistisch
- **Smaragdelfen** als gefährlich machtbesessen
- **Waldelfen** als ehrenhaft, aber in ihrer Wildheit schwer zu lenken
- **Hochelfen** als weise, aber oft zu passiv

Die Lichtelfen sind mehr als Krieger — sie sind Hüter des Gleichgewichts, die glauben, dass Freiheit nur dort existieren kann, wo das Böse erkannt, benannt und gebunden wird. Und wenn nötig, wird es ausgelöscht.`,

  // Khalkmari Kultur (User-URL-Beispiel)
  "027cc798-7f6f-43b2-9a13-f7f9f9e92044": `Die Khalkmari sind eine Rasse von hünenhaften, humanoiden Kriegern, die in den extremsten und unbarmherzigsten Regionen der Welt thronen. Nach außen hin wirken sie oft primitiv und wild, doch hinter ihrer rauen Fassade verbirgt sich eine Kultur, die von tiefem Stolz, uralten Traditionen und einer unbändigen spirituellen Leidenschaft geprägt ist. Sie definieren sich über den Konflikt; für einen Khalkmari ist der ehrenvolle Kampf mit anderen Stämmen kein Akt der Zerstörung, sondern die höchste Form der spirituellen Hingabe.

## Physische Merkmale & Kultur

### Statur und Pracht

Mit einer Körpergröße von bis zu 2,20 Metern und einer massiven, muskelbepackten Statur flößen sie jedem Betrachter Respekt ein. Ihr langes Haar wird als Pracht zur Schau gestellt und wie eine wilde Mähne getragen, während die Bärte kunstvoll geflochten und geschmückt sind.

### Lebendige Geschichte

Die Haut eines jeden Khalkmari ist von Tätowierungen überzogen. Diese sind kein bloßer Schmuck, sondern ein visuelles Tagebuch, das die Geschichte ihrer glorreichsten Kämpfe, Siege und Konfrontationen erzählt.

### Natürliche Rüstung

Markantes Erkennungsmerkmal sind die stark ausgeprägten Hautknochenplatten, besonders auf der Stirn und an den Gliedmaßen, die ihren Körper wie eine biologische Panzerung verstärken.

### Der Kult des Pyrondas

Sie verehren den Gott Pyrondas, die Gottheit für Mut, Kraft und Leidenschaft. Ihre Gottesdienste sind laut, wild und ekstatisch. Die Khalkmari zelebrieren ihren Glauben durch laute Gesänge und wilde, rhythmische Tänze um gigantische Feuer, bei denen das Brüllen der Krieger die Nacht erschüttert.

## Die drei Völker

Es gibt drei bekannte Khalkmari-Völker, die sich je nach Umfeld gebildet haben.

### Eiskhalkmari

Die Eiskhalkmari sind großgewachsene Eisriesen mit bläulicher Haut. Sie tragen keine stolzen Haartrachten wie ihre Verwandten, sondern tragen Glatzen, die mit Knochenwulsten verstärkt sind. Ihr Kiefer und das Gesicht im Allgemeinen sind markanter und breiter. Sie wirken von allen Khalkmari deutlich robuster und haben eine kantigere Statur.

### Dschungelkhalkmari

Die Dschungelkhalkmari wirken deutlich schmächtiger und agiler und tragen fast schon mähnenartige Haartrachten. Sie sind ebenfalls enorm kräftig, haben aber eine natürliche Agilität, damit sie besser im Dschungel zurechtkommen. Ihre bräunliche und leicht grünlich schimmernde Haut ist die perfekte Tarnung im dichten Dickicht.

### Aschenriesen

Die Aschenriesen gehören ebenfalls zu den Khalkmari und sind aufgrund ihrer Wildheit und Aggressivität besonders bekannt. Im wilden Umland des Gluttals, wo heiße Quellen und Magmaflüsse den Alltag prägen, haben sie eine besonders robuste Konstitution entwickelt.`,
};

const NPC_UPDATES = {
  "43ceede2-211f-8ee9-7cc8-5e2deb41e173": `Artheus Flammguard der Zweite ist der Kaiser des Reiches Aurelius und residiert mit seiner Familie im Palast der großen Stadt Aurenfurt. Er versucht in diesen schweren Zeiten ein gerechter Herrscher zu sein und hat alle Mühen, die verschiedenen Anführer der anderen Völker zu besänftigen.

Viele verlangen ein strengeres Vorgehen und stärkere Mobilmachung an die Front, doch Artheus besitzt eine weise Weitsicht, ohne seine Gedanken und Taktiken groß zu teilen. Er gründete einst den Pakt der Reiche und dann den „Eisernen Verbund“, in dem alle wichtigen Anführer der verschiedenen Gruppierungen und Völker zusammenkommen — sein Vertrauen in dieser Zusammenkunft beginnt aber immer stärker zu schwanken.

Die Menschen betrachten ihn als einen großen Führer, dessen Entscheidungen und Macht dafür gesorgt haben, dass Aurenfurt noch in diesen schweren Zeiten nicht in Chaos untergeht und auseinanderbricht.

## Familie

### Edward Flammguard

Sein ältester Sohn und direkter Nachfolger, der derzeit seine Ausbildung zum Gardisten vollzieht.

### Garrik Flammguard

Sein zweiter Sohn, ein eifriger Gelehrter, der sich der Magie verschrieben hat.

### Aurill Flammguard

Seine einzige Tochter — eine junge Schwester von Elysia — widmet sich der Kathedrale zu Elysia zusammen mit ihrer Mutter.

### Karolyn Flammguard

Die Ehefrau von Artheus stammt ursprünglich aus dem Reich der Westwinder. Sie ist ein Oberhaupt der Kirche von Elysia und widmet sich zusammen mit ihrer Tochter religiösen Anlässen. Für ihren Gatten ist sie eine wichtige moralische Stütze, da sie weitaus mehr Empathie besitzt als ihr Mann.`,
};

async function applyLore(id, description) {
  const { error } = await supabase.from("world_lore").update({ description }).eq("id", id);
  if (error) throw new Error(`lore ${id}: ${error.message}`);
}

async function applyNpc(id, description) {
  const { error } = await supabase.from("npcs").update({ description }).eq("id", id);
  if (error) throw new Error(`npc ${id}: ${error.message}`);
}

async function main() {
  console.log(APPLY ? "APPLY mode" : "DRY-RUN mode (pass --apply to write)");
  console.log(`Lore updates: ${Object.keys(UPDATES).length}`);
  console.log(`NPC updates: ${Object.keys(NPC_UPDATES).length}`);

  if (!APPLY) {
    for (const [id, text] of Object.entries(UPDATES)) {
      console.log(`- lore ${id}: ${text.split("\n").filter((l) => l.startsWith("##")).join(" | ") || "(no ##)"} (${text.length} chars)`);
    }
    for (const [id, text] of Object.entries(NPC_UPDATES)) {
      console.log(`- npc ${id}: ${text.split("\n").filter((l) => l.startsWith("##")).join(" | ") || "(no ##)"} (${text.length} chars)`);
    }
    return;
  }

  for (const [id, description] of Object.entries(UPDATES)) {
    await applyLore(id, description);
    console.log("updated lore", id);
  }
  for (const [id, description] of Object.entries(NPC_UPDATES)) {
    await applyNpc(id, description);
    console.log("updated npc", id);
  }
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
