"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Undo,
  Redo,
  Pencil,
  Save,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { updateCampaignDescription } from "@/src/app/dashboard/campaigns/[id]/actions";

type Props = {
  campaignId: string;
  initialContent: string;
};

/* ------------------------------------------------------------------ */
/* Toolbar Button                                                      */
/* ------------------------------------------------------------------ */
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
          : "text-gray-500 hover:text-accent-gold hover:bg-accent-gold/10"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */
function EditorToolbar({
  editor,
}: {
  editor: Editor | null;
}) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-accent-gold/20 bg-black/20 px-3 py-2">
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

      <div className="mx-1 h-5 w-px bg-accent-gold/20" />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        active={editor.isActive("heading", { level: 1 })}
        title="Überschrift 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive("heading", { level: 2 })}
        title="Überschrift 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-accent-gold/20" />

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

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */
export function CampaignDescriptionEditor({
  campaignId,
  initialContent,
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Hydration Guard: Editor erst nach Client-Mount initialisieren
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
    ],
    content: savedContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "campaign-description-editor min-h-[200px] max-h-[500px] overflow-y-auto px-4 py-3 font-libre text-gray-200 leading-relaxed outline-none focus:outline-none",
      },
    },
    editable: true,
  });

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
    setSuccessMsg(null);
    // Reset editor content to saved version
    editor?.commands.setContent(savedContent);
  }, [editor, savedContent]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setError(null);
    // Reset editor content
    editor?.commands.setContent(savedContent);
  }, [editor, savedContent]);

  const handleSave = useCallback(() => {
    if (!editor) return;

    const html = editor.getHTML();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await updateCampaignDescription(campaignId, html);
      if (result.success) {
        setSavedContent(html);
        setIsEditing(false);
        setSuccessMsg("Beschreibung gespeichert!");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(result.error ?? "Speichern fehlgeschlagen.");
      }
    });
  }, [editor, campaignId, startTransition]);

  // SSR-Fallback: Zeige statischen Content bis der Client gemountet ist
  if (!isMounted) {
    return (
      <div className="rounded-lg border border-hero-dark bg-background-card">
        <div className="flex items-center justify-between border-b border-hero-dark px-6 py-4">
          <h2 className="font-barlow font-bold text-xl text-white uppercase">
            Beschreibung
          </h2>
        </div>
        <div className="p-6">
          {savedContent && savedContent !== "<p></p>" ? (
            <div
              className="campaign-description-prose font-libre text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: savedContent }}
            />
          ) : (
            <p className="font-libre text-gray-500 italic">
              Keine Beschreibung vorhanden.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-hero-dark px-6 py-4">
        <h2 className="font-barlow font-bold text-xl text-white uppercase flex items-center gap-2">
          Beschreibung
        </h2>

        <div className="flex items-center gap-2">
          {successMsg && (
            <span className="inline-flex items-center gap-1 font-barlow text-xs text-hero-vibrant">
              <Check className="h-3.5 w-3.5" />
              {successMsg}
            </span>
          )}

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              disabled={!editor}
              className="inline-flex items-center gap-1.5 rounded border border-accent-gold/30 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-accent-gold hover:bg-accent-gold/20 transition-colors disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
              Bearbeiten
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded border border-gray-600 bg-gray-800 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !editor}
                className="inline-flex items-center gap-1.5 rounded border border-hero-border bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-dark transition-colors disabled:opacity-40"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Speichern
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 rounded border border-red-900/50 bg-red-950/20 px-3 py-2">
          <p className="font-barlow font-bold text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Editor / Read-Only View */}
      {isEditing ? (
        <div className="border border-accent-gold/20 rounded-b-lg mx-0 overflow-hidden">
          <EditorToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="p-6">
          {savedContent && savedContent !== "<p></p>" ? (
            <div
              className="campaign-description-prose font-libre text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: savedContent }}
            />
          ) : (
            <p className="font-libre text-gray-500 italic">
              Keine Beschreibung vorhanden. Klicke auf &quot;Bearbeiten&quot; um eine zu
              erstellen.
            </p>
          )}
        </div>
      )}

      {/* Scoped CSS for TipTap Editor + rendered content */}
      <style jsx global>{`
        /* ── Editor-Feld ── */
        .campaign-description-editor h1 {
          font-family: var(--font-cinzel), serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #cab926;
          margin: 1rem 0 0.5rem;
        }
        .campaign-description-editor h2 {
          font-family: var(--font-barlow), sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #58180d;
          margin: 0.75rem 0 0.5rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #23c763;
        }
        .campaign-description-editor p {
          margin: 0.5rem 0;
        }
        .campaign-description-editor ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .campaign-description-editor ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .campaign-description-editor li {
          margin: 0.25rem 0;
        }
        .campaign-description-editor strong,
        .campaign-description-editor b {
          font-weight: 700;
          color: #ffffff;
        }
        .campaign-description-editor em,
        .campaign-description-editor i {
          font-style: italic;
          color: #d1d5db;
        }

        /* ── Gerenderte Beschreibung (Read-Only) ── */
        .campaign-description-prose h1 {
          font-family: var(--font-cinzel), serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #cab926;
          margin: 1.5rem 0 0.75rem;
        }
        .campaign-description-prose h2 {
          font-family: var(--font-barlow), sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #58180d;
          margin: 1rem 0 0.5rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #23c763;
        }
        .campaign-description-prose p {
          margin: 0.5rem 0;
        }
        .campaign-description-prose ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .campaign-description-prose ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .campaign-description-prose li {
          margin: 0.25rem 0;
        }
        .campaign-description-prose strong,
        .campaign-description-prose b {
          font-weight: 700;
          color: #ffffff;
        }
        .campaign-description-prose em,
        .campaign-description-prose i {
          font-style: italic;
          color: #d1d5db;
        }
        .campaign-description-prose blockquote {
          border-left: 3px solid #cab926;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #9ca3af;
        }

        /* TipTap Fokus */
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: "Beschreibe dein Abenteuer...";
          float: left;
          color: #4b5563;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
