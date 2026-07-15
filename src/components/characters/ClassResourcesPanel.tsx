"use client";

import type { Dnd5eClassResource, Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import { updateClassResource } from "@/src/lib/characters/dnd5e/rest";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  sheet: Dnd5eSheetData;
  readOnly: boolean;
  onSheetChange: (sheet: Dnd5eSheetData) => void;
};

export function ClassResourcesPanel({ sheet, readOnly, onSheetChange }: Props) {
  const { t } = useCharacterSheetLocale();
  const resources = sheet.classResources ?? [];
  if (resources.length === 0) return null;

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-2">
      <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-2">
        {t("rest.classResources")}
      </h3>
      <div className="space-y-2">
        {resources.map((r) => (
          <ResourceRow
            key={r.id}
            resource={r}
            readOnly={readOnly}
            onChange={(current) =>
              onSheetChange(updateClassResource(sheet, r.id, current))
            }
          />
        ))}
      </div>
    </section>
  );
}

function ResourceRow({
  resource,
  readOnly,
  onChange,
}: {
  resource: Dnd5eClassResource;
  readOnly: boolean;
  onChange: (current: number) => void;
}) {
  const { t } = useCharacterSheetLocale();
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-barlow text-xs font-bold text-white truncate">{resource.label}</p>
        {resource.shortRest ? (
          <p className="font-libre text-[9px] text-gray-600">{t("rest.shortRestResource")}</p>
        ) : null}
      </div>
      {readOnly ? (
        <span className="font-barlow text-sm font-bold text-accent-gold">
          {resource.current}/{resource.max}
        </span>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(resource.current - 1)}
            className="h-6 w-6 rounded border border-hero-border text-gray-300 hover:bg-hero-dark"
          >
            −
          </button>
          <span className="w-10 text-center font-barlow text-sm text-white">
            {resource.current}/{resource.max}
          </span>
          <button
            type="button"
            onClick={() => onChange(resource.current + 1)}
            className="h-6 w-6 rounded border border-hero-border text-gray-300 hover:bg-hero-dark"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
