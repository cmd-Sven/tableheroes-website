/**
 * Grenzfall-NPCs ~580–650 ohne ## — Absätze + Zwischenüberschriften.
 * Apply: node scripts/format-npc-descriptions-batch2.mjs --apply
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
  "e6680d87-6b73-4fe2-89bb-c3a4181b1f22": `In der dunklen Halle der schwarzen Bastion steht Kommandant Thalandor Vanyelion, ein Schatten seiner einstigen Stärke. Sein müder Blick zeugt von endlosen Kämpfen, die ihn an den Rand des Wahnsinns getrieben haben. Die düstere Magie, die in den Steinmauern dieser Festung wohnt, hat sich in sein Wesen eingegraben.

## Familie

Sein eiserner Wille wird nur durch die Präsenz seiner Tochter, Lethariel, aufrechterhalten, die das letzte Licht in seiner vom Schatten gezeichneten Welt ist. Ein schwacher Hauch von Hoffnung, der inmitten des Wirbelsturms der Dunkelheit flüstert, das Überreste von Liebe, die er für das Opfer seiner verstorbenen Frau, Elyndra, hegt.`,

  "270040ce-bae9-4c94-bf27-f2e5e057eae4": `In der schummrigen Ecke der Taverne sitzt Balin Thorne, ein breitschultriger Mann mit zotteligem, rotbraunem Haar und einem Zopf, der über seine Schulter fällt. Das schwache Licht der zwei Monde spiegelt sich in seinen stechenden, grünlichen Augen wider, während er seine Umgebung mit wachsamem Blick mustert.

## Erscheinung und Ruf

Der Geruch von tabakgefülltem Wurstbrot und billigen Weinen umgibt ihn. Balins breite Brust und muskulösen Arme verraten, dass er nicht zu unterschätzen ist. Mit einem schiefen Grinsen auf den Lippen erzählt er seinen berüchtigten Gefährten Geschichten von vergangenen Überfällen und den Reichtümern, die in der Dunkelheit auf sie warten.`,

  "49cb6ee0-7f10-45b2-8cc6-3777996a74b9": `Bromar sitzt an einem der Tische, seine massive Statur zieht sofort die Blicke auf sich. Mit einem rissigen Grinsen, das seine schiefen Zähne zur Schau stellt, wirkt er wie das Paradebeispiel eines verwegenen Räubers.

## Erscheinung und Treiben

Seine sphärischen, scharfen Augen funkeln vor unbändiger Energie und scheinen die Umgebung kritisch zu beobachten. Das trierende Leder seiner Kleidung trägt die Spuren zahlloser Kämpfe und Auseinandersetzungen, während er offenkundig von seinen neuesten Raubzügen schwärmt. Eine feine Schicht von Staub und Dreck bedeckt die Ränder seiner Stiefel, ein Zeichen seiner ständigen Umherstreiferei in der rauen Wildnis von Kassadras.`,

  "44b22bf1-f6bf-4ff8-9c05-c4441bba0f14": `In einem stillen, jedoch eindringlichen Moment hebt Halgari Gleidahr ihren Kopf und lässt ihre smaragdgrünen Augen durch den schattenhaften Raum gleiten. Ihre Präsenz strahlt eine Mischung aus Entschlossenheit und Verzweiflung aus, während sie die Fäden der Diplomatie in ihren zarten Händen hält.

## Erbe und Verantwortung

Es ist offensichtlich, dass der Wunsch, das Erbe ihres Vaters fortzuführen, sie antreibt, doch die Schwere der Verantwortung in dieser grauen, vom Krieg zerrissenen Welt drückt schwer auf ihren Schultern. Jeder Schritt, den sie macht, ist von der Hoffnung begleitet, dass ihr Volk die Dunkelheit, die ihre Heimat umhüllt, überwinden kann.`,

  "5f5046eb-cfc3-4767-a1f6-1f60068b1620": `Kramker tritt mit einer düsteren Entschlossenheit in Erscheinung, seine Augen brennen wie verzehrende Kohlen in der Nacht. Sein zotteliger Mantel ist vom Nebel des Verrats und der Flucht umweht, während er in den Schatten von Kassadras umherstreift, um die Unterdrückten zu versammeln.

## Aufstand

Seine Stimme trägt den rauen Klang der Verzweiflung, doch in seinen Worten schwingt die Hoffnung auf Befreiung mit, wie ein verkohltes Feuer, das darauf wartet, neu entfacht zu werden. Jeder Blick, den er über die verängstigten Gesichter seines Volkes schweifen lässt, verspricht, dass der Aufstand näher ist, als sie alle glauben möchten.`,

  "e384762f-f773-4b60-81f0-f2566ad2acf5": `In der dunklen Ecke der Taverne sitzt Talindra, eine Söldnerin von eindruckreicher Statur. Ihr verschmitztes Lächeln wirkt mit einem Hauch von gefährlichem Charme, während sie mit einem Krug Ale in der Hand spielerisch die Lichtreflexionen auf der Oberfläche beobachtet.

## Wachsamkeit und Loyalität

Ihre durchdringenden grünen Augen scannen den Raum, stets auf der Suche nach potenziellen Bedrohungen oder Möglichkeiten. Die Hitze des Feuers wirft tanzende Schatten auf ihr Gesicht, das von der Erfahrung zahlloser Kämpfe gezeichnet ist, doch ihr Blick verrät eine tief verwurzelte Loyalität gegenüber denen, die ihren Respekt gewinnen.`,

  "9788af58-3e0b-3df3-4137-7848fc25d3d5": `Gretal ist eine gnadenlose aber faire Händlerin, die es weiß, wie man den Preis nach oben treibt. Sie kann sehr hitzig werden, schafft es dennoch aber, Ruhe auszustrahlen. Sie gilt als strategisch taktisch kluge Goldschmiedin, die vor allem ihre Stärken gut auszuschmücken weiß.

## Rolle

Genau so leitet sie auch das Erbe ihres Vaters, den Aurenfurter Zunftbund. Sie betrachtet es als ihre Pflicht und Ehre, den Zunftbund in eine bessere Zukunft zu führen; dabei ignoriert sie die Adelshäuser und vor allem das Haus der Seide, ihrem stärksten Konkurrenten, und konzentriert sich lieber auf die inneren Probleme.`,

  "f5631dbe-7043-f7db-229d-04444c1604a1": `Drenn ist eine typische Stadtwache, die einst sehr ambitioniert war, aber durch das Milieu durch und durch verdorben wurde. Aufgrund seiner vorlauten Worte geriet er in diese Wachstube mit der Chance, etwas aus sich zu machen, doch die Unterstadt zwang auch sein Engagement in die Knie.

## Untergrund

Er entdeckte schnell die Möglichkeiten in anderen Bereichen und die Macht, die er hatte zu „verkaufen“. Inzwischen ist er soweit im Untergrund vernetzt, dass es selbst für den Hauptmann kaum möglich ist, ihn einfach zu versetzen. Das entstehende Machtvakuum könnte sonst für deutlich mehr Probleme sorgen.`,

  "0a2da011-0455-b584-8cf7-9ee4fcc8910a": `Mikaro Kelchhof ist ein eifriger Halbelf und Leiter der Kapelle der Silbernen Rose. Dank seiner halbelfen Herkunft ist ihm sein Alter kaum anzusehen. Trotz seines elfischen Vaters blieb er der Menschengöttin Elysia treu ergeben und übernahm später die Leitung des Bundes.

## Charakter

Sein Mitgefühl, seine Ratschläge und sein offenes Ohr waren seine typischen Merkmale; als Geistlicher hatte er viel Nachsicht und Güte, selbst den Individuen gegenüber, die auf Abwegen versuchten, durchs Leben zu kommen.

## Herkunft

Seine Herkunft als Halbelf versucht er dennoch — seine spitzen Ohren weitgehend zu verbergen.`,

  "870cec3d-3bb0-45f9-86e2-57d41505eec1": `In den schattigen Gängen des Untergrunds von Falghalar bewegt sich Yuri Eisenkralle mit einer geschmeidigen Eleganz, die seine tierische Herkunft verrät. Ein tiefes, verletztes Funkeln in seinen Augen verrät von den Qualen, die er durchlebt hat, und von der Last seiner Mission, die Unterdrückten zu befreien.

## Anführer

Seine Worte sind erfüllt von einer entrückenden Leidenschaft und einem unbeugsamen Glauben an die Freiheit seiner Artgenossen. Er ist ein Schatten, der die Dunkelheit durchdringt, und ein unerschütterlicher Anführer, dessen Präsenz Hoffnung und Rebellion zugleich entfacht.`,

  "8afc3a7b-9f1f-468e-807e-ee06a8ea3547": `In einem Raum voller Schatten sitzt Patriarch Zharos, die klirrenden Ketten der Ordnung um seinen Hals. Vor den flackernden Lichtern der Kerzen strahlt sein Antlitz eine unheilvolle Autorität aus, während seine Stimmen die Dunkelheit durchdringen.

## Herrschaft

Er trägt die Geschenke des Nerath, eine Aura von Gehorsam und Angst, die in der Luft schwebt. Entschlossen, aber unbarmherzig, hält er die Fäden des Schicksals in Händen, bereit, die, die ihm den Ungehorsam zeigen, mit der alles verschlingenden Asche zu bedrohen.`,
};

async function main() {
  const ids = Object.keys(UPDATES);
  console.log(APPLY ? "APPLY" : "DRY-RUN", ids.length, "NPCs");
  if (!APPLY) return;
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
