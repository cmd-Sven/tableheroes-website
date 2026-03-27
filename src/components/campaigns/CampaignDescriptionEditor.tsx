"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Pencil, Save, X, Loader2, Check } from "lucide-react";
import { updateCampaignDescription } from "@/src/app/dashboard/campaigns/[id]/actions";
import { descriptionEditorExtensions } from "@/src/components/ui/description-editor-extensions";
import { DescriptionEditorToolbar } from "@/src/components/ui/DescriptionEditorToolbar";

type Props = {
  campaignId: string;
  initialContent: string;
};

export function CampaignDescriptionEditor({ campaignId, initialContent }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: descriptionEditorExtensions,
    content: savedContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "campaign-description-editor min-h-[240px] max-h-[520px] overflow-y-auto px-4 py-3 font-libre text-gray-200 leading-relaxed outline-none focus:outline-none",
      },
    },
    editable: true,
  });

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
    setSuccessMsg(null);
    editor?.commands.setContent(savedContent);
  }, [editor, savedContent]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setError(null);
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

  if (!isMounted) {
    return (
      <div className="rounded-lg border border-hero-dark bg-background-card">
        <div className="flex items-center justify-between border-b border-hero-dark px-6 py-4">
          <h2 className="font-barlow font-bold text-xl text-white uppercase">Beschreibung</h2>
        </div>
        <div className="p-6">
          {savedContent && savedContent !== "<p></p>" ? (
            <div
              className="campaign-description-prose font-libre text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: savedContent }}
            />
          ) : (
            <p className="font-libre text-gray-500 italic">Keine Beschreibung vorhanden.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card">
      <div className="flex items-center justify-between border-b border-hero-dark px-6 py-4">
        <h2 className="font-barlow font-bold text-xl text-white uppercase">Beschreibung</h2>

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
              className="inline-flex items-center gap-1.5 rounded border border-accent-gold/30 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:opacity-40"
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
                className="inline-flex items-center gap-1.5 rounded border border-gray-600 bg-gray-800 px-3 py-1.5 font-barlow font-bold uppercase text-xs text-gray-400 transition-colors hover:text-white disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !editor}
                className="inline-flex items-center gap-1.5 rounded border border-hero-border bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-xs text-white transition-colors hover:bg-hero-dark disabled:opacity-40"
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

      {error && (
        <div className="mx-6 mt-4 rounded border border-red-900/50 bg-red-950/20 px-3 py-2">
          <p className="font-barlow text-xs font-bold text-red-400">{error}</p>
        </div>
      )}

      {isEditing ? (
        <div className="mx-0 overflow-hidden rounded-b-lg border border-accent-gold/20">
          <DescriptionEditorToolbar editor={editor} />
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
              Keine Beschreibung vorhanden. Klicke auf &quot;Bearbeiten&quot;, um eine zu erstellen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
