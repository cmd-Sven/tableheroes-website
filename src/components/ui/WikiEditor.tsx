"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EditorContent, ReactRenderer, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension, markInputRule } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { Markdown } from "tiptap-markdown";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Pilcrow,
  Link2,
  ImageIcon,
  Undo,
  Redo,
  ChevronDown,
} from "lucide-react";
import { normalizeEscapedMarkdown } from "@/src/lib/markdown-normalize";
import type { EntityForMarkdownEditor } from "./MarkdownEditor";

export type WikiMentionEntity = {
  id: string;
  name: string;
  type: "npc" | "lore" | "faction";
  url: string;
};

type WikiMentionSuggestionItem = WikiMentionEntity & {
  label: string;
};

type WikiEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  minHeight?: string;
  placeholder?: string;
  entities?: EntityForMarkdownEditor[];
  mentionEntities?: WikiMentionEntity[];
  campaignId?: string | null;
  worldId?: string | null;
};

type MentionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

type MentionListProps = SuggestionProps<WikiMentionSuggestionItem, WikiMentionSuggestionItem>;

const ENTITY_TYPE_LABELS: Record<WikiMentionEntity["type"], string> = {
  npc: "NPC",
  lore: "Lore",
  faction: "Fraktion",
};

const MentionList = forwardRef<MentionListRef, MentionListProps>(function MentionList(
  props,
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (props.items.length === 0) return false;

      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="z-50 rounded-md bg-white px-3 py-2 font-barlow text-sm font-bold uppercase text-slate-500 shadow-xl">
        Keine Treffer
      </div>
    );
  }

  return (
    <div className="z-50 max-h-72 min-w-[260px] overflow-y-auto rounded-md bg-white py-1 shadow-xl ring-1 ring-black/10">
      {props.items.map((item, index) => (
        <button
          key={`${item.type}-${item.id}`}
          type="button"
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            index === selectedIndex ? "bg-hero-vibrant/15" : "hover:bg-slate-100"
          }`}
        >
          <span className="w-16 shrink-0 rounded bg-slate-900 px-2 py-0.5 text-center font-barlow text-[10px] font-bold uppercase text-accent-gold">
            {ENTITY_TYPE_LABELS[item.type]}
          </span>
          <span className="truncate font-libre text-sm text-slate-900">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
});

function escapeMarkdownLinkLabel(label: string): string {
  return label.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function escapeMarkdownLinkUrl(url: string): string {
  return url.replace(/\)/g, "%29").replace(/\s/g, "%20");
}

const WikiMention = Mention.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      url: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-url"),
        renderHTML: (attributes: { url?: string | null }) => {
          if (!attributes.url) return {};
          return { "data-url": attributes.url };
        },
      },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (content: string) => void }, node: { attrs: { label?: string | null; id?: string | null; url?: string | null } }) {
          const label = node.attrs.label ?? node.attrs.id ?? "";
          const url = node.attrs.url ?? "";

          if (!label || !url) {
            state.write(label);
            return;
          }

          state.write(`[${escapeMarkdownLinkLabel(label)}](${escapeMarkdownLinkUrl(url)})`);
        },
        parse: {
          // Mentions are stored as regular Markdown links, so parsing is handled by the link mark.
        },
      },
    };
  },
});

const WikiMarkdownInputRules = Extension.create({
  name: "wikiMarkdownInputRules",

  addInputRules() {
    const rules = [];
    const bold = this.editor.schema.marks.bold;
    const italic = this.editor.schema.marks.italic;

    if (bold) {
      rules.push(
        markInputRule({
          find: /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/,
          type: bold,
        }),
      );
    }

    if (italic) {
      rules.push(
        markInputRule({
          find: /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/,
          type: italic,
        }),
        markInputRule({
          find: /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/,
          type: italic,
        }),
      );
    }

    return rules;
  },
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getEditorMarkdown(editor: Editor): string {
  const markdown =
    (editor.storage as { markdown?: { getMarkdown?: () => string } }).markdown?.getMarkdown?.() ??
    "";
  return normalizeEscapedMarkdown(markdown);
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
  if (entity.type === "faction" && campaignId) {
    return `/dashboard/campaigns/${campaignId}/factions/${entity.id}`;
  }
  return null;
}

function ToolbarButton({
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
          : "text-gray-500 hover:bg-accent-gold/10 hover:text-accent-gold"
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function WikiEditorToolbar({
  editor,
  entities,
  campaignId,
  worldId,
}: {
  editor: Editor | null;
  entities: EntityForMarkdownEditor[];
  campaignId?: string | null;
  worldId?: string | null;
}) {
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL (https://…)", prev ?? "https://");
    if (url === null) return;

    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  const addImage = () => {
    const url = window.prompt("Bild-URL (nur http/https, z. B. aus der Medienverwaltung)");
    if (!url?.trim()) return;

    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      window.alert("Bitte eine vollständige URL mit http:// oder https:// angeben.");
      return;
    }
    editor.chain().focus().setImage({ src: trimmed, alt: "" }).run();
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
    <div className="flex flex-wrap items-center gap-0.5 border-b border-accent-gold/20 bg-black/20 px-2 py-2">
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph")}
        title="Absatz"
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Überschrift 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Überschrift 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Überschrift 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-accent-gold/20" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Fett"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Kursiv"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Aufzählung"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Nummerierte Liste"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Zitat"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-accent-gold/20" />

      <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link">
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Bild einfügen">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      {entities.length > 0 && (
        <div
          className="relative ml-1 flex items-center border-l border-accent-gold/20 pl-2"
          ref={pickerRef}
        >
          <button
            type="button"
            onClick={() => setShowEntityPicker((v) => !v)}
            title="Link zu Welt-Entität"
            className="flex items-center gap-0.5 rounded p-1.5 text-gray-500 hover:bg-accent-gold/10 hover:text-accent-gold"
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

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Rückgängig"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Wiederholen"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function WikiEditor({
  value,
  onChange,
  minHeight = "min-h-[300px]",
  placeholder = "Schreibe deinen Wiki-Text...",
  entities = [],
  mentionEntities = [],
  campaignId,
  worldId,
}: WikiEditorProps) {
  const lastValueRef = useRef(value);
  const mentionEntitiesRef = useRef(mentionEntities);

  useEffect(() => {
    mentionEntitiesRef.current = mentionEntities;
  }, [mentionEntities]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-hero-vibrant underline underline-offset-2",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md align-middle",
        },
      }),
      WikiMention.configure({
        renderText({ node, suggestion }) {
          return `${suggestion?.char ?? "@"}${node.attrs.label ?? node.attrs.id ?? ""}`;
        },
        renderHTML({ options, node }) {
          return [
            "span",
            {
              ...options.HTMLAttributes,
              class: "rounded bg-hero-vibrant/20 px-1 text-hero-vibrant",
            },
            `${node.attrs.label ?? node.attrs.id ?? ""}`,
          ];
        },
        suggestion: {
          char: "@",
          allowedPrefixes: null,
          items: ({ query }) => {
            const normalizedQuery = query.trim().toLowerCase();
            const items = mentionEntitiesRef.current
              .filter((item) =>
                item.name.toLowerCase().includes(normalizedQuery),
              )
              .map((item) => ({
                ...item,
                label: item.name,
              }))
              .slice(0, 8);
            console.log("Mention Query:", query, "Items:", items);
            return items;
          },
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            return $from.parent.type.name !== "codeBlock";
          },
          render: () => {
            let component: ReactRenderer<MentionListRef, MentionListProps> | null = null;
            let popup: TippyInstance | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer<MentionListRef, MentionListProps>(
                  MentionList,
                  {
                    props,
                    editor: props.editor,
                    className: "z-50",
                  },
                );

                const popupInstances = tippy("body", {
                  getReferenceClientRect: () =>
                    props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  maxWidth: "none",
                  zIndex: 9999,
                  hideOnClick: false,
                });
                popup = Array.isArray(popupInstances) ? popupInstances[0] : popupInstances;
              },
              onUpdate: (props) => {
                component?.updateProps(props);
                popup?.setProps({
                  getReferenceClientRect: () =>
                    props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
                });
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  popup?.hide();
                  return true;
                }

                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.destroy();
                component?.destroy();
                popup = null;
                component = null;
              },
            };
          },
        },
      }),
      WikiMarkdownInputRules,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${minHeight} w-full max-w-none px-4 py-3 font-libre text-sm leading-relaxed text-gray-200 outline-none prose prose-invert prose-headings:font-barlow prose-h1:text-hero-vibrant prose-h2:text-accent-blood prose-h3:text-accent-gold prose-a:text-hero-vibrant`,
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = getEditorMarkdown(editor);
      lastValueRef.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;

    lastValueRef.current = value;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded border border-hero-dark bg-slate-950 focus-within:border-hero-vibrant">
      <WikiEditorToolbar
        editor={editor}
        entities={entities}
        campaignId={campaignId}
        worldId={worldId}
      />
      <EditorContent editor={editor} />
    </div>
  );
}
