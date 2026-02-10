"use client";

import { useState, useCallback } from "react";
import { GripVertical, Save, X, Plus } from "lucide-react";
import { updateDashboardLayout } from "@/src/app/dashboard/dashboard-actions";
import { DashboardCard } from "@/src/components/dashboard/DashboardCard";
import {
  type LayoutItem,
  flowLayoutFromOrder,
  moveCard,
  getCardAt,
  getCardAtCell,
  getGridRows,
  getAllSlotPositions,
  normalizeLayout,
  isNewLayoutFormat,
} from "@/src/lib/utils/layout-engine";

export const DEFAULT_CARD_ORDER = [
  "points",
  "achievements",
  "my-campaigns",
  "heroes",
  "inbox",
  "news",
  "lore-snippet",
  "daily-comic",
];

export type CardItem = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  /** 1 = eine Spalte, 2 = zwei Spalten (immer für Meine/Offene Kampagnen) */
  colSpan?: 1 | 2;
};

type Props = {
  cards: CardItem[];
  /** Altes Format: string[] (Reihenfolge) oder neues Format: LayoutItem[] */
  initialLayout: LayoutItem[] | string[] | undefined;
  onSaveLayout?: (layout: LayoutItem[]) => Promise<void>;
  readOnly?: boolean;
};

/** Ghost-Slot: leerer Platz im Bearbeitungsmodus, dient als Drop-Zone. Zeigt bei Drop-Target eine halbtransparente Vorschau. */
function GhostSlot({
  row,
  col,
  isDropTarget,
  previewTitle,
  onDragOver,
  onDrop,
}: {
  row: number;
  col: number;
  isDropTarget: boolean;
  previewTitle?: string;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`min-h-[120px] rounded-md border-2 border-dashed flex items-center justify-center transition-all ${
        isDropTarget
          ? "border-hero-vibrant bg-hero-vibrant/10 shadow-[0_0_24px_rgba(55,152,6,0.3)]"
          : "border-amber-400/20 bg-white/2 hover:border-amber-400/30"
      }`}
    >
      {isDropTarget && previewTitle ? (
        <span className="font-cinzel font-bold text-sm text-hero-vibrant/70 px-3 py-2 rounded bg-black/30">
          {previewTitle}
        </span>
      ) : (
        <Plus className="h-8 w-8 text-amber-400/40" aria-hidden />
      )}
    </div>
  );
}

function normalizeInitialLayout(
  raw: LayoutItem[] | string[] | undefined,
  cards: CardItem[],
  defaultOrder: string[]
): LayoutItem[] {
  if (!raw || (Array.isArray(raw) && raw.length === 0)) {
    const order = defaultOrder.filter((id) => cards.some((c) => c.id === id));
    const missing = cards.map((c) => c.id).filter((id) => !order.includes(id));
    const fullOrder = [...order, ...missing];
    const widths: Record<string, 1 | 2> = {};
    cards.forEach((c) => {
      widths[c.id] = (c.colSpan ?? 1) as 1 | 2;
    });
    return flowLayoutFromOrder(fullOrder, widths);
  }
  if (isNewLayoutFormat(raw)) {
    const valid = (raw as LayoutItem[]).filter((item) =>
      cards.some((c) => c.id === item.id)
    );
    const knownIds = new Set(cards.map((c) => c.id));
    const haveIds = new Set(valid.map((i) => i.id));
    const missing = cards.filter((c) => !haveIds.has(c.id));
    const widths: Record<string, 1 | 2> = {};
    cards.forEach((c) => {
      widths[c.id] = (c.colSpan ?? 1) as 1 | 2;
    });
    if (missing.length === 0) return normalizeLayout(valid);
    const occupied = new Set<string>();
    valid.forEach((item) => {
      occupied.add(`${item.y_pos},${item.x_pos}`);
      if (item.width === 2) occupied.add(`${item.y_pos},${item.x_pos + 1}`);
    });
    const appended: LayoutItem[] = [];
    for (const c of missing) {
      const w = widths[c.id] ?? 1;
      let placed = false;
      for (let r = 0; r < 3 && !placed; r++) {
        for (let c2 = 0; c2 <= 3 - w && !placed; c2++) {
          const keys =
            w === 2 ? [`${r},${c2}`, `${r},${c2 + 1}`] : [`${r},${c2}`];
          if (keys.every((k) => !occupied.has(k))) {
            appended.push({ id: c.id, x_pos: c2, y_pos: r, width: w });
            keys.forEach((k) => occupied.add(k));
            placed = true;
          }
        }
      }
    }
    return normalizeLayout([...valid, ...appended]);
  }
  const order = (raw as string[]).filter(
    (id) => id !== "open-campaigns" && cards.some((c) => c.id === id)
  );
  const missing = cards.map((c) => c.id).filter((id) => !order.includes(id));
  const fullOrder = [...order, ...missing];
  const widths: Record<string, 1 | 2> = {};
  cards.forEach((c) => {
    widths[c.id] = (c.colSpan ?? 1) as 1 | 2;
  });
  return flowLayoutFromOrder(fullOrder, widths);
}

