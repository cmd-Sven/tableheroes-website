/**
 * Feste aus dem Weltenband, gelegt auf den Gottmonat.
 * Lag der Tag im alten 42-Tage-Zyklus hinter dem Monatsende, steht er am letzten Tag dieses Monats.
 */

export type KassadrasFestival = {
  month: number;
  day: number;
  title: string;
  peoples: string;
  summary: string;
};

export const KASSADRAS_FESTIVALS: KassadrasFestival[] = [
  { month: 1, day: 1, title: "Atem des Windes", peoples: "Hochelfen, Menschen", summary: "Tänze und Gesänge zur Feier des Windes und der Freiheit." },
  { month: 1, day: 21, title: "Fest des Sturms", peoples: "Hochelfen, Tritaner", summary: "Die Welle aus dem Osten bringt heftige Winde über die Küsten." },
  { month: 2, day: 1, title: "Tag der Meditation", peoples: "Hochelfen, Menschen", summary: "Gemeinschaftliche Meditationsrituale." },
  { month: 2, day: 21, title: "Friedensfest", peoples: "Hochelfen, Zwerge, Menschen", summary: "Zeremonien für Harmonie und Eintracht." },
  { month: 3, day: 1, title: "Ritual der Steine", peoples: "Alle", summary: "Ehrung der Erde und Kassadras. Zwerge feiern das Erz, Menschen Flora und Fauna, Hochelfen das Werk aus der Natur." },
  { month: 3, day: 31, title: "Erntefest", peoples: "Zwerge, Tritaner, Menschen, Khalkmari", summary: "Die Ernte wird eingeholt. Am Abend brennen große Feuer und es gibt ein Festmahl." },
  { month: 4, day: 14, title: "Lichterfest auf dem Wasser", peoples: "Tritaner, Menschen", summary: "Schwimmende Lichter für den Lebensfluss." },
  { month: 4, day: 30, title: "Meeresfest", peoples: "Tritaner, Khalkmari", summary: "Feier der Meere mit Geschichten und Tänzen." },
  { month: 5, day: 1, title: "Fest der Liebe", peoples: "Menschen, Mondelfen", summary: "Freundschaft und Zuneigung, Blumenkränze und Gedichte." },
  { month: 5, day: 21, title: "Hoffnungslicht", peoples: "Alle", summary: "Entzündete Lichter für Hoffnung." },
  { month: 5, day: 31, title: "Familienfest", peoples: "Menschen, Zwerge", summary: "Familien stärken ihre Bindung." },
  { month: 6, day: 14, title: "Feuerfest", peoples: "Khalkmari, Menschen, Zwerge, Gnome", summary: "Tänze und Rituale rund um das Feuer." },
  { month: 6, day: 28, title: "Tag der Kreativität", peoples: "Khalkmari, Menschen, Hochelfen, Zwerge", summary: "Wettbewerbe in Kunst und Handwerk." },
  { month: 7, day: 7, title: "Tag der Gelehrten", peoples: "Gnome, Menschen, Zwerge", summary: "Vorträge, neue Errungenschaften und Austausch." },
  { month: 7, day: 31, title: "Ehrentag der Magie", peoples: "Alle", summary: "Gilden, Kleriker und Zauberer feiern die weiße Magie und ihre Rückkehr." },
  { month: 8, day: 1, title: "Tag der Veränderung", peoples: "Tierwesen, Menschen", summary: "Feier von Wandel und Beweglichkeit." },
  { month: 8, day: 14, title: "Ritual der Vielfalt", peoples: "Tierwesen, Gnome, Menschen", summary: "Unterschiede und viele Blickwinkel." },
  { month: 8, day: 28, title: "Tag der Offenbarung", peoples: "Alle", summary: "Gaben, die einem Schicksal helfen. Der Toten und ihrer Taten wird gedacht." },
  { month: 9, day: 7, title: "Nacht der Geheimnisse", peoples: "Mondelfen, Chikari", summary: "Geschichten und Legenden unter dem Mond." },
  { month: 9, day: 21, title: "Traumfest", peoples: "Mondelfen, Menschen", summary: "Zeremonien zur Ehrung der Träume." },
  { month: 10, day: 7, title: "Tag der Reflexion", peoples: "Ilithiden, Menschen, Hochelfen", summary: "Rückschau auf das vergangene Jahr." },
  { month: 10, day: 21, title: "Schicksalsfest", peoples: "Alle", summary: "Feier der Möglichkeiten und Entscheidungen." },
  { month: 12, day: 31, title: "Tag des Übergangs", peoples: "Alle Völker", summary: "Wünsche für das kommende Jahr und Abschied von den Lasten des alten." },
];

export function festivalsOnIso(iso: string): KassadrasFestival[] {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day) return [];
  return KASSADRAS_FESTIVALS.filter((festival) => festival.month === month && festival.day === day);
}
