"use client";

import { useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  ChevronDown,
} from "lucide-react";
import type { EntityForMarkdownEditor } from "./MarkdownEditor";
import {
  DESCRIPTION_EDITOR_FONT_OPTIONS,
  DESCRIPTION_EDITOR_SIZE_OPTIONS,
} from "./description-editor-extensions";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEntityUrl(
  entity: EntityForMarkdownEditor,
  campaignId: string | null | undefined,
  worldId: string | null | undefined,
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

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-accent-gold/20 text-accent-gold"
          : "text-gray-500 hover:text-accent-gold hover:bg-accent-gold/10"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

type Props = {
  editor: Editor | null;
  entities?: EntityForMarkdownEditor[];
  campaignId?: string | null;
  worldId?: string | null;
};

export function DescriptionEditorToolbar({
  editor,
  entities = [],
  campaignId,
  worldId,
}: Props) {
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL (https://…)", prev ?? "https://");
    if (url === null) return;
    const t = url.trim();
    if (t === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: t }).run();
  };

  const addImage = () => {
    const url = window.prompt("Bild-URL (nur http/https, z. B. aus der Medienverwaltung)");
    if (!url?.trim()) return;
    const t = url.trim();
    if (!/^https?:\/\//i.test(t)) {
      window.alert("Bitte eine vollständige URL mit http:// oder https:// angeben.");
      return;
    }
    editor.chain().focus().setImage({ src: t, alt: "" }).run();
  };

  const insertEntityLink = (entity: EntityForMarkdownEditor) => {
    const url = buildEntityUrl(entity, campaignId, worldId);
    if (!url) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, "");
    const label = selected.trim() || entity.name;
    if (from === to) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${escapeHtml(label)}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowEntityPicker(false);
  };

  return (
    <div className="flex flex-col gap-2 border-b border-accent-gold/20 bg-black/20 px-2 py-2">
      <div className="flex flex-wrap items-center gap-0.5">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fett"
        >
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv"
        >
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Unterstrichen"
        >
          <Underline className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Durchgestrichen"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>

        <div className="mx-1 h-5 w-px bg-accent-gold/20" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Überschrift 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Überschrift 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Überschrift 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarBtn>

        <div className="mx-1 h-5 w-px bg-accent-gold/20" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Aufzählung"
        >
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Nummerierte Liste"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Zitat"
        >
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Trennlinie"
        >
          <Minus className="h-4 w-4" />
        </ToolbarBtn>

        <div className="mx-1 h-5 w-px bg-accent-gold/20" />

        <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link">
          <Link2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={addImage} title="Bild einfügen">
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>

        {entities.length > 0 && (
          <div className="relative flex items-center border-l border-accent-gold/20 pl-2 ml-1" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setShowEntityPicker((v) => !v)}
              title="Link zu Welt-Entität"
              className="flex items-center gap-0.5 rounded p-1.5 text-gray-500 hover:text-accent-gold hover:bg-accent-gold/10"
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
                <div className="absolute left-0 top-full z-20 mt-1 max-h-[240px] min-w-[220px] overflow-y-auto rounded border border-hero-dark bg-slate-900 py-1 shadow-lg">
                  <div className="border-b border-hero-dark px-3 py-1.5 font-barlow text-xs font-bold uppercase text-accent-gold">
                    Entität verlinken
                  </div>
                  {entities.map((entity) => {
                    const url = buildEntityUrl(entity, campaignId, worldId);
                    if (!url) return null;
                    return (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => insertEntityLink(entity)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left font-libre text-sm text-gray-200 hover:bg-hero-dark/50 hover:text-hero-vibrant"
                      >
                        <span className="w-14 shrink-0 font-barlow text-xs uppercase text-accent-gold/80">
                          {entity.type === "npc"
                            ? "NPC"
                            : entity.type === "location"
                              ? "Ort"
                              : "Fraktion"}
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

        <div className="mx-1 h-5 w-px bg-accent-gold/20" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Linksbündig"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Zentriert"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Rechtsbündig"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Blocksatz"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarBtn>

        <div className="mx-1 h-5 w-px bg-accent-gold/20" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Rückgängig"
        >
          <Undo className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Wiederholen"
        >
          <Redo className="h-4 w-4" />
        </ToolbarBtn>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-accent-gold/10 pt-2">
        <label className="flex items-center gap-2 font-barlow text-[10px] font-bold uppercase text-gray-500">
          Farbe
          <input
            type="color"
            className="h-7 w-10 cursor-pointer rounded border border-hero-border bg-slate-900"
            value={editor.getAttributes("textStyle").color || "#e5e5e5"}
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            title="Textfarbe"
          />
        </label>
        <button
          type="button"
          className="rounded border border-hero-border/60 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-400 hover:text-white"
          onClick={() => editor.chain().focus().unsetColor().run()}
        >
          Farbe zurück
        </button>

        <label className="flex items-center gap-1 font-barlow text-[10px] font-bold uppercase text-gray-500">
          Schrift
          <select
            className="max-w-[160px] rounded border border-hero-border bg-slate-900 px-2 py-1 font-libre text-xs text-gray-200"
            value={
              DESCRIPTION_EDITOR_FONT_OPTIONS.some(
                (f) => f.value === editor.getAttributes("textStyle").fontFamily,
              )
                ? editor.getAttributes("textStyle").fontFamily
                : ""
            }
            onChange={(e) => {
              const v = e.target.value;
              if (!v) editor.chain().focus().unsetFontFamily().run();
              else editor.chain().focus().setFontFamily(v).run();
            }}
          >
            <option value="">Standard</option>
            {DESCRIPTION_EDITOR_FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1 font-barlow text-[10px] font-bold uppercase text-gray-500">
          Größe
          <select
            className="rounded border border-hero-border bg-slate-900 px-2 py-1 font-libre text-xs text-gray-200"
            value={editor.getAttributes("textStyle").fontSize || ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) editor.chain().focus().unsetFontSize().run();
              else editor.chain().focus().setFontSize(v).run();
            }}
          >
            <option value="">Standard</option>
            {DESCRIPTION_EDITOR_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