export function DraggableCardGrid({
  cards,
  initialLayout,
  onSaveLayout,
  readOnly = false,
}: Props) {
  const widths: Record<string, 1 | 2> = {};
  cards.forEach((c) => {
    widths[c.id] = (c.colSpan ?? 1) as 1 | 2;
  });

  const [layout, setLayout] = useState<LayoutItem[]>(() =>
    normalizeInitialLayout(initialLayout, cards, DEFAULT_CARD_ORDER)
  );
  const [editMode, setEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = getGridRows(layout);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.setData("application/json", JSON.stringify({ id }));
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!editMode || !draggedId) return;
      setDropTarget({ row, col });
    },
    [editMode, draggedId]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, row: number, col: number) => {
      e.preventDefault();
      setDraggedId(null);
      setDropTarget(null);
      const id = e.dataTransfer.getData("text/plain");
      if (!id || !widths[id]) return;
      setLayout((prev) => {
        const next = moveCard(prev, id, row, col, widths);
        return normalizeLayout(next);
      });
    },
    [widths]
  );

  const handleDropOnCard = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setDraggedId(null);
      setDropTarget(null);
      const id = e.dataTransfer.getData("text/plain");
      if (!id || id === targetId) return;
      const target = layout.find((i) => i.id === targetId);
      if (!target) return;
      setLayout((prev) => {
        const next = moveCard(prev, id, target.y_pos, target.x_pos, widths);
        return normalizeLayout(next);
      });
    },
    [layout, widths]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTarget(null);
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const saveFn = onSaveLayout ?? updateDashboardLayout;
      await saveFn(layout);
      setEditMode(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  }, [layout, onSaveLayout]);

  if (readOnly) {
    const flat: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const card = getCardAt(layout, r, c);
        if (card) {
          const meta = cards.find((x) => x.id === card.id);
          if (meta) {
            flat.push(
              <DashboardCard
                key={card.id}
                title={meta.title}
                icon={meta.icon}
                colSpan={card.width}
              >
                {meta.content}
              </DashboardCard>
            );
          }
          if (card.width === 2) {
            flat.push(<div key={`pad-${r}-${c + 1}`} />);
            c++;
          }
        } else if (getCardAtCell(layout, r, c)) {
          flat.push(<div key={`pad-${r}-${c}`} />);
        } else {
          flat.push(<div key={`e-${r}-${c}`} />);
        }
      }
    }
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{flat}</div>;
  }

  const slotPositions = getAllSlotPositions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        {!editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/50 px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-300 hover:bg-hero-dark transition-colors"
          >
            <GripVertical className="h-4 w-4" />
            Layout bearbeiten
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/30 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark/50 px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
              Abbrechen
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="font-libre text-sm text-red-400 rounded border border-red-800 bg-red-950/30 px-3 py-2">
          {error}
        </p>
      )}
      <div
        className="grid grid-cols-3 gap-6 relative"
        style={{
          gridTemplateRows: "repeat(3, minmax(140px, auto))",
        }}
        onDragLeave={handleDragLeave}
      >
        {editMode &&
          slotPositions.map(({ row: r, col: c }) => {
            const isTarget = dropTarget?.row === r && dropTarget?.col === c;
            return (
              <div
                key={`ghost-${r}-${c}`}
                className="min-h-[120px]"
                style={{
                  gridColumn: c + 1,
                  gridRow: r + 1,
                }}
              >
                <GhostSlot
                  row={r}
                  col={c}
                  isDropTarget={isTarget}
                  previewTitle={
                    isTarget && draggedId
                      ? cards.find((x) => x.id === draggedId)?.title
                      : undefined
                  }
                  onDragOver={(e) => handleDragOver(e, r, c)}
                  onDrop={(e) => handleDrop(e, r, c)}
                />
              </div>
            );
          })}
        {layout.map((card) => {
          const meta = cards.find((x) => x.id === card.id);
          if (!meta) return null;
          return (
            <div
              key={card.id}
              className="min-h-0"
              style={{
                gridColumn: `${card.x_pos + 1} / span ${card.width}`,
                gridRow: card.y_pos + 1,
              }}
            >
              <DashboardCard
                title={meta.title}
                icon={meta.icon}
                colSpan={card.width}
                showDragHandle={editMode}
                draggable={editMode}
                onDragStart={(e) => handleDragStart(e, card.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (editMode)
                    setDropTarget({ row: card.y_pos, col: card.x_pos });
                }}
                onDrop={(e) => handleDropOnCard(e, card.id)}
                onDragEnd={handleDragEnd}
                isDragging={draggedId === card.id}
                pointerEventsNone={editMode}
              >
                {meta.content}
              </DashboardCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
