/**
 * useBattlemapDrawSync — Der Stift des Spielleiters auf der Schlachtkarte.
 * Strokes laden, Realtime-Patches (INSERT/DELETE statt Full-Reload) und Undo/Clear —
 * damit die Tinte bei allen am Tisch gleichzeitig trocknet, ohne die Runde zu fluten.
 */
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { toast } from "sonner";
import {
  clearMapDrawStrokes,
  createMapDrawStroke,
  listMapDrawStrokes,
  undoLastMapDrawStroke,
} from "@/src/lib/actions/map-draw-actions";
import {
  normalizeMapDrawStroke,
  type MapDrawPoint,
  type SessionMapDrawStroke,
} from "@/src/lib/session/map-draw-types";

type Params = {
  sessionId: string;
  activeBattlemapId: string | null;
  activeWorldMapId: string | null;
  isGM: boolean;
  drawColor: string;
  drawWidth: number;
  drawUndoReq: number;
  drawClearReq: number;
  setDrawStrokeCount: React.Dispatch<React.SetStateAction<number>>;
  /** Outer transition from the board (optimistic GM drawing). */
  startTransition: (fn: () => void | Promise<void>) => void;
};

function applyDrawStrokeRow(
  prev: SessionMapDrawStroke[],
  row: Record<string, unknown>,
): SessionMapDrawStroke[] {
  const stroke = normalizeMapDrawStroke(row);
  const idx = prev.findIndex((s) => s.id === stroke.id);
  if (idx < 0) return [...prev, stroke];
  const next = [...prev];
  next[idx] = stroke;
  return next;
}

export function useBattlemapDrawSync({
  sessionId,
  activeBattlemapId,
  activeWorldMapId,
  isGM,
  drawColor,
  drawWidth,
  drawUndoReq,
  drawClearReq,
  setDrawStrokeCount,
  startTransition,
}: Params) {
  const [drawStrokes, setDrawStrokes] = useState<SessionMapDrawStroke[]>([]);
  const [, localStart] = useTransition();
  const supabase = useRef(createClient()).current;
  const syncCountRef = useRef(setDrawStrokeCount);
  syncCountRef.current = setDrawStrokeCount;

  const reloadDraw = useCallback(async () => {
    if (!activeBattlemapId) {
      setDrawStrokes([]);
      if (!activeWorldMapId) syncCountRef.current(0);
      return;
    }
    try {
      const list = await listMapDrawStrokes({
        sessionId,
        battlemapId: activeBattlemapId,
      });
      setDrawStrokes(list);
      if (!activeWorldMapId) syncCountRef.current(list.length);
    } catch {
      setDrawStrokes([]);
    }
  }, [activeBattlemapId, activeWorldMapId, sessionId]);

  useEffect(() => {
    void reloadDraw();
  }, [reloadDraw]);

  useEffect(() => {
    if (!activeBattlemapId || activeWorldMapId) return;

    const channel = supabase
      .channel(`session_battlemap_draw_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_map_draw_strokes",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "INSERT" || eventType === "UPDATE") {
            const row = payload.new as Record<string, unknown> | null;
            if (!row?.id) {
              void reloadDraw();
              return;
            }
            setDrawStrokes((prev) => {
              const next = applyDrawStrokeRow(prev, row);
              if (!activeWorldMapId) {
                queueMicrotask(() => syncCountRef.current(next.length));
              }
              return next;
            });
            return;
          }
          if (eventType === "DELETE") {
            const row = payload.old as Record<string, unknown> | null;
            const id = row?.id != null ? String(row.id) : null;
            if (!id) {
              void reloadDraw();
              return;
            }
            setDrawStrokes((prev) => {
              const next = prev.filter((s) => s.id !== id);
              if (!activeWorldMapId) {
                queueMicrotask(() => syncCountRef.current(next.length));
              }
              return next;
            });
            return;
          }
          void reloadDraw();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, activeWorldMapId, supabase, reloadDraw]);

  useEffect(() => {
    if (!isGM || activeWorldMapId || drawUndoReq <= 0 || !activeBattlemapId) return;
    localStart(async () => {
      try {
        const id = await undoLastMapDrawStroke({
          sessionId,
          battlemapId: activeBattlemapId,
        });
        if (!id) {
          toast.message("Keine Zeichnung zum Rückgängigmachen.");
          return;
        }
        setDrawStrokes((prev) => {
          const next = prev.filter((s) => s.id !== id);
          queueMicrotask(() => syncCountRef.current(next.length));
          return next;
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rückgängig fehlgeschlagen.");
      }
    });
  }, [drawUndoReq, isGM, activeWorldMapId, activeBattlemapId, sessionId]);

  useEffect(() => {
    if (!isGM || activeWorldMapId || drawClearReq <= 0 || !activeBattlemapId) return;
    localStart(async () => {
      try {
        await clearMapDrawStrokes({ sessionId, battlemapId: activeBattlemapId });
        setDrawStrokes([]);
        syncCountRef.current(0);
        toast.success("Alle Zeichnungen gelöscht.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }, [drawClearReq, isGM, activeWorldMapId, activeBattlemapId, sessionId]);

  const handleDrawStroke = useCallback(
    (points: MapDrawPoint[]) => {
      if (!activeBattlemapId || !isGM) return;
      startTransition(async () => {
        try {
          const created = await createMapDrawStroke({
            sessionId,
            battlemapId: activeBattlemapId,
            color: drawColor,
            strokeWidth: drawWidth,
            points,
          });
          setDrawStrokes((prev) => {
            if (prev.some((s) => s.id === created.id)) return prev;
            return [...prev, created];
          });
          syncCountRef.current((n) => n + 1);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Zeichnen fehlgeschlagen.");
        }
      });
    },
    [activeBattlemapId, isGM, startTransition, sessionId, drawColor, drawWidth],
  );

  return { drawStrokes, handleDrawStroke };
}
