"use client";

import React from "react";

// Memoized Input-Komponenten, um Fokus-Verlust zu vermeiden
export const NameInput = React.memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
    placeholder="z.B. Garrik Stormwacht"
  />
));
NameInput.displayName = "NameInput";

export const RaceInput = React.memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
    placeholder="z.B. Mensch, Zwerg, Elf"
  />
));
RaceInput.displayName = "RaceInput";

export const RoleInput = React.memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
    placeholder="z.B. Schmied, Magister, Händler"
  />
));
RoleInput.displayName = "RoleInput";

export const BriefingTextarea = React.memo(({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={3}
    className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold resize-none"
    placeholder="z.B. goldgierig, lüstling, ehrgeizig, misstrauisch..."
  />
));
BriefingTextarea.displayName = "BriefingTextarea";


