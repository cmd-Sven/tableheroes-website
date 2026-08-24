/**
 * LiveSessionCharacterAvatarActionList — Scrollable action list in radial panels.
 */
"use client";

export function LiveSessionCharacterAvatarActionList({
  items,
  empty,
  pending,
}: {
  items: { id: string; label: string; onClick: () => void; disabled?: boolean }[];
  empty: string;
  pending: boolean;
}) {
  if (items.length === 0) {
    return <p className="font-libre text-xs text-gray-500 italic">{empty}</p>;
  }
  return (
    <ul className="max-h-40 space-y-1 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={pending || item.disabled}
            onClick={item.onClick}
            className="w-full rounded border border-hero-border/40 px-2 py-1.5 text-left font-libre text-xs text-gray-200 hover:bg-hero-dark/50 disabled:opacity-40"
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
