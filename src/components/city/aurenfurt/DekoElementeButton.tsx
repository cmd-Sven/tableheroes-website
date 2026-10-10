"use client";

import { motion } from "framer-motion";
import { Trash2, Trees } from "lucide-react";
import {
  DECO_CATALOG,
  DECO_ROTATION_MAX,
  DECO_ROTATION_MIN,
  DECO_ROTATION_STEP,
  DECO_SCALE_MAX,
  DECO_SCALE_MIN,
  DECO_SCALE_STEP,
  decoDisplayName,
  decoModelByKey,
} from "./aurenfurt-deco-catalog";
import { useAurenfurtDeco } from "./AurenfurtDecoProvider";

export function DekoElementeButton() {
  const deco = useAurenfurtDeco();

  if (!deco.isGm) return null;

  const selected = deco.items.find((item) => item.id === deco.selectedId) ?? null;
  const placingModel = deco.placingKey ? decoModelByKey(deco.placingKey) : null;

  return (
    <div className="pointer-events-auto flex w-full max-w-sm flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={deco.panelOpen}
        aria-pressed={deco.panelOpen}
        onClick={deco.togglePanel}
        className={`inline-flex items-center gap-2 border px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide shadow-lg ${
          deco.panelOpen
            ? "border-accent-gold bg-hero-dark text-hero-vibrant"
            : "border-hero-dark bg-hero-dark/95 text-accent-gold hover:bg-background-card"
        }`}
      >
        <Trees className="h-4 w-4 shrink-0" aria-hidden />
        Deko Elemente
      </button>
      {deco.saveError || deco.modelError ? (
        <p className="font-libre text-xs leading-relaxed text-red-300" role="alert">
          {deco.saveError ?? deco.modelError}
        </p>
      ) : null}
      {deco.panelOpen ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full rounded-md border border-hero-dark bg-background-card p-4 shadow-lg"
        >
          <h3 className="font-cinzel text-base font-bold text-accent-gold">Deko Elemente</h3>
          <p className="mt-1 font-libre text-xs leading-relaxed text-gray-200">
            {placingModel
              ? `Klicke auf die Karte, um die ${placingModel.name} zu setzen.`
              : "Wähle ein Modell und setze es auf die Karte. Ein Klick auf ein gesetztes Exemplar ändert es."}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {DECO_CATALOG.map((model) => {
              const active = deco.placingKey === model.key;
              return (
                <li key={model.key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => deco.startPlace(model.key)}
                    className={`w-full border px-3 py-2 text-left font-barlow text-xs font-bold uppercase tracking-wide ${
                      active
                        ? "border-accent-gold bg-hero-dark text-hero-vibrant"
                        : "border-hero-dark bg-background-dark text-accent-gold hover:border-hero-border"
                    }`}
                  >
                    {model.name}
                  </button>
                </li>
              );
            })}
          </ul>
          {deco.items.length > 0 ? (
            <div className="mt-4">
              <p className="font-barlow text-xs font-bold uppercase tracking-wide text-gray-200">Gesetzt</p>
              <ul className="mt-2 flex flex-col gap-1">
                {deco.items.map((item) => {
                  const active = item.id === deco.selectedId;
                  const siblings = deco.items.filter((entry) => entry.modelKey === item.modelKey);
                  const number = siblings.findIndex((entry) => entry.id === item.id) + 1;
                  const label = siblings.length > 1 ? `${decoDisplayName(item)} ${number}` : decoDisplayName(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => deco.select(active ? null : item.id)}
                        className={`w-full px-2 py-1 text-left font-libre text-sm ${
                          active ? "text-accent-gold" : "text-gray-200 hover:text-accent-gold"
                        }`}
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {selected ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-hero-dark pt-3">
              <p className="font-libre text-xs leading-relaxed text-gray-200">
                Ziehen verschiebt {decoDisplayName(selected)}. Die Drehung läuft um die Hochachse.
              </p>
              <label className="flex flex-col gap-1 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
                Größe
                <input
                  type="range"
                  min={DECO_SCALE_MIN}
                  max={DECO_SCALE_MAX}
                  step={DECO_SCALE_STEP}
                  value={selected.scale}
                  onChange={(event) => deco.setScale(selected.id, Number(event.target.value))}
                  onPointerUp={() => deco.commitMove(selected.id)}
                  onBlur={() => deco.commitMove(selected.id)}
                />
              </label>
              <label className="flex flex-col gap-1 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
                Drehung
                <input
                  type="range"
                  min={DECO_ROTATION_MIN}
                  max={DECO_ROTATION_MAX}
                  step={DECO_ROTATION_STEP}
                  value={selected.rotation}
                  onChange={(event) => deco.setRotation(selected.id, Number(event.target.value))}
                  onPointerUp={() => deco.commitMove(selected.id)}
                  onBlur={() => deco.commitMove(selected.id)}
                />
              </label>
              <button
                type="button"
                onClick={() => deco.remove(selected.id)}
                className="inline-flex items-center gap-2 self-start border border-hero-dark bg-background-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold hover:border-accent-gold"
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                Löschen
              </button>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
