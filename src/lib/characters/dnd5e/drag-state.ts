/** Modulweiter State für HTML5-Drag (getData ist bei dragover oft leer). */
let currentDragItemId: string | null = null;

export function setDragItemId(id: string | null): void {
  currentDragItemId = id;
}

export function getDragItemId(): string | null {
  return currentDragItemId;
}
