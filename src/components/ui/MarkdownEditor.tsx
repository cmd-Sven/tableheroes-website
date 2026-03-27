"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Link2,
  ChevronDown,
  Strikethrough,
  Image as ImageIcon,
  Minus,
} from "lucide-react";

export type EntityForMarkdownEditor = {
  id: string;
  name: string;
  type: "npc" | "location" | "faction";
};

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  entities?: EntityForMarkdownEditor[];
  campaignId?: string | null;
  worldId?: string | null;
};

function buildEntityUrl(
  entity: EntityForMarkdownEditor,
  campaignId: string | null | undefined,
  worldId: string | null | undefined
): string | null {
  if (entity.type === "npc") {
    if (campaignId) return `/dashboard/campaigns/${campaignId}/npcs/${entity.id}`;
    if (worldId) return `/dashboard/worlds/${worldId}/npcs/${entity.id}`;
  }
  if (entity.type === "location") {
    if (campaignId) return `/dashboard/campaigns/${campaignId}/lore/${entity.id}`;
    if (worldId) return `/dashboard/worlds/${worldId}/lore/${entity.id}`;
  }
  if (entity.type === "faction") {
    if (campaignId) return `/dashboard/campaigns/${campaignId}/factions/${entity.id}`;
  }
  return null;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string = "Text"
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);

  const newText = selected
    ? `${before}${prefix}${selected}${suffix}${after}`
    : `${before}${prefix}${placeholder}${suffix}${after}`;

  const newCursor = selected
    ? start + prefix.length + selected.length + suffix.length
    : start + prefix.length + placeholder.length + suffix.length;

  textarea.focus();
  textarea.setSelectionRange(newCursor, newCursor);
  return newText;
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  text: string
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const newText = `${before}${text}${after}`;
  const newCursor = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(newCursor, newCursor);
  return newText;
}

function insertAtLineStart(textarea: HTMLTextAreaElement, prefix: string): string {
  const start = textarea.selectionStart;
  const lines = textarea.value.split("\n");
  let pos = 0;
  let lineIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (pos + lines[i].length >= start) {
      lineIndex = i;
      break;
    }
    pos += lines[i].length + 1;
  }
  lines[lineIndex] = prefix + lines[lineIndex];
  const newText = lines.join("\n");
  textarea.setSelectionRange(start + prefix.length, start + prefix.length);
  textarea.focus();
  return newText;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder =
    "Beschreibung… Leerzeile = neuer Absatz. Einmal Enter = Zeilenumbruch. Markdown: **fett**, *kursiv*, ~~durchgestrichen~~, # Überschrift, > Zitat, ![Alt](https://…), --- für Linie.",
  minHeight = "min-h-[400px]",
  className = "",
  entities = [],
  campaignId,
  worldId,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleToolbar = (action: (ta: HTMLTextAreaElement) => string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const newVal = action(ta);
    onChange(newVal);
  };

  const handleInsertEntityLink = (entity: EntityForMarkdownEditor) => {
    const url = buildEntityUrl(entity, campaignId, worldId);
    if (!url) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    const displayText = selected.trim() || entity.name;
    const markdown = `[${displayText}](${url})`;
    onChange(insertAtCursor(ta, markdown));
    setShowEntityPicker(false);
  };

  const insertImageMarkdown = (ta: HTMLTextAreaElement): string => {
    const url = window.prompt("Bild-URL (https://…)", "https://");
    if (!url?.trim()) return ta.value;
    const alt = window.prompt("Bildbeschreibung (Alt-Text)", "Bild") || "Bild";
    return insertAtCursor(ta, `![${alt}](${url.trim()})`);
  };

  const buttons: { icon: typeof Bold; title: string; action: (ta: HTMLTextAreaElement) => string }[] = [
    { icon: Bold, title: "Fett", action: (ta) => wrapSelection(ta, "**", "**", "fett") },
    { icon: Italic, title: "Kursiv", action: (ta) => wrapSelection(ta, "*", "*", "kursiv") },
    {
      icon: Strikethrough,
      title: "Durchgestrichen",
      action: (ta) => wrapSelection(ta, "~~", "~~", "text"),
    },
    { icon: List, title: "Aufzählung", action: (ta) => insertAtLineStart(ta, "- ") },
    { icon: ListOrdered, title: "Nummerierte Liste", action: (ta) => insertAtLineStart(ta, "1. ") },
    { icon: Heading1, title: "Überschrift 1", action: (ta) => insertAtLineStart(ta, "# ") },
    { icon: Heading2, title: "Überschrift 2", action: (ta) => insertAtLineStart(ta, "## ") },
    { icon: Heading3, title: "Überschrift 3", action: (ta) => insertAtLineStart(ta, "### ") },
    { icon: Quote, title: "Zitat", action: (ta) => insertAtLineStart(ta, "> ") },
    {
      icon: Minus,
      title: "Horizontale Linie",
      action: (ta) => insertAtCursor(ta, "\n\n---\n\n"),
    },
    { icon: ImageIcon, title: "Bild einfügen (Markdown)", action: insertImageMarkdown },
  ];

  return (
    <div className={`rounded border border-hero-dark overflow-hidden bg-slate-900/50 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-hero-dark bg-slate-900/80">
        {buttons.map(({ icon: Icon, title, action }) => (
          <button
            key={title}
            type="button"
            onClick={() => handleToolbar(action)}
            title={title}
            className="p-2 rounded text-gray-400 hover:text-accent-gold hover:bg-hero-dark/50 transition-colors"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        {entities.length > 0 && (
          <div className="relative flex items-center border-l border-hero-dark pl-2 ml-1" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setShowEntityPicker((v) => !v)}
              title="Link zu Entität einfügen"
              className="p-2 rounded text-gray-400 hover:text-accent-gold hover:bg-hero-dark/50 transition-colors flex items-center gap-1"
            >
              <Link2 className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </button>
            {showEntityPicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEntityPicker(false)}
                  aria-hidden
                />
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[220px] max-h-[280px] overflow-y-auto rounded border border-hero-dark bg-slate-900 shadow-lg py-1">
                  <div className="px-3 py-1.5 text-xs font-barlow font-bold uppercase text-accent-gold border-b border-hero-dark">
                    Entität verlinken
                  </div>
                  {entities.map((entity) => {
                    const url = buildEntityUrl(entity, campaignId, worldId);
                    if (!url) return null;
                    return (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => handleInsertEntityLink(entity)}
                        className="w-full px-3 py-2 text-left text-sm font-libre text-gray-200 hover:bg-hero-dark/50 hover:text-hero-vibrant transition-colors flex items-center gap-2"
                      >
                        <span className="text-accent-gold/80 text-xs font-barlow uppercase w-14 shrink-0">
                          {entity.type === "npc" ? "NPC" : entity.type === "location" ? "Ort" : "Fraktion"}
                        </span>
                        <span className="truncate">{entity.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full resize-y p-4 font-libre text-[#e5e5e5] leading-relaxed outline-none focus:ring-1 focus:ring-hero-vibrant bg-transparent ${minHeight}`}
      />
    </div>
  );
}
