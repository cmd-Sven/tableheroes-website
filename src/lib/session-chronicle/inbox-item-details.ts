import type { ChronicleInboxItem } from "./types";

export type InboxItemDetailLine = {
  label: string;
  value: string;
};

export function getChronicleInboxItemDetails(
  item: ChronicleInboxItem,
): InboxItemDetailLine[] {
  if (item.kind === "npc") {
    const d = item.draft;
    const lines: InboxItemDetailLine[] = [];
    if (d.appearance?.trim()) {
      lines.push({ label: "Aussehen", value: d.appearance.trim() });
    }
    if (d.behavior?.trim()) {
      lines.push({ label: "Verhalten", value: d.behavior.trim() });
    }
    const stats = d.estimated_stats;
    if (stats?.race?.trim() || stats?.class?.trim()) {
      lines.push({
        label: "Geschätzt",
        value: [stats?.race, stats?.class].filter(Boolean).join(" · "),
      });
    }
    if (d.located_in?.trim()) {
      lines.push({ label: "Ort in Session", value: d.located_in.trim() });
    }
    return lines;
  }

  if (item.kind === "location") {
    const d = item.draft;
    const lines: InboxItemDetailLine[] = [];
    if (d.type?.trim()) lines.push({ label: "Typ", value: d.type.trim() });
    if (d.description?.trim()) {
      lines.push({ label: "Beschreibung", value: d.description.trim() });
    }
    return lines;
  }

  const d = item.draft;
  const lines: InboxItemDetailLine[] = [];
  if (d.giver?.trim()) lines.push({ label: "Questgeber", value: d.giver.trim() });
  if (d.objective?.trim()) lines.push({ label: "Ziel", value: d.objective.trim() });
  return lines;
}

export function chronicleImportFlowHint(item: ChronicleInboxItem): string {
  if (item.kind === "npc") {
    return "„Übernehmen“ öffnet den NSC-Maker in einem neuen Tab mit vorausgefülltem Namen, Aussehen und Verhalten aus dem Chronist. Du kannst alles prüfen und anpassen. Erst wenn du den NSC speicherst, wird er dauerhaft angelegt und der Vorschlag verschwindet aus der Inbox.";
  }
  if (item.kind === "location") {
    return "„Übernehmen“ öffnet den Ort-Maker mit Name, Typ und Beschreibung aus dem Chronist. Nach dem Speichern landet der Ort in der Welt-Lore und der Vorschlag wird als importiert markiert.";
  }
  return "„Übernehmen“ öffnet den Quest-Maker mit Titel und Ziel aus dem Chronist. Nach dem Speichern wird die Quest angelegt und der Vorschlag aus der Inbox entfernt.";
}
