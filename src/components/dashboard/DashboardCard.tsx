"use client";

import { type ReactNode } from "react";
import { GripVertical } from "lucide-react";

type Props = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  /** Spalten im 3-Spalten-Grid: 1 oder 2 (Kampagnen-Karten = 2) */
  colSpan?: 1 | 2;
  /** Wenn true: Drag-Handle oben rechts anzeigen, Card ist draggable */
  showDragHandle?: boolean;
  /** Für Drag-Events (wird an das äußere Element gebunden) */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  /** Verhindert Klicks im Inhalt beim Ziehen */
  pointerEventsNone?: boolean;
};

export function DashboardCard({
  title,
  icon,
  children,
  colSpan = 1,
  showDragHandle = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  pointerEventsNone = false,
}: Props) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`card-marble overflow-hidden transition-all min-w-0 w-full ${
        colSpan === 2 ? "col-span-2" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${
        isDragging ? "opacity-60 ring-2 ring-amber-400/50" : ""
      }`}
    >
      {/* Header: Icon + Titel (Serif) + optional Drag-Handle */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 text-amber-400/90 [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </span>
          <h2 className="font-cinzel font-bold text-lg text-white truncate">
            {title}
          </h2>
        </div>
        {showDragHandle && (
          <div
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:text-amber-400/80 cursor-grab active:cursor-grabbing"
            title="Karte verschieben"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <div className={`w-full ${pointerEventsNone ? "pointer-events-none" : ""}`}>
        {children}
      </div>
    </div>
  );
}
