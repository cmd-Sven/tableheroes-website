/**
 * Layout-Engine für das feste 3x3 Dashboard-Grid.
 * 9 Slots: x_pos 0..2, y_pos 0..2. Karten haben width 1 oder 2 (col-span).
 * width=2 bei x_pos=2 ist ungültig (würde über Rand gehen).
 */

export type LayoutItem = {
  id: string;
  x_pos: number;
  y_pos: number;
  width: 1 | 2;
};

export const COLS = 3;
export const ROWS = 3;

/** Prüft, ob ein LayoutItem gültig ist (x + width <= 3, y 0..2). */
export function isValidItem(item: LayoutItem): boolean {
  if (item.width !== 1 && item.width !== 2) return false;
  if (item.x_pos < 0 || item.x_pos >= COLS) return false;
  if (item.y_pos < 0 || item.y_pos >= ROWS) return false;
  if (item.x_pos + item.width > COLS) return false;
  return true;
}

/** Belegte Zellen: Key = "y,x", Value = id (nur Start-Zelle) oder "span" für zweite Zelle. */
export function getOccupiedCells(layout: LayoutItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of layout) {
    if (!isValidItem(item)) continue;
    map.set(`${item.y_pos},${item.x_pos}`, item.id);
    if (item.width === 2) {
      map.set(`${item.y_pos},${item.x_pos + 1}`, item.id);
    }
  }
  return map;
}

/** Gibt die Anzahl Zeilen zurück (immer 3 im festen Grid). */
export function getGridRows(_layout?: LayoutItem[]): number {
  return ROWS;
}

/** Alle 9 Slot-Positionen (row, col) des festen 3x3-Grids. */
export function getAllSlotPositions(): { row: number; col: number }[] {
  const slots: { row: number; col: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      slots.push({ row: r, col: c });
    }
  }
  return slots;
}

/** Leere Slots (row, col) im 3x3-Grid, die von keiner Karte belegt sind. */
export function getEmptySlots(
  layout: LayoutItem[]
): { row: number; col: number }[] {
  const occupied = getOccupiedCells(layout);
  const slots: { row: number; col: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!occupied.has(`${r},${c}`)) slots.push({ row: r, col: c });
    }
  }
  return slots;
}

/** Findet die Karte, die an (row, col) startet (Start-Zelle). Zweite Zelle einer width-2 Karte liefert null. */
export function getCardAt(
  layout: LayoutItem[],
  row: number,
  col: number
): LayoutItem | null {
  const item = getCardAtCell(layout, row, col);
  if (!item) return null;
  if (item.y_pos === row && item.x_pos === col) return item;
  return null;
}

/** Gibt die Karte zurück, die (row, col) belegt (egal ob Start- oder Folgezelle). */
export function getCardAtCell(
  layout: LayoutItem[],
  row: number,
  col: number
): LayoutItem | null {
  for (const item of layout) {
    if (item.y_pos !== row) continue;
    if (col >= item.x_pos && col < item.x_pos + item.width) return item;
  }
  return null;
}

/**
 * Prüft, ob eine Karte mit `width` an (row, col) platziert werden kann.
 * - width=2 bei col=2 ist ungültig (über rechten Rand).
 * - row/col müssen im 3x3-Grid liegen (0..2).
 * - Zielzellen müssen frei oder von derselben Karte belegt sein.
 */
export function canPlaceAt(
  layout: LayoutItem[],
  itemId: string,
  row: number,
  col: number,
  width: 1 | 2
): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  if (width === 2 && col === 2) return false;
  if (width === 2 && col + 2 > COLS) return false;
  const occupied = getOccupiedCells(layout);
  for (let c = col; c < col + width; c++) {
    const key = `${row},${c}`;
    const occupant = occupied.get(key);
    if (occupant != null && occupant !== itemId) return false;
  }
  return true;
}

/**
 * Berechnet die gültige Zielposition für eine Karte (Snap-to-Grid im 3x3).
 * Clamp row/col auf 0..2. width=2: col nur 0 oder 1.
 */
