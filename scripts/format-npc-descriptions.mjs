/**
 * NPC-Beschreibungen World 689a0f11… — Absätze + ##, keine neuen Fakten.
 * Apply: node scripts/format-npc-descriptions.mjs --apply
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
  "540d121c-178e-40f1-8c74-2c9af4bf47e8": `Ein mystischer Hauch umgibt Therondrus Ferdinald Lippbrickle, der wie aus dem Nichts immer wieder aufzutauchen scheint. Sobald der Wind die schweren Stoffe seiner Umhänge erfasst, scheinen Geheimnisse auf seinen Schultern zu ruhen (oder zu lasten?). Seine Stimme ist zugleich beruhigend und beunruhigend, als würde er Geschichten aus einer anderen Welt erzählen, die tief in den Schatten von Kassadras verwurzelt sind.

## Wirkung auf andere

Viele, die mit ihm sprechen, verspüren ein seltsames Verlangen, seine Waren zu erwerben, auch wenn sie fürchten, dass der Preis mehr ist, als sie bereit sind zu zahlen. Es ist unklar, welche Absichten er verfolgt und welche Ziele er selbst für sich hofft zu erreichen… Was er genau ist, so geben die Erzählungen von Begegnungen recht unterschiedliche Beschreibungen. Mal ist er ein alter kauziger Mann, mal ein äußerst fröhlich verträumter alter Zwergenschmied … oder sogar ein Elf, der schlechte Witze erzählt.

## Handel und Preise

Aber alle Erzählungen beschreiben ihn als friedfertig und gutmütig. Er scheint keinerlei zwielichtigen Absichten zu hegen oder verlangt allzu „hohe“ Preise. Oft müssen diese gar nicht in Münzen aufgewogen werden, sondern er verlangt eine Gegenleistung in Form eines Versprechens, das man einhalten soll, oder man soll ihm eine „wertvolle“ Information besorgen.

Es gibt aber auch ganz normale Waren in seinem Sortiment, die man preislich erwerben kann.

## Einschätzung

Es ist eindeutig, dass er eine recht merkwürdige Figur zu sein scheint, die viele Geheimnisse hat und außerdem recht mächtig zu sein scheint. Man sollte seine Begegnung eher als einen positiven Wink des Schicksals betrachten, als ihm etwas böswilliges zu unterstellen.`,

  "58220573-5190-cdf9-265e-48ad986008e0": `Meister Scartolesconi stammt aus dem fernen Westen und ist ein typischer „Westwinder“. Sein schwarzes Haar ist streng nach hinten gekämmt, seitlich ein paar ergraute Strähnen. Er wirkt schlank und schmächtig, doch sein Name ist in ganz Aurenfurt bekannt als begnadeter Schwertkämpfer, der den Degen perfekt beherrscht. Er bewegt sich elegant wie ein Tänzer und fröhnt dem Leben in all seinen Zügen.

## Rolle

Er leitet die Schwertschule und bildet neben den Stadtwachen auch die Gardisten des Palastes aus. Er ist ein äußerst lebensfroher und freundlicher Mensch, der es aber versteht, seine Gefühle hinter einem guten „Pokerface“ zu verstecken.

## Lage im Kaiserreich

Die aktuelle Lage im Kaiserreich wirkt verzweifelt: Er kommt kaum mit der Ausbildung der Soldaten nach, schon müssen sie an die Front oder die Stadtwachen verstärken. Er zieht es in jeder Lage vor, bequeme und elegante Kleidung zu tragen; eine Rüstung oder irgendein Schutz am Leib würde ihn nur einschränken.

Er ist ebenfalls Berater und Sergeant der Stadtwachen, bleibt aber ausschließlich in der Schwertschule.`,

  "1b760464-b202-4704-b060-ba12e9d6f28e": `In den Schatten der düsteren Gänge der Stadt, wo das Licht der Sonne kaum jemals Zutritt hat, wandelt Corvan Halmar mit einer Aura der unerschütterlichen Autorität.

## Auftreten

Sein Blick ist durchdringend und kalt; durch seine strengen Züge scheint er die Gesetze des Reiches in Fleisch und Blut fortzuführen. Jedes seiner Schritte hallt in der Stille wider, während er unbeirrbar seinen Pflichten nachgeht. Die Menschen weichen ihm aus, wenn sie seinen Weg kreuzen, gefangen zwischen respektvoller Furcht und stiller Ablehnung.

## Überzeugung

Corvan sieht sich selbst als den Wächter der Ordnung und ist bereit, für diese mit aller Macht zu kämpfen. Magie ist ihm zwar ein fremdes Werkzeug, doch das beherrscht er meisterhaft, um die Wahrheit in den Wirren der Lügen zu ergründen. Während er durch die Gassen zieht, murmelt er leise Gesänge alter Runen, deren Bedeutung schon längst von den meisten vergessen wurde.

Seine Rhetorik ist von einem fanatischen Glauben an Gesetz und Ordnung geprägt — eine Gefahr, die in jedem Persönlichen, das nicht seinem strikten Weltbild entspricht, lauert.`,

  "0fefd70b-f85c-40b9-9dbc-12b8ccfbcd73": `In der Dunkelheit der unterirdischen Hallen erhellt das sanfte Glühen magischer Kristalle die finsteren Gänge, in denen Galvit Gassk sein Unwesen treibt.

## Rolle

Der Hauptmann der Tiefenzwerge des Südens strahlt eine unerschütterliche Autorität aus, die selbst die kühnsten Bergbewohner in Ehrfurcht versetzt. Mit seinen scharfen, tiefgelben Augen beobachtet er jede Regung, als wäre er die unbarmherzige Klinge des Gesetzes, die selbst die kleinsten Verstöße nicht duldet.

## Erscheinung und Werte

Seine dunkle, schuppige Haut und die majestätischen Hörner verleihen ihm ein furchterregendes Erscheinungsbild, das in den Schatten der Gänge ihre eigenen Geschichten flüstert. Aber unter seiner strengen Fassade steckt ein tiefes Vertrauen in die Werte seiner Rasse, die sich im hohen Ehrenkodex manifestieren, dem er bis zu seinem letzten Atemzug treu bleibt.

Angesichts der magischen Katastrophe, die ihre Heimat bedroht, ist Galvit nicht nur Krieger, sondern auch ein unerschütterlicher Wachposten, der den Tempel seines Gottes Pyrondas mit aller Macht verteidigt.`,

  "39ec0721-c5c0-4696-830e-7f192da98b1e": `Inmitten der düsteren Schatten der alten Ruinen, die einst von der edlen Kultur der Hochelfen erleuchtet wurden, steht Aelerion der Vergessene.

## Präsenz

Seine Präsenz ist ein Echo vergangener Zeiten, ein melancholisches Relikt in einer Welt, die die Magie und das Wissen seiner Vorfahren fast vollständig vergessen hat. Verhüllt in ein Gewand aus abgedunkeltem Filz, der mit grünen und goldenen Fäden á la Natur bestickt ist, weht der Wind um seinen verknöcherten Körper und trägt den leisen Klang von verwehten Blättern mit sich.

## Wächter und Trauernder

Er ist sowohl Wächter als auch Trauernder — jeder Schritt, den er macht, scheint die schweren Lasten der Erinnerungen an die untergegangene Kultur der Hochelfen mit sich zu tragen, während sein einst strahlendes Antlitz in der Dunkelheit der Ruine verblasst ist. Mit einem scharfen Blick, der die vergessenen Geheimnisse der Welt einfangen kann, bewacht er diesen Ort, als hinge das Schicksal der letzten Sprünge Vergangenheit an seiner Schuld.`,

  "b8493572-927a-44e0-be75-cf9ec4f3d351": `In den weiten Gängen von Greifenberg erhebt sich Melldrahar Kastellus Fremir, ein Smaragdelf, wie ein Schatten der Vergangenheit.

## Erscheinung und Rolle

Sein Blick ist kalt und durchdringend, als könnte er die schwärzesten Geheimnisse der Seele ergründen. Mit der disziplinierten Eleganz eines Kriegers und der Schärfe eines Meistermagiers bewacht er die magischen Ressourcen seines Volkes, die für Greifenberg ein wichtiges Element zur Verteidigung darstellen.

## Pflicht

Die uralten Lehren der Smaragdelfen scheinen in seinem Wesen zu pulsieren, während eine stille Entschlossenheit ihn antreibt, Greifenberg vor dem drohenden Unheil durch das Imperium von Xarvathar zu schützen. Für ihn ist Pflicht keine Bürde, sondern ein Sakrament, dem er mit unerschütterlicher Loyalität dient.

Wenn er spricht, erklingen seine Worte wie das Rascheln von Blättern im Wind, und die anderen Elfen lauschen mit Ehrfurcht, während vor den Mauern das Imperium seine nächsten Schritte plant.`,

  "0d4d3521-32b6-5211-a0b7-d998e5b4b8bb": `Madame Rhessa ist die Leiterin der roten Laterne und ist berühmt für ihre Gastfreundschaft, sofern der Goldbeutel des Besuchers prall gefüllt ist. Sie ist äußerst schlau und vorsichtig und weiß ihre spitze Zunge zu hüten. Sie ist sehr redegewandt und eine äußerst gute Sängerin, die weiß, wie sie ihre Stammkundschaft um den kleinen Finger wickelt.

## Charakter

Auch wenn sie ein zwielichtiger Charakter ist, ist sie sehr einfühlsam und sehr mütterlich gegenüber ihren „Mädchen“.

## Netzwerk

Sie hat ein breites Netzwerk gestrickt, das über die Unterstadt bis in den Adelsviertel reicht. Einige behaupten sogar, dass sie viele brisante Informationen besitzt, die so manchen Adeligen zum Verhängnis werden könnten. Im Untergrund als auch auf der offenen Straße wird ihr Name geschätzt, aber auch gefürchtet, da ihre Ziele nie ganz eindeutig sind.

## Haltung zu Malanthir

Gegenüber dem Malanthir-Schmuggel hat sie eher eine negative Meinung und schätzt eher die Ordnung und Ruhe.`,

  "fec29a0e-9380-4ca0-bd10-a5e575f6315c": `Der Wind trägt den scharfen Klang von Metall und das Flüstern der Schatten, während Jafar Tel-Khalim, ein edel geborener Greifenreiter der Gilde Khasdarius, mit aufrechtem Gang durch die düsteren Gassen von Kassadras schreitet.

## Erscheinung

Sein greifengraues Cape fliegt leicht im Wind, und die glühenden Augen seines mächtigen Greifen Autrius blitzen über ihn hinweg, als ob sie die dunklen Secrets der Nacht durchdringen wollten.

## Charakter

Jafar strahlt eine Aura des Mutes und der Entschlossenheit aus, die selbst den kühnsten Abenteurer inspiriert, während seine Hände behutsam die Hülle seines Schwertes berühren — ein Symbol der Ehre und des Zorns über die Bedrohungen, die das Imperium von Xarvathar ausstrahlt. Seine Stimme, rau und eindringlich, verlangt Gehör, und in seinen Worten gleicht ein feuriger Funke der Hingabe, was ihn zu einem gefürchteten Gegner und treuen Freund gleichermaßen macht.`,

  "ba4687e6-5fa3-44b6-8515-a6f30de6e108": `In der frostigen Luft der Garnison, wo das Licht der fernen Sterne flach und blass wirkt, steht Hoch Vektor Aris Thorne wie ein fester Fels in der Brandung.

## Präsenz

Seine bloße Anwesenheit zieht die Blicke an, während Gespräche verstummen und Schaudern durch die Reihen seiner Untergebenen läuft. Mit eisblauen Augen, die wie schneebedeckte Berggipfel wirken, durchdringt er die Herzen der Menschen und benennt ihre Schwächen, makellos geschützt durch eine Rüstung, die sowohl Funktionalität als auch einen Hauch von Eleganz ausstrahlt.

## Innerer Konflikt

Jedes Wort, das er spricht, ist wie ein frostiger Wind, der den Willen erdrückt und den Glauben an seine Unfehlbarkeit festigt. Doch hinter der Fassade des gefürchteten Anführers birgt sich ein Mann, der in einem inneren Kampf gefangen ist — ein erbittertes Ringen zwischen den Erwartungen seiner Position und dem dunklen Erbe seiner Herkunft.

Falghalar`,

  "6d305c7c-8628-4101-a6cc-42aba736b0f6": `Vor den Toren der Stadt steht Ser Garrick Vael, ein Paladin, dessen eiserner Wille und unerschütterlicher Blick die Passanten in Ehrfurcht erstarren lässt.

## Ort und Aufgabe

Die Schatten der Vattrak-Vorkommen verleihen diesem Ort eine düstere Aura, und die ehrfurchtgebietende Präsenz des gefallenen Kämpfers erinnert die Bürger an die bedrohlichen Gefahren, die stets in der Dunkelheit lauern. Garrick, von der Last der Verantwortung gezeichnet, untersucht nachdenklich die Horizontlinie, während er in stillen Momenten über das Schicksal der Stadt sinniert.

## Vergangenheit und Sorge

In seinen Augen funkeln die Erinnerungen an vergangene Schlachten und beschworene Schwüre, während die Klinge an seiner Seite jede zwei Jahre aus dem Blut seiner Feinde geschmiedet werden könnte. Doch tief in seinem Herzen nistet die Sorge, dass die Schatten der Vergangenheit nicht nur am Tor, sondern auch in den Hallen des Rates wachsen.`,

  "78db793b-1d1b-5c95-a126-7f483148f055": `Torvald ist ein pflichtbewusster Aufseher des Nordtores, das überwiegend vom Tempelbezirk und dem Adelsviertel genutzt wird. Entsprechend genießt er es, sich vor allem in den Kreisen des Adels zu bewegen, und lässt sich für das Öffnen der Tore gut bezahlen. Dabei betont er selbst, dass er niemals illegale Aktivitäten damit Tür und Tor öffnen würde. Er will, dass sein Tor „sauber“ bleibt und ein geschätztes Ansehen besitzt.

## Männer und Haltung

Seine Männer sind ihm gegenüber loyal und schätzen sein taktisches und kluges Vorgehen. Dennoch ist er sehr voreingenommen, was die Bürger der Unterstadt betrifft. Sie sind ein „Problem“, das in der Stadt keimt, und die endlosen Flüchtlinge verschlimmern dieses Problem zunehmend.

## Glaube

Als frommer Gläubiger von Elysia erwartet er die gleiche Hingabe auch von seinen Soldaten. Entsprechend hat er auch etwas gegen Gläubige, die Chromus verehren.`,

  "ab4cf5c8-8b64-4a98-8e08-21cb8a3b939c": `Tief im Schatten der Enklave wartet Lirya Doven, umgeben von flüsternden Stimmen und dem schweren Geruch von Kräutern.

## Last der Verantwortung

Ihre Hände, oft der Lebensquelle anderer, zittern leicht, während sie in Gedanken versunken die Geschicke ihrer Stadt überdenkt. Nebel umhüllt die Gassen, und das Licht von Kerzen kämpft gegen die Dunkelheit. Mit sanften, doch besorgten Augen beobachtet sie die Menschen um sich herum, gefangen zwischen dem Bruch der Erwartungen und dem verzweifelten Wunsch, das Richtige zu tun.

## Zweifel

In ihrer Brust trägt sie die Last der Geheimnisse und den Schimmer des Zweifels — eine blendende Mischung aus Mitleid und der Furcht vor der Wahrheit. Sie weiß, dass die Enklave nicht mehr das ist, was sie einmal war, und der Gedanke, die einst heilige Aufgabe zu hinterfragen, fürchtet sie mehr als den Tausch des Lebens mit den dunklen Mächten der Welt.`,

  "8b3bad78-d327-4193-9f1a-6f56445acf41": `In den verfallenen Ruinen eines einst prächtigen Tempels, umgeben von schwärzlichem, krabbelndem Getier, wirkt die Schwarmhexe Elyndra Vanyelion wie ein Schatten der Vergangenheit.

## Präsenz

Ihre Stimme klingt wie das Flüstern des Windes, während sie zwischen den verwitterten Steinbrocken impliziert, dass Magie niemals ganz verschwindet, sondern sich nur verwandelt. Der Raum um sie ist erfüllt von einem süßlichen, erdigen Geruch, während die glühenden Augen ihrer Insektenkreaturen sie bewachen.

## Wirkung

Ihre Ausstrahlung ist sowohl verstörend als auch faszinierend, und einen Moment lang könnte man meinen, dass in der Dunkelheit der Ruinen etwas Altes und Mächtiges auf einen wartet. Jene, die es wagen, mit ihr zu sprechen, spüren das kriechende Unbehagen in ihren Eingeweiden, als die Luft von ihren Worten und dem drohenden Flüstern der Insekten durchdrungen ist.`,

  "77f35c84-cbc6-4a71-9f36-1af751dd6ea9": `Die Werkstatt von Thaldrim Fasshof der Dritte liegt tief in den gewaltigen Mauern von Greifenberg. Die Luft hier ist von der Schwere der Metallbearbeitung und dem scharfen Geruch von geschmolzenem Gold durchzogen.

## Meisterschaft

Thaldrim selbst ist ein wahres Meisterwerk seiner Zunft, umgeben von blinzelnden Funken und dem schimmernden Glanz seiner Kreationen. Trotz seiner beeindruckenden Fähigkeiten trägt er die Last der Verantwortung schwer, da seine Talente in einer Zeit der Bedrohung und des Krieges gefragt sind.

## Charakter

Sein gebieterischer Blick und die verkniffene Miene deuten auf die innere Zerrissenheit hin, die seinen Stolz als Goldschmied mit der Dringlichkeit seiner Aufgabe vereint. Thaldrim achtet sorgfältig darauf, wem er sein Vertrauen schenkt, doch die Aura der bewunderten Maria von Arden scheint selbst sein eisernes Herz zu erweichen.`,

  "10154799-c01b-ed15-b1d3-01acf1f659e0": `Elowen predigt im Hof der Silbernen Rose und ist eine eifrige Geistliche, wenn es darum geht, gegen Chromus zu sprechen und darüber aufzuklären, dass der Weg dieser Gottheit in keinster Weise der richtige ist. Sie glaubt fest daran, dass nur der Weg Elysias für dauerhaften Frieden in Aurenfurt sorgen kann.

## Frustration und Bekehrung

Inzwischen ist sie sehr frustriert über die Entwicklung in Aurenfurt und ist bemüht, die vielen Flüchtlinge auf die Seite Elysias zu bekehren. Immer wieder kreuzen sich dabei die Wege mit einigen Anhängern von Chromus, was sie regelrecht erzürnt. Doch sie weiß, wie sie Menschen überreden oder sogar beeinflussen kann.

## Kaiser und Prinz

Da der Kaiser ebenfalls Elysia treu ergeben ist, hat sie nur gute Worte für ihn; als sie jedoch vor kurzem vernommen hat, dass der junge Prinz sich Chromus zugewandt hat, schrieb sie mehrere Briefe direkt an den Kaiser.`,

  "909278dd-b3d6-42e1-809e-3417b27a2107": `**Bürgermeister Levander Wöhrm von Falghalar** thront hinter seinem opulent geschmückten Schreibtisch, überladen mit goldenen Schriftrollen und Zeptern, die seinen Status betonen.

## Herrschaftsstil

Seine Stimme hallt durch die hallenden Wände des Rathauses und trägt den Hauch von Arroganz und Überheblichkeit. Er betrachtet die Bürger nur aus der Ferne, als wären sie Schachfiguren auf einem übergroßen Brett — wenig mehr als Werkzeuge zur Förderung seiner eigenen Ambitionen.

## Blindheit gegenüber der Not

Der Schatten einer drohenden Hungersnot schwebt über der Stadt, doch Wöhrm kennt nur seinen eigenen unbeirrbaren Weg und hat kein Ohr für die bittere Not seiner Untertanen. Während die Stadt im Chaos versinkt, schert er sich nur darum, wie die nächste Aufführung zu einer seiner geliebten Zeremonien gestaltet werden kann, blind gegenüber dem Leid in seinen Straßen.`,

  "c121d502-fccc-4093-a2ba-0efcf86ad18d": `Die Luft ist schwer und der Geruch von nassem Holz und scharfem Schweiß liegt über dem Lager der Jägerszunft. Jael steht inmitten ihrer Jäger, das Sonnenlicht bricht durch die dichten Baumkronen und spiegelt sich in ihren durchdringenden, scharfen Augen wider.

## Herkunft und Können

Sie ist eine Halbelfe, deren wettergegerbtes Gesicht die Spuren unzähliger Jagden trägt. Ihr Bogen ist stets zur Hand, als wäre er ein Teil ihres eigenen Körpers.

## Misstrauen

In der Stille, die ihre Umgebung umgibt, hängt ein Gefühl des Misstrauens, da sie den verdächtigen Transport von Fleisch in die Kutschen beobachtet, ohne die Sicherheit ihrer Jäger zu gefährden. Ihre Präsenz strahlt Entschlossenheit aus, während sie im Schatten der Bäume nach der Wahrheit sucht — zwischen den Zeilen des Gesagten und den vagen Geheimnissen, die zwischen den Bürgern von Explora gelauert werden.`,

  "d8cfb95c-449d-4df6-93ee-43eaf50640f8": `Gefangen in der Zwischenwelt schwebt Kurr, ein mächtiger Dämon in der erschreckenden Gestalt eines Beholders.

## Erscheinung

Sein riesiges Auge blickt mit einer hypnotisierenden Intensität auf die Umgebung, als würde es die tiefsten Geheimnisse der Seelen abtasten. Die Luft um ihn herum ist kribbelnd und kühl, während Schatten in seiner Präsenz zu tanzen scheinen. Es ist, als ob die Dunkelheit selbst ihm gehorcht und ihm den Weg ebnet.

## Wirkung und Ziele

Jeder, der ihm zu nahe kommt, spürt die drohende Macht, die von ihm ausgeht, und merkt unweigerlich, dass sein Blick wie ein gefangennehmendes Netz wirkt; zu lange zu schauen heißt, sich selbst zu verlieren. Kurr verfolgt stets seine geheimen Ziele, und während er den Anschein der Gelassenheit wahrt, brodelt hinter seinem unheilvollen Auge der unstillbare Hunger nach Macht.`,

  "deebbb0f-4d45-4925-b643-ad9f0548550d": `In der düsteren Atmosphäre der mittelalterlichen Stadt, umgeben von der Schwärze des Hammers und dem ständigen Klang von Feuer und Eisen, findet man das junge Mädchen Fili.

## Rolle in der Schmiede

Mit funkelnden Augen und einem Kopf voller Ideen, die jenseits ihrer Jahre liegen, hilft sie ihrem Vater und Bruder Jesker in der Schmiede. Ihre kurze Statur ist umgeben von der schweren, schmutzigen Schürze, die sie oft trägt, während der beißende Geruch von geschmolzenem Metall und Rauch sie nicht davon abhält, Fragen zu stellen, die viele in ihrer Umgebung für zu riskant halten würden.

## Charakter

Pressiert vom Schicksal ihrer Familie, strahlt sie sowohl eine naiv-unbekümmerte Haltung als auch die kühle Intelligenz einer Überlebenskünstlerin aus, die in einer Welt lebt, in der die Schatten oft mehr Macht als das Licht haben.`,

  "c891e226-fc3c-442d-89df-7515f17f1091": `Als die Schatten in Kassadras sich zusammenziehen und die Luft von einem schleichenden Unheil durchzogen wird, erhebt sich Skor´vash der Schlangenfürst inmitten des Chaos.

## Präsenz

Sein eindringlicher Blick, der in das Innere der Seelen zu schneiden scheint, entfaltet sich unter einer Schicht aus unheiligem Charisma. Die Geschichten über sein düsteres Dasein sind nur durchdrungen von einem Flüstern des Schreckens, und dennoch empfindet man eine seltsame Anziehungskraft, wenn seine geflügelte Gestalt den Boden berührt.

## Ambition

Um ihn herum wirbelt ein Hauch von Magie, als wäre er der Vorbote eines neuen, dunklen Zeitalters. Immer begleitet von dem Gedanken an Macht und Verrat, ist Skor´vash bereit, alles und jeden zu hintergehen, um sein Ziel zu erreichen, das sich in den tiefsten Schatten verbirgt.`,

  "6246a806-a2e3-4ce4-869d-73cdabd29de3": `In den Schatten der majestätischen, aber trügerischen Bäume von Explora steht Fallghorik Gleidahr, ein hochelfischer Anführer, dessen stolze Haltung von einer tiefen inneren Zerrissenheit geprägt ist.

## Last der Geheimnisse

Umgeben von Eleganz und dem leisen Flüstern der Blätter spürt man beinahe die Last seiner Geheimnisse, die in der Luft hängen. Während er auf den Rat der Elfen wartet, ist sein Blick oft in die Ferne gerichtet, als würde er durch den dichten Nebel der Intrigen nach einer Lösung suchen, die sowohl das Wohl seiner Leute als auch das seiner unehelichen Tochter beschützen könnte.

## Erscheinung

Das ruhige Glühen seiner smaragdenen Augen verrät eine Verzweiflung, die nicht im Einklang mit seinem sonst so anmutigen Äußeren steht, wenn er sich der drückenden Realität seiner politischen Kämpfe stellt.`,

  "8e05dc82-765b-4885-bfa4-6a8f448cea66": `In den Schatten der Enklave, wo das Licht der Sonne nur bruchstückhaft eindringt, thront Seraphyne D’Arven in ihren bescheidenen, aber ehrwürdigen Räumlichkeiten.

## Verantwortung

Ihre Augen, von der Last der Verantwortung gezeichnet, scheinen sowohl das Leid als auch die Hoffnung ihres Volkes zu widerspiegeln. Sie spricht oft mit leiser, aber fester Stimme, und ihr Wissen über die magischen Gefahren, die die Barriere bedrohen, gibt ihr eine Aura der Besorgnis.

## Hüterin des Gleichgewichts

Sirenen klagen in der Ferne, während sie unablässig über das Schicksal der Enklave nachdenkt — zwischen dem Drang, die Wahrheit auszusprechen, und der Furcht vor den Konsequenzen. Seraphyne ist eine Hüterin des Gleichgewichts, die mehr durch ihren Verstand als durch rohe Gewalt überzeugt, in einer Welt, die von Unsicherheit geprägt ist.`,

  "651161ab-89b3-4ea4-bcf1-137596e3e16c": `In den tiefen Schatten der Schmiede, wo das Klirren von Metall und das Zischen von glühendem Eisen die Luft durchdringen, steht Harport Grummbel Toss, ein Mann von unerschütterlicher Entschlossenheit.

## Handwerk

Seine Hände, fest und von Arbeit gezeichnet, meistern mit Leichtigkeit die stählernen Klänge des Ambosses. Die schwachen Lichtstrahlen brechen durch die Ritzen der Wand und tanzen auf seinem gealterten Gesicht, das von viel Lebenserfahrung geprägt ist.

## Hoffnung

Harport ist nicht nur Schmied, sondern ein Symbol der Hoffnung für die wenigen, die in dieser zerrütteten Zeit Zuversicht finden wollen. Die Funken, die bei jedem Schlag fliegen, scheinen die Schatten einen Moment lang zurückzudrängen, während er mit fester Stimme Anweisungen an seine Kinder und seinen Bärenfreund erteilt.`,

  "df9e606e-1bbb-426a-b68b-cd8ae62aa1d8": `In den schummrigen Hallen der Enklave trifft unter drückenden Schatten der Kammermeister Gorwin Freihand Entscheidungen, die das Schicksal vieler beeinflussen können.

## Last der Geheimnisse

Sein Blick ist oft verloren in Gedanken, während er Papiere und Schriften durchblättert, als könnte er den verloren geglaubten Glauben an die Welt um ihn herum aufblättern. Hinter seinem ruhigen Äußeren verbirgt sich die Last geheimbündlerischer Entscheidungen.

## Rebellion

Wenn er lächelt, geschieht es oft mit einer gewissen Melancholie, als wisse er um die Schatten, die sich über die Rebellion legen. Sein verkrampfter Griff um eine alte Schriftrolle lässt erahnen, wie tief er in die Machenschaften verstrickt ist; der Raum um ihn scheint schwer von Geheimnissen und dem Drang, die Welt zurück ins Licht zu führen.`,

  "d345e1eb-2246-4447-b076-5f6141947bd7": `In den staubigen Hallen der Forscherliga steht Senior Magister Althoran Rieve, ein Gesicht, das die Zeichen der Zeit trägt.

## Lehre

Sein Blick ist scharf und durchdringend, als würde er in die Seele eines jeden eindringen, der sich ihm nähert. Die Luft ist kühl, durchzogen von einem Hauch des Verborgenen, und die Schatten der Bücherregale scheinen die Geheimnisse Kassadras zu spüren. Oft hörst du ihn mit einer strengen Stimme die Bedrohungen der Magie und die Wichtigkeit von Disziplin betonen.

## Aura

Seine Anwesenheit allein wirkt als Mahnung, dass Macht immer ihren Preis hat. Althorans Aura strahlt sowohl Respekt als auch Angst aus, und diejenigen, die von seiner Lehre profitieren, wissen, dass sie sich stets anstrengen müssen, um seinen hohen Anforderungen gerecht zu werden.`,

  "c8c72c61-4730-4520-879d-fec727e1e936": `In den düsteren Gassen von Explora huscht eine schattenhafte Gestalt umher. Der Harlekin, ein geheimnisvoller Anführer der Rebellion, trägt eine weiße Maske, die sein Gesicht verborgen hält.

## Legende

Sein Lächeln ist schalkhaft, und die Legenden über seine Wendigkeit sind tief verwurzelt im Volk. Er erscheint, wenn die Dunkelheit am tiefsten ist — ein Lichtstrahl für die Unterdrückten, die dringend Hoffnung brauchen. Wo immer er ist, folgt ein Hauch von Freiheit und der Klang leiser Lieder, die den Geist aufrichten.

## Geheimnis

Durch seinen Schabernack bringt er nicht nur Lachen, sondern auch die Möglichkeit, dass die Ketten der Unterdrückung zerbrochen werden. Doch hinter der Maske verbirgt sich ein Geheimnis, das tief verwurzelt und vielleicht dunkler ist als die Nacht selbst.`,

  "d1388038-6318-ec43-b52f-7025edc29ebd": `Meisterschmied Borin Funkenschlag ist ein kräftiger, grober Mann mit breiten Schultern. Auf seiner Glatze zeichnet sich eine grobe Narbe, die an der linken Augenbraue beginnt. Sein linkes Auge ist ergraut und vermutlich blind.

## Erscheinung

Er hat kräftige, große Schmiedehänge, die zahlreiche kleine alte Brandwunden zeigen. Er trägt mit Stolz die Schürze des Schmiedemeisters der großen Schmiede des Aurenfurter Zunftbundes. Um seinen Hals trägt er eine Kette mit großen Kettengliedern, die ein großes Amulett tragen, das das Symbol seiner Familie zeigt.

## Rolle heute

Inzwischen ist er mehr Händler, sorgt für den Einkauf der wertvollen Erze und für die Ausbildung seiner Studenten und Lehrlinge. Die aktuellen Anspannungen betrachtet er mit einem Lächeln: Krieg belebt das Geschäft.`,

  "d65999c0-200e-3b78-f8fd-e83f5ef1c13a": `Soren wacht als Brunnenhüter über den heiligen Brunnen der Elysia, die eine begehrte heilige Stätte für alle Gläubigen ist. Regelmäßig begrüßt er Gläubige am Wasser, reinigt den Brunnen, verteilt den Segen der Elysia und widmet sich den Klagen und Sorgen der Reisenden, die ihre Gebete an Elysia richten.

## Herkunft

Soren ist ein junger Halbelf, der seine Rolle ernst nimmt und darin sehr aufblüht. In einem vergangenen Kampf an der Front, als er noch als Gardist tätig war, verlor er seine linke Hand, die durch eine Holzprothese ersetzt wurde. Der Glaube an Elysia reinigte seinen Geist und gab ihm neue Kraft.

## Sorge

Mit Schrecken muss er jedoch immer wieder feststellen, dass es respektlose Individuen gibt, die den Brunnen nicht respektieren und ihn sogar schänden.`,

  "36ba4b74-d7ed-42f1-950d-d14f09f90073": `In der gewaltigen Schmiede des Malghor, verborgen in den verbrannten Ebenen der Leer, dröhnt der Klang von Metall, das mit der Kraft der Dunkelheit geschmiedet wird.

## Pakt und Handwerk

Hier flüstern die Seelen der Verdammten in der Hitze der Flammen und entblößen die schrecklichen Geheimnisse, die der Seelenschmied zu verarbeiten sucht. Sein düsterer Pakt mit dem Dämonenfürsten Kurr macht ihn nicht nur zu einem gefürchteten Handwerker, sondern auch zu einem Meister der Täuschung und der Manipulation.

## Präsenz

Bei seinem Erscheinen wird die Luft schwer und kühl, und jeder in seiner Nähe spürt das verführerische Spiel von Macht, das von ihm ausgeht. Sein Anblick ist furchterregend, doch diese Macht geht nicht von ihm aus, sondern von seiner mächtigen Waffe, die er bei sich führt.`,

  "7d709708-8a3b-474b-aa20-caf9bc93801b": `Tholon, ein imposantes Bärwesen, bewegt sich mit fester Entschlossenheit zwischen den glühenden Öfen der zenitischen Schmiede.

## Kraft und Freundschaft

Ein Schatten, der die Dunkelheit erhellt — sowohl durch seine physische Präsenz als auch durch die ungewohnte Freundschaft zu seinem Meister Harport Grummbel Toss. Er schwingt schwere Hämmer mit einer Leichtigkeit, die seine Kraft nur erahnen lässt, während Funken in der Luft tanzen und das Gewicht der vorangegangenen magischen Katastrophe in jedem Schlag spürbar bleibt.

## Charakter

Seine tiefe, brummende Stimme hat etwas Beruhigendes, und sein Herz schlägt für die wenigen Freunde, die ihn als das sehen, was er ist: nicht nur ein Tiermensch, sondern ein treuer Gefährte, der die rauen Geheimnisse von Kassadras wohl kennt.`,

  "f2b47c88-8100-4241-b28d-5f864d6c16fe": `In den schattigen Gassen von Falghalar erstrahlt Elara Mondschein wie ein unheimlicher Stern, der einen unheilvollen Schein auf die Stadt wirft.

## Predigt und Kontrolle

Ihre Stimme hat die Durchdringung des Gebetes, und ihre Worte umhüllen sich wie ein schwarzes Tuch um das Herz der Gläubigen. Ihr Blick, kühl und durchdringend, atmet Kontrolle und fanatische Hingabe.

## Ambition

Hinter ihrer strahlenden Fassade verschleiert sich das Streben nach Macht über jene, die sie als minderwertig erachtet. In ihren Gemächern, unter dem Licht einer blassen Laterne, spinnt sie das Netz ihrer Ambitionen, das die Stadt mit fanatischer Strenge erfasst. Die Liebe zum Licht offenbart sich in ihrer verzweifelten Mission, während die Schatten der Tyrannei unter ihren Füßen lauern.`,

  "12e9cf7c-a78e-47c2-ae38-1bec2d683e34": `Styla bewegt sich mit der Anmut eines unleugbaren Sturms; ihr kräftiger Körper strahlt sowohl Kraft als auch Entschlossenheit aus.

## Vision

Ihre Augen funkeln mit einer Mischung aus Zorn und Hoffnung, während sie von ihren Visionen einer Zukunft träumt, in der Joshu´rak der wahre Anführer des Clans der Sturmhufe ist. Styla hat eine ferne Traurigkeit in ihrem Ausdruck und verrät, dass ihr Herz sowohl von Liebe als auch von der Angst vor dem Unbekannten zerrissen ist.

## Kriegerin und Visionärin

Ihre Stimme, tief und mitreißend, hat die Macht, Gleichgesinnte zu motivieren und Feinde in die Flucht zu schlagen. Sie ist nicht nur Kriegerin, sondern auch eine Visionärin, die an die Kraft des Wandels glaubt, den ihre Geliebte herbeiführen kann.`,

  "9f3c09d3-b7e9-4515-9a46-4d690d82568c": `Vor den Toren der Stadt Greifenberg stand Maria von Arden mit einer Präsenz, die die Luft um sie herum voller Anspannung füllte.

## Erscheinung

Ihre Augen — das eine hinter einer Augenklappe verborgen — durchdrangen die Morgensonne und verloren in ihrem grauen Haar keinen Glanz an Autorität. Die Narben auf ihrem Gesicht und die Spuren des Krieges scheinen Geschichten von unzähligen Schlachten zu erzählen, während ihr eisernes Auftreten den Respekt der Soldaten einfängt.

## Führung

Sie führt ihre Truppen mit einer Disziplin, die sowohl bewundert als auch gefürchtet wird, und erweckt in den Herzen ihrer Männer und Frauen den unerschütterlichen Willen, Greifenberg gegen die drohenden Schatten des Imperiums von Xarvathar zu verteidigen.`,

  "4f6126ff-cf39-e86e-df04-0eefc25968a5": `Sergeant Mael Löwenwall ist der Aufseher des wohl berühmtesten Tores in ganz Aurenfurt. Er nimmt seine Aufgabe sehr ernst, wirkt aber durch sein Alter und seine Erscheinung schon in die Jahre gekommen.

## Flüchtlinge

Besonders die zahlreichen Flüchtlinge sind ihm ein Dorn im Auge, da es kaum für ihn und seine Leute machbar ist, alle zu kontrollieren. Er sieht darin vor allem eine große Bedrohung für die Stadt und hätte den Flüchtlingsstrom aus dem Süden längst das Tor vor der Nase verschlossen.

## Haltung zur Führung

Deswegen kommentiert er auch die Beschwerden seines Vorgesetzten immer sehr zynisch, da er weiß, dass sie an der Lage selber schuld sind. Den aktuellen König hält er für keinen würdigen Nachfolger, folgt aber dessen Befehlen.`,

  "88f720dc-9840-45dd-abdf-1611ee92f8a4": `In den düsteren Gassen von Palcrith wandelt Jesker, der Sohn des bekannten Harport Grummbel Toss. Er trägt das Erbe seines Vaters mit einer Mischung aus Stolz und Groll.

## Trauer und Hass

Seine Augen, schmal und von einer dunklen Aura umringt, scheinen die Schatten der Stadt zu durchdringen, während die Trauer um den Verlust seiner Mutter ihn umgibt. Mit jeder Bewegung strahlt er ein Gefühl der Entschlossenheit aus, jedoch trägt er eine eisige Abneigung in sich, die vor allem gegen die Tiermenschen gerichtet ist, die ihm das Liebste genommen haben.

## Vergeltung

In seinen jungen Jahren ist Jesker bereits auf der Suche nach Vergeltung, und die Dunkelheit von Kassadras hat ihn zu einer Waffe gemacht, die stets bereit ist zuzuschlagen.`,

  "7c05b39e-1e00-49a9-bb52-958d1f2e2a0d": `Thorgen Eisenhaut steht an der kargen Öffnung der Grube; das Licht der untergehenden Sonne wirft verzweifelte Schatten über sein zerfurchtes Gesicht.

## Zerrissenheit

Sein starrer Blick zeugt von einer inneren Zerrissenheit, die selbst sein robustes Äußeres nicht verbergen kann. Der mürrische Zwerg ist umgeben von den schroffen Felsen, die die Grube umrahmen. Das Geschrei seiner Arbeiter hallt in der beklemmenden Luft wider, während Thorgen sie mit dröhnender Stimme antreibt, als wäre ihr Überleben davon abhängig.

## Familie

In seinen Augen blitzt der Kampfgeist, doch unter der rauen Oberfläche brodelt eine unterschwellige Angst um seine Familie, die er bereitwillig hinter einer Maske aus Sturheit und Unnachgiebigkeit verbirgt.`,

  "92ac4a8c-a1be-4509-a465-0d664a86c12f": `Die Luft riecht nach brennendem Wachs, als Falghis Earthborn in der Dämmerung der Stadt Falghalar erscheint.

## Auftreten

Sein Gesicht ist von tiefen Schatten umgeben, und sein Blick strahlt sowohl eine ergreifende Hingabe als auch einen geheimnisvollen Schleier aus. Er bewegt sich mit einer Anmut, die beinahe übernatürlich wirkt, während er seine Botschaften von Hoffnung und Licht verkündet.

## Prophet

Doch seine Worte wirken viel tiefgründiger und weise überlegt. Verbergen sie womöglich noch viel mehr, als es den Anschein erweckt? Jede Bewegung seiner Lippen verspricht eine Verbindung zum heiligen Zenit. Seine Aufgabe als Prophet genießt er in vollen Zügen und weiß durchaus um die Macht, die seine Position ausstrahlt.`,

  "aad129c3-fe60-0738-5f8c-18860201788f": `Brann ist der Anführer der Stadtwache und dem Kaiser treu ergeben. Er ist ein typischer Halbzwerg, der mehr charakterliche Züge seines Zwergenvaters hat. Er ist knapp 1,65 groß, aber dafür kräftig und hat eine imposante Statur.

## Vergangenheit mit dem Kaiser

Mit dem Kaiser hatte er einst gemeinsam gedient und erzählt auch gerne viel über diese gemeinsame Zeit.

## Aufgabe und Haltung

Er hat alle Hände voll zu tun, die Sicherheit in der Stadt zu wahren, und ist deswegen sehr angespannt und gestresst. Vor allem die ständigen Spannungen im Tempelbezirk kann er nicht nachvollziehen, da er selber nicht gläubig ist.

Er vertraut dem Urteil des Kaisers und stellt sein Handeln nicht in Frage, sondern befolgt seine Befehle und erwartet dies auch von seinen Wachen.`,

  "70e32d76-eb1c-4d14-be35-a68e89faa9cd": `Im dunklen, feuchten Verließ von Dolstraeth schimmert ein schwaches Licht über die konturenlosen Wände. Dort, in der tiefsten Ecke, hockt Old-Shadow, ein Wesen, dessen faszinierende Aura gleichzeitig Schrecken und Anziehung versprüht.

## Zustand

Sein müdes und behandeltes Wesen flüstert von der Kraft, die einmal war, eingekerkert in einen Körper voller Dunkelheit und Verzweiflung. Während die Schatten um ihn herum tanzen, murmeln sie etwas von der bevorstehenden Ankunft des Unheils und der Möglichkeit eines grausamen Ausbruchs, der die Welt erneut in Finsternis stürzen könnte.

## Wirkung auf andere

Sein Zusammenbruch weckt in den Anwesenden eine verstörende Neugier, die vom Drang zu helfen bis zum Wunsch des Bekämpfens reicht.`,

  "1e26d2a5-c05f-4657-9689-15179b802b11": `Hauptmann Charles Vance steht auf dem schlammbedeckten Platz der Garnison wie ein lebendes Denkmal, majestätisch in seiner makellosen Rüstung, die in scharfem Kontrast zur tristen Umgebung steht.

## Auftreten

Seine Augen, eiskalt und durchdringend, scheinen selbst die dunkelsten Geheimnisse der Welt zu durchdringen. Während er bei der Verteidigung der Handelswege gegen „Rebellen und Bestien“ betont, schwingt immer ein Hauch von Macht und Bedrohung in seinen Worten mit.

## Hinter der Fassade

Hinter dieser Fassade des Stolzes verbirgt sich ein Manipulator, der seine eigenen Interessen über das Wohl seiner Männer und der Stadt stellt, und sein Lächeln könnte ebenso gut das Lächeln eines Wolfes sein, der das Schaf betrachtet.`,

  "29eccc54-2654-4bea-87e5-d518a7df957c": `In den Schatten der verfallenen Ruinen der Elfensiedlung wandelt Yisilandar Gleidahr, die uneheliche Tochter des Hochelfen Fallghorik Gleidahr.

## Verbannung

Ihre Präsenz strahlt sowohl Gefahr als auch Traurigkeit aus, während sie mit jeder schattenhaften Bewegung das Echo ihrer verlorenen Kindheit und das Erbe ihrer blutigen Abstammung mit sich trägt. Verbannt von der Enklave, hat sie sich den Rätseln der Dunkelheit verschrieben und führt die wenigen, die es wagen, mit ihr zu sprechen, hinab in die Geheimnisse, die sie in den tiefsten Wäldern gefunden hat.

## Gefahr

Doch die Gefahr ist ständig präsent, denn ihre Fähigkeiten als Wahrsagerin lösen in den schattenhaften Reihen der Macht Missgunst und Furcht aus.`,

  "0c81e968-3818-4752-acf7-5fdd80085ad1": `Die Luft um ihn herum scheint schwer mit der Last vergangener Abenteuer, während Arek Katuur, ein Tiermensch mit scharfem Blick und klugen Zügen, die geschundenen Wunden des Krieges in seinen Augen trägt.

## Kartograf

Er steht in der Mitte eines dunklen Zimmers, die Wände gesäumt mit zerknitterten Karten und verwitterten Landkarten. Die schwache, flackernde Kerze wirft Schatten, die die Linien auf seinen behelfsmäßigen Entwürfen lebendig erscheinen lassen.

## Mission

Arek ist Zeuge einer Welt im Umbruch, gezeichnet von Kampf und Intrigen, jedoch strahlt er durch seinen unerschütterlichen Glauben an den eigenen Wert und den unaufhörlichen Drang, die verloren geglaubte Freiheit Greifenbergs zu bewahren.`,

  "42b4886a-666b-4209-954c-70538de147f2": `Das Licht des Mondes bricht durch die dichten, verwitterten Äste des Waldes, in dem Joshu´rak verweilt.

## Verrat und Entschlossenheit

Sein angespannter Körper, von der Last des Verrats gezeichnet, strahlt eine eindringliche Entschlossenheit aus. Jeder Schritt, den er macht, ist von der Wut und dem Schmerz geprägt, die ihm von Gho´tun zugefügt wurden. Mit leuchtenden, stahlblauen Augen durchdringt sein Blick die Dunkelheit, als suche er nach einer Gelegenheit, um sich zu beweisen.

## Herausforderung

Der Duft von nasser Erde und faulenden Blättern umgibt ihn, während er seine Gedanken orchestriert, um seinen Bruder herauszufordern — eine Herausforderung, die sowohl Ehre als auch den Zorn einer mahnenden Vergangenheit birgt.`,

  "cd4dc63a-de21-4994-8fb2-9de76b5351ba": `Elyndra Vanyelion, eine strahlende Paladin der Schwarzen Bastion, steht im Dämmerlicht, während windige Schatten über das kampfgeschundene Land ziehen.

## Blick und Kummer

Ihr Blick ist fest und durchdringend, als ob sie Gefahren erkennt, die für andere unsichtbar sind. Der Kummer über das Schicksal ihrer Mutter, der Schwarmhexe, quält sie, doch ihre Entschlossenheit, die verlorene Zeit zu finden und die Wahrheit zu ergründen, verleiht ihr eine unerschütterliche Kraft.

## Licht in der Dunkelheit

Sie ist das Licht in der Dunkelheit, das Hoffnung in die Herzen ihrer Gefährten bringt. Schimmernde Rüstungen reflektieren den schwachen Lichtschein, während sie unermüdlich für die gerechte Sache kämpft und dem Bösen trotzt.`,

  "11fc3d93-d019-4e4b-83d9-a71231dfd8bc": `In der Taverne Sternenschimmer, wo der feine Geruch von exotischen Gewürzen die Luft erfüllt und das sanfte Licht magischer Kristalle von der Decke strahlt, steht Sigilus Thunderwhell hinter dem Tresen.

## Gastgeber

Sein Lächeln ist ebenso einladend wie sein elfischer Akzent, der die Geschichten aus längst vergangenen Tagen haucht. Die Wände sind geschmückt mit handgefertigten Wandteppichen, die die Kultur seiner Leute zelebrieren.

## Neugier

Doch hinter dieser charmanten Fassade verbirgt sich eine Neugier, die nicht nur die geheimen Rezepte seiner Küche beinhaltet, sondern auch die kleinsten Geheimnisse seiner Gäste. Er lauscht aufmerksam, bereit, jedes Gerücht als wahren Schatz zu betrachten.`,

  "212ad1ac-e4f8-4a5e-b75d-104d3a93076f": `Gho´tun steht im Schatten der hohen Felswände; seine dunkle Präsenz scheint den Wind um ihn herum zum Schweigen zu bringen.

## Rache

Seine Augen blitzen vor unbändigem Zorn und einem unstillbaren Verlangen nach Rache. Von der Trauer um seine verlorene Frau getrieben, hat er unzählige Dörfer in Angst und Schrecken versetzt, und der Klang seiner Stimme hallt wie das Dröhnen eines heranziehenden Gewitters.

## Macht und Korruption

Umgeben von seinen kriegerischen Gefolgsleuten verkörpert er die dunkle Macht, die seinen Clan in einen gefährlichen Krieg führen könnte. Doch in seinen Zügen schimmert nicht nur die Wut, sondern auch die schleichende Korruption, die seine Seele mehr und mehr frisst.`,
};

async function main() {
  const ids = Object.keys(UPDATES);
  console.log(APPLY ? "APPLY" : "DRY-RUN", ids.length, "NPCs");
  if (!APPLY) {
    for (const id of ids) {
      const heads = UPDATES[id].split("\n").filter((l) => /^#{2,3}\s/.test(l));
      console.log("-", id.slice(0, 8), heads.join(" | "));
    }
    return;
  }
  for (const [id, description] of Object.entries(UPDATES)) {
    const { error } = await supabase.from("npcs").update({ description }).eq("id", id);
    if (error) throw new Error(`${id}: ${error.message}`);
    console.log("ok", id);
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
