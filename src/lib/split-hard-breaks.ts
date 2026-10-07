import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";

type Segment = { from: number; to: number };

function hardBreakSegments(block: ProseMirrorNode): Segment[] {
  const segments: Segment[] = [];
  let offset = 0;
  let segmentStart = 0;

  block.forEach((child) => {
    if (child.type.name === "hardBreak") {
      segments.push({ from: segmentStart, to: offset });
      offset += child.nodeSize;
      segmentStart = offset;
      return;
    }
    offset += child.nodeSize;
  });

  segments.push({ from: segmentStart, to: offset });
  return segments;
}

function blockHasHardBreak(block: ProseMirrorNode): boolean {
  let found = false;
  block.forEach((child) => {
    if (child.type.name === "hardBreak") found = true;
  });
  return found;
}

/**
 * Zerlegt Textblöcke in der Auswahl an harten Zeilenumbrüchen (`<br>`) in eigene Absätze.
 * Eine per Shift+Enter oder Markdown-`\` gesetzte Zeile kann danach einzeln zur Überschrift
 * oder zum Zitat werden. Gibt true zurück, wenn die Transaktion geändert wurde.
 */
export function splitHardBreaksInSelection(tr: Transaction): boolean {
  const { from, to } = tr.selection;
  const blocks: { pos: number; node: ProseMirrorNode }[] = [];

  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return;
    if (blockHasHardBreak(node)) blocks.push({ pos, node });
    return false;
  });

  if (blocks.length === 0) return false;

  let selectionFrom = from;
  let selectionTo = to;
  let shift = 0;

  for (const block of blocks) {
    const pos = block.pos + shift;
    const node = tr.doc.nodeAt(pos);
    if (!node || !node.isTextblock) continue;

    const segments = hardBreakSegments(node);
    if (segments.length <= 1) continue;

    const oldSize = node.nodeSize;
    const pieces = segments.map((segment) => {
      const content = node.content.cut(segment.from, segment.to);
      return content.size > 0
        ? node.type.create(node.attrs, content)
        : node.type.create(node.attrs);
    });
    const newSize = pieces.reduce((sum, piece) => sum + piece.nodeSize, 0);

    const contentStart = pos + 1;
    const relativeFrom = from + shift - contentStart;
    const relativeTo = to + shift - contentStart;
    let mappedFrom: number | null = null;
    let mappedTo: number | null = null;
    let cursor = pos;

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      const innerStart = cursor + 1;
      if (
        mappedFrom == null &&
        relativeFrom >= segment.from &&
        relativeFrom <= segment.to
      ) {
        mappedFrom = innerStart + (relativeFrom - segment.from);
      }
      if (relativeTo >= segment.from && relativeTo <= segment.to) {
        mappedTo = innerStart + (relativeTo - segment.from);
      }
      cursor += pieces[index].nodeSize;
    }

    tr.replaceWith(pos, pos + oldSize, pieces);

    if (mappedFrom != null) selectionFrom = mappedFrom;
    if (mappedTo != null) selectionTo = mappedTo;

    const delta = newSize - oldSize;
    if (selectionFrom >= pos + newSize) selectionFrom += delta;
    if (selectionTo >= pos + newSize) selectionTo += delta;
    shift += delta;
  }

  const max = tr.doc.content.size;
  const start = Math.max(0, Math.min(Math.min(selectionFrom, selectionTo), max));
  const end = Math.max(0, Math.min(Math.max(selectionFrom, selectionTo), max));
  tr.setSelection(TextSelection.between(tr.doc.resolve(start), tr.doc.resolve(end)));
  return true;
}