export function resolveDropTarget(
  layout: LayoutItem[],
  itemId: string,
  width: 1 | 2,
  dropRow: number,
  dropCol: number
): { row: number; col: number } {
  const row = Math.max(0, Math.min(ROWS - 1, dropRow));
  let col = dropCol;
  if (width === 2 && col === 2) col = 1;
  col = Math.max(0, Math.min(COLS - (width === 2 ? 2 : 1), col));
  if (canPlaceAt(layout, itemId, row, col, width)) return { row, col };
  if (width === 1) return { row, col };
  return { row, col: col === 1 ? 0 : 1 };
}

/**
 * Bewegt eine Karte an die neue Position (Snap-to-Grid).
 * Bei Belegung: Tausch mit der Karte an der Zielposition.
 * Ziel wird mit resolveDropTarget auf gültiges 3x3 geklemmt.
 */
export function moveCard(
  layout: LayoutItem[],
  itemId: string,
  newRow: number,
  newCol: number,
  widths: Record<string, 1 | 2>
): LayoutItem[] {
  const width = widths[itemId] ?? 1;
  const { row, col } = resolveDropTarget(layout, itemId, width, newRow, newCol);
  const current = layout.find((i) => i.id === itemId);
  if (!current) return layout;

  const other = getCardAtCell(layout, row, col);
  if (other && other.id !== itemId) {
    const next = layout.map((item) => {
      if (item.id === itemId) return { ...item, x_pos: col, y_pos: row };
      if (item.id === other.id)
        return { ...item, x_pos: current.x_pos, y_pos: current.y_pos };
      return item;
    });
    return next;
  }
  return layout.map((item) =>
    item.id === itemId ? { ...item, x_pos: col, y_pos: row } : item
  );
}

/**
 * Konvertiert eine Reihenfolge (string[]) in ein Layout im 3x3-Grid.
 * Füllt Zeilen 0, 1, 2; width=2 bei col=2 wird in nächste Zeile geschoben.
 */
export function flowLayoutFromOrder(
  order: string[],
  widths: Record<string, 1 | 2>
): LayoutItem[] {
  const result: LayoutItem[] = [];
  let row = 0;
  let col = 0;
  for (const id of order) {
    const w = widths[id] ?? 1;
    if (row >= ROWS) break;
    if (w === 2 && (col === 2 || col === 1)) {
      row++;
      col = 0;
    } else if (w === 1 && col === 3) {
      row++;
      col = 0;
    }
    if (row >= ROWS) break;
    result.push({ id, x_pos: col, y_pos: row, width: w });
    col += w;
    if (col >= COLS) {
      row++;
      col = 0;
    }
  }
  return result;
}

/**
 * Klemmt alle Positionen auf das 3x3-Grid (y 0..2, x 0..2).
 * width=2 bei x=2 wird auf x=1 gesetzt.
 */
export function clampLayoutToGrid(layout: LayoutItem[]): LayoutItem[] {
  return layout.map((item) => {
    let x = Math.max(0, Math.min(COLS - 1, item.x_pos));
    let y = Math.max(0, Math.min(ROWS - 1, item.y_pos));
    if (item.width === 2 && x === 2) x = 1;
    return { ...item, x_pos: x, y_pos: y };
  });
}

/**
 * Konvertiert ein Layout (LayoutItem[]) in eine stabile Reihenfolge (y, x) für Speicherung.
 * Normalisiert: sortiert nach (y_pos, x_pos).
 */
export function normalizeLayout(layout: LayoutItem[]): LayoutItem[] {
  return clampLayoutToGrid([...layout]).sort((a, b) => {
    if (a.y_pos !== b.y_pos) return a.y_pos - b.y_pos;
    return a.x_pos - b.x_pos;
  });
}

/**
 * Prüft, ob das gespeicherte Layout das neue Format (LayoutItem[]) oder das alte (string[]) hat.
 */
export function isNewLayoutFormat(raw: unknown): raw is LayoutItem[] {
  return (
    Array.isArray(raw) &&
    raw.length > 0 &&
    typeof raw[0] === "object" &&
    raw[0] != null &&
    "x_pos" in (raw[0] as object)
  );
}
