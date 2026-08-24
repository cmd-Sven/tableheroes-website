/**
 * useLiveSessionBattlemapEntitySync — Syncs fog, effects, markers, traps, and props for battlemaps.
 */
"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listBattlemapFogShapes,
  listBattlemapEffectTemplates,
  listBattlemapMarkers,
} from "@/src/lib/actions/battlemap-actions";
import { listBattlemapTraps } from "@/src/lib/actions/battlemap-trap-actions";
import {
  mapBattlemapPropRow,
  mapBattlemapTrapRow,
  upsertBattlemapProp,
  upsertBattlemapTrap,
} from "@/src/lib/session/battlemap-realtime-map";
import { BATTLEMAP_MARKER_KINDS } from "@/src/lib/session/battlemap-types";
import type {
  BattlemapMarkerKind,
  SessionBattlemapEffectTemplate,
  SessionBattlemapFogShape,
  SessionBattlemapMarker,
} from "@/src/lib/session/battlemap-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";

type Params = {
  sessionId: string;
  isGuest: boolean;
  supabase: SupabaseClient;
  bm: LiveSessionBattlemapState;
};

export function useLiveSessionBattlemapEntitySync({
  sessionId,
  isGuest,
  supabase,
  bm,
}: Params) {
  const {
    activeBattlemapId,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
    setBattlemapMarkers,
    setSelectedMarkerId,
    setBattlemapTraps,
    setSelectedTrapId,
    setBattlemapProps,
  } = bm;

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapFogShapes([]);
      setSelectedFogShapeId(null);
      return;
    }
    let cancelled = false;

    async function loadFog() {
      try {
        const shapes = await listBattlemapFogShapes(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapFogShapes(shapes);
      } catch {
        if (!cancelled) setBattlemapFogShapes([]);
      }
    }

    void loadFog();

    const channel = supabase
      .channel(`session_battlemap_fog_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_fog_shapes",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapFogShapes((prev) => prev.filter((s) => s.id !== oldId));
              setSelectedFogShapeId((prev) => (prev === oldId ? null : prev));
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadFog();
            return;
          }
          const shape: SessionBattlemapFogShape = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: row.shape === "circle" ? "circle" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapFogShapes((prev) => {
            const idx = prev.findIndex((s) => s.id === shape.id);
            if (idx < 0) return [...prev, shape];
            const next = [...prev];
            next[idx] = shape;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase, setBattlemapFogShapes, setSelectedFogShapeId]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapEffectTemplates([]);
      setSelectedEffectTemplateId(null);
      return;
    }
    let cancelled = false;

    async function loadEffects() {
      try {
        const templates = await listBattlemapEffectTemplates(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapEffectTemplates(templates);
      } catch {
        if (!cancelled) setBattlemapEffectTemplates([]);
      }
    }

    void loadEffects();

    const channel = supabase
      .channel(`session_battlemap_effects_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_effect_templates",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapEffectTemplates((prev) => prev.filter((t) => t.id !== oldId));
              setSelectedEffectTemplateId((prev) => (prev === oldId ? null : prev));
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadEffects();
            return;
          }
          const shapeRaw = String(row.shape ?? "rect");
          const template: SessionBattlemapEffectTemplate = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            shape: shapeRaw === "circle" ? "circle" : shapeRaw === "cone" ? "cone" : "rect",
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            grid_w: Math.max(1, Math.round(Number(row.grid_w ?? 1))),
            grid_h: Math.max(1, Math.round(Number(row.grid_h ?? 1))),
            direction_deg: Math.round(Number(row.direction_deg ?? 0)) % 360,
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapEffectTemplates((prev) => {
            const idx = prev.findIndex((t) => t.id === template.id);
            if (idx < 0) return [...prev, template];
            const next = [...prev];
            next[idx] = template;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [
    activeBattlemapId,
    isGuest,
    sessionId,
    supabase,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
  ]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapMarkers([]);
      setSelectedMarkerId(null);
      return;
    }
    let cancelled = false;

    async function loadMarkers() {
      try {
        const list = await listBattlemapMarkers(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapMarkers(list);
      } catch {
        if (!cancelled) setBattlemapMarkers([]);
      }
    }

    void loadMarkers();

    const channel = supabase
      .channel(`session_battlemap_markers_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_markers",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          if (eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapMarkers((prev) => prev.filter((m) => m.id !== oldId));
              setSelectedMarkerId((prev) => (prev === oldId ? null : prev));
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadMarkers();
            return;
          }
          const kindRaw = String(row.kind ?? "fire");
          const kind: BattlemapMarkerKind = (
            BATTLEMAP_MARKER_KINDS as readonly string[]
          ).includes(kindRaw)
            ? (kindRaw as BattlemapMarkerKind)
            : "fire";
          const marker: SessionBattlemapMarker = {
            id: String(row.id),
            battlemap_id: String(row.battlemap_id),
            session_id: String(row.session_id),
            campaign_id: String(row.campaign_id),
            kind,
            grid_x: Math.round(Number(row.grid_x ?? 0)),
            grid_y: Math.round(Number(row.grid_y ?? 0)),
            is_visible_to_players: row.is_visible_to_players !== false,
            z_index: Math.round(Number(row.z_index ?? 0)),
          };
          setBattlemapMarkers((prev) => {
            const idx = prev.findIndex((m) => m.id === marker.id);
            if (idx < 0) return [...prev, marker];
            const next = [...prev];
            next[idx] = marker;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase, setBattlemapMarkers, setSelectedMarkerId]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapTraps([]);
      setSelectedTrapId(null);
      return;
    }
    let cancelled = false;

    async function loadTraps() {
      try {
        const list = await listBattlemapTraps(activeBattlemapId!, sessionId);
        if (!cancelled) setBattlemapTraps(list);
      } catch {
        if (!cancelled) setBattlemapTraps([]);
      }
    }

    void loadTraps();

    const channel = supabase
      .channel(`session_battlemap_traps_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_traps",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapTraps((prev) => prev.filter((t) => t.id !== oldId));
              setSelectedTrapId((prev) => (prev === oldId ? null : prev));
            } else {
              void loadTraps();
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadTraps();
            return;
          }
          const trap = mapBattlemapTrapRow(row);
          setBattlemapTraps((prev) => upsertBattlemapTrap(prev, trap));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, sessionId, supabase, setBattlemapTraps, setSelectedTrapId]);

  useEffect(() => {
    if (isGuest || !activeBattlemapId) {
      setBattlemapProps([]);
      return;
    }
    let cancelled = false;

    async function loadProps() {
      const { data, error } = await (supabase as any)
        .from("session_battlemap_props")
        .select("*")
        .eq("battlemap_id", activeBattlemapId)
        .order("z_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (!cancelled && !error) {
        setBattlemapProps(
          (data ?? []).map((row: Record<string, unknown>) => mapBattlemapPropRow(row)),
        );
      }
    }

    void loadProps();

    const channel = supabase
      .channel(`session_battlemap_props_${activeBattlemapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_battlemap_props",
          filter: `battlemap_id=eq.${activeBattlemapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            const oldId =
              payload.old && typeof payload.old === "object" && "id" in payload.old
                ? String((payload.old as { id: unknown }).id)
                : "";
            if (oldId) {
              setBattlemapProps((prev) => prev.filter((p) => p.id !== oldId));
            } else {
              void loadProps();
            }
            return;
          }
          const row = payload.new as Record<string, unknown> | null;
          if (!row?.id) {
            void loadProps();
            return;
          }
          const prop = mapBattlemapPropRow(row);
          setBattlemapProps((prev) => upsertBattlemapProp(prev, prop));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeBattlemapId, isGuest, supabase, setBattlemapProps]);
}
