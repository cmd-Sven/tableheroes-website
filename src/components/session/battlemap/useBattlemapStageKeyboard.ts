/**
 * useBattlemapStageKeyboard — Escape/space-pan and Delete shortcuts for battlemap tools and placement.
 */
"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { isEditableKeyboardTarget } from "./battlemap-stage-utils";

type FogDraft = {
  shape: "rect" | "circle";
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
} | null;

type EffectDraft = {
  shape: "rect" | "circle" | "cone";
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  directionDeg?: number;
} | null;

type Args = {
  placementActive: boolean;
  shapeDrawActive: boolean;
  markerPlaceActive: boolean;
  trapPlaceActive: boolean;
  disableSpacePan: boolean;
  fogDrawActive: boolean;
  effectDrawActive: boolean;
  fogDraft: FogDraft;
  effectDraft: EffectDraft;
  fogDrawOriginRef: MutableRefObject<{ x: number; y: number } | null>;
  effectDrawOriginRef: MutableRefObject<{ x: number; y: number } | null>;
  setFogDraft: Dispatch<SetStateAction<FogDraft>>;
  setEffectDraft: Dispatch<SetStateAction<EffectDraft>>;
  setSpacePanHeld: Dispatch<SetStateAction<boolean>>;
  onCancelPlacement?: () => void;
  onFogToolCancel?: () => void;
  onEffectToolCancel?: () => void;
  onMarkerToolCancel?: () => void;
  onTrapToolCancel?: () => void;
  isGm: boolean;
  selectedFogShapeId: string | null;
  selectedEffectTemplateId: string | null;
  selectedMarkerId: string | null;
  onFogShapeDelete?: (shapeId: string) => void;
  onEffectTemplateDelete?: (templateId: string) => void;
  onMarkerDelete?: (markerId: string) => void;
};

export function useBattlemapStageKeyboard({
  placementActive,
  shapeDrawActive,
  markerPlaceActive,
  trapPlaceActive,
  disableSpacePan,
  fogDrawActive,
  effectDrawActive,
  fogDraft,
  effectDraft,
  fogDrawOriginRef,
  effectDrawOriginRef,
  setFogDraft,
  setEffectDraft,
  setSpacePanHeld,
  onCancelPlacement,
  onFogToolCancel,
  onEffectToolCancel,
  onMarkerToolCancel,
  onTrapToolCancel,
  isGm,
  selectedFogShapeId,
  selectedEffectTemplateId,
  selectedMarkerId,
  onFogShapeDelete,
  onEffectTemplateDelete,
  onMarkerDelete,
}: Args) {
  useEffect(() => {
    if (!placementActive && !shapeDrawActive && !markerPlaceActive && !trapPlaceActive)
      return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (fogDrawActive) {
          if (fogDraft || fogDrawOriginRef.current) {
            setFogDraft(null);
            fogDrawOriginRef.current = null;
            return;
          }
          onFogToolCancel?.();
          return;
        }
        if (effectDrawActive) {
          if (effectDraft || effectDrawOriginRef.current) {
            setEffectDraft(null);
            effectDrawOriginRef.current = null;
            return;
          }
          onEffectToolCancel?.();
          return;
        }
        if (markerPlaceActive) {
          onMarkerToolCancel?.();
          return;
        }
        if (trapPlaceActive) {
          onTrapToolCancel?.();
          return;
        }
        onCancelPlacement?.();
        return;
      }
      if (e.key === " " || e.code === "Space") {
        if (disableSpacePan || isEditableKeyboardTarget(e.target)) return;
        e.preventDefault();
        setSpacePanHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " " || e.code === "Space") {
        setSpacePanHeld(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      setSpacePanHeld(false);
    };
  }, [
    placementActive,
    shapeDrawActive,
    markerPlaceActive,
    trapPlaceActive,
    disableSpacePan,
    fogDrawActive,
    effectDrawActive,
    fogDraft,
    effectDraft,
    fogDrawOriginRef,
    effectDrawOriginRef,
    setFogDraft,
    setEffectDraft,
    setSpacePanHeld,
    onCancelPlacement,
    onFogToolCancel,
    onEffectToolCancel,
    onMarkerToolCancel,
    onTrapToolCancel,
  ]);

  useEffect(() => {
    if (!isGm || !selectedFogShapeId || !onFogShapeDelete) return;
    const shapeId = selectedFogShapeId;
    const deleteFn = onFogShapeDelete;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      deleteFn(shapeId);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGm, onFogShapeDelete, selectedFogShapeId]);

  useEffect(() => {
    if (!isGm || !selectedEffectTemplateId || !onEffectTemplateDelete) return;
    const templateId = selectedEffectTemplateId;
    const deleteFn = onEffectTemplateDelete;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      deleteFn(templateId);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGm, onEffectTemplateDelete, selectedEffectTemplateId]);

  useEffect(() => {
    if (!isGm || !selectedMarkerId || !onMarkerDelete) return;
    const markerId = selectedMarkerId;
    const deleteFn = onMarkerDelete;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      deleteFn(markerId);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGm, onMarkerDelete, selectedMarkerId]);
}
