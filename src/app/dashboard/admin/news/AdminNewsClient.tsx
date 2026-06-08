"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createNewsPost,
  updateNewsPost,
  deleteNewsPost,
  sendNewsPostToDiscord,
} from "@/src/lib/actions/news-actions";
import {
  NEWS_CATEGORIES,
  type NewsPost,
  type NewsPostInsert,
} from "@/src/lib/constants/news";
import {
  Trash2,
  Edit,
  Loader2,
  AlertTriangle,
  Send,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Pilcrow,
  List,
} from "lucide-react";
import { NewsMarkdownBody } from "@/src/components/ui/NewsMarkdownBody";

const NEWS_IMAGE_BASE = "/images/news/";
const PLACEHOLDER_IMAGE = "/images/dark-marmor.jpg";

type Props = {
  initialPosts: NewsPost[];
  /** Dateinamen aus public/images/news/ für Dropdown */
  imageOptions: string[];
};

export function AdminNewsClient({ initialPosts, imageOptions = [] }: Props) {
  const router = useRouter();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [discordSendingId, setDiscordSendingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsPostInsert>({
    title: "",
    category: "Web-Update",
    content: "",
    image_url: "",
    is_published: false,
    show_on_dashboard: false,
    show_on_landingpage: false,
  });

  function resetForm() {
    setForm({
      title: "",
      category: "Web-Update",
      content: "",
      image_url: "",
      is_published: false,
      show_on_dashboard: false,
      show_on_landingpage: false,
    });
    setEditingId(null);
    setFormOpen(false);
  }

  /** Liefert den Dateinamen für die Select-Value (ohne Präfix), oder "" wenn keins. */
  function imageUrlToSelectValue(url: string | null | undefined): string {
    if (!url?.trim()) return "";
    if (url.startsWith(NEWS_IMAGE_BASE))
      return url.slice(NEWS_IMAGE_BASE.length);
    if (url.includes("/")) return ""; // externe URL, nicht im Dropdown
    return url;
  }

  function fillForm(post: NewsPost) {
    setForm({
      title: post.title,
      category: post.category,
      content: post.content ?? "",
      image_url: post.image_url ?? "",
      is_published: post.is_published ?? false,
      show_on_dashboard: post.show_on_dashboard ?? false,
      show_on_landingpage: post.show_on_landingpage ?? false,
    });
    setEditingId(post.id);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Titel eingeben.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const result = await updateNewsPost(editingId, form);
        if (result.success) {
          toast.success("News gespeichert.");
          if (result.discordWarning) {
            toast.warning(`Discord: ${result.discordWarning}`);
          }
          resetForm();
          router.refresh();
        } else toast.error(result.error);
      } else {
        const result = await createNewsPost(form);
        if (result.success) {
          toast.success("News erstellt.");
          if (result.discordWarning) {
            toast.warning(`Discord: ${result.discordWarning}`);
          }
          resetForm();
          router.refresh();
        } else toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSendDiscord(postId: string) {
    setDiscordSendingId(postId);
    try {
      const result = await sendNewsPostToDiscord(postId);
      if (result.success) toast.success("News an Discord gesendet.");
      else toast.error(result.error ?? "Discord-Versand fehlgeschlagen.");
    } finally {
      setDiscordSendingId(null);
    }
  }

  function wrapSelection(open: string, close: string, placeholder: string) {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = form.content ?? "";
    const hadSelection = start !== end;
    const inner = hadSelection ? v.slice(start, end) : placeholder;
    const next = v.slice(0, start) + open + inner + close + v.slice(end);
    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      const t = contentRef.current;
      if (!t) return;
      t.focus();
      if (hadSelection) {
        const caret = start + open.length + inner.length + close.length;
        t.setSelectionRange(caret, caret);
      } else {
        t.setSelectionRange(
          start + open.length,
          start + open.length + placeholder.length
        );
      }
    });
  }

  function insertHeading(prefix: "## " | "### ") {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = form.content ?? "";
    const placeholder =
      prefix === "## " ? "Zwischenüberschrift" : "Kleiner Abschnitt";
    const insertion = `${prefix}${placeholder}\n\n`;
    const next = v.slice(0, start) + insertion + v.slice(end);
    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      const t = contentRef.current;
      if (!t) return;
      t.focus();
      const s = start + prefix.length;
      t.setSelectionRange(s, s + placeholder.length);
    });
  }

  function insertParagraphBreak() {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = form.content ?? "";
    const next = v.slice(0, start) + "\n\n" + v.slice(end);
    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      const t = contentRef.current;
      if (!t) return;
      t.focus();
      const c = start + 2;
      t.setSelectionRange(c, c);
    });
  }

  function insertBulletLine() {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = form.content ?? "";
    const placeholder = "Listenpunkt";
    const insertion = `\n- ${placeholder}\n`;
    const next = v.slice(0, start) + insertion + v.slice(end);
    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      const t = contentRef.current;
      if (!t) return;
      t.focus();
      const lineStart = start + "\n- ".length;
      t.setSelectionRange(lineStart, lineStart + placeholder.length);
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteNewsPost(id);
      if (result.success) {
        toast.success("News gelöscht.");
        setConfirmDeleteId(null);
        router.refresh();
      } else toast.error(result.error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative rounded-lg border border-red-900/50 bg-background-card p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-950/50 border border-red-900/50">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-barlow font-bold text-lg text-white mb-2">
                  Beitrag unwiderruflich löschen?
                </h3>
                <p className="font-libre text-sm text-gray-400 leading-relaxed">
                  Willst du diesen News-Post wirklich löschen? Diese Aktion kann
                  nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded border border-red-900/50 bg-red-950/30 px-4 py-2 font-barlow font-bold uppercase text-sm text-red-400 hover:bg-red-950/50 transition-colors disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Löschen…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Löschen
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
                className="flex-1 rounded border border-hero-border bg-hero-dark/50 px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Neuen Post verfassen
        </h2>
        {!formOpen ? (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded border border-hero-border bg-hero-dark/50 px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
          >
            + Neuen Post verfassen
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
                Titel
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
                Kategorie
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
              >
                {NEWS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
                Inhalt
              </label>
              <p className="font-libre text-xs text-gray-500 leading-relaxed mb-2">
                Oben der <strong className="text-gray-400">Beitragstitel</strong> ist für Karten
                und Listen. Im Textfeld nutzt du{" "}
                <strong className="text-gray-400">Zwischenüberschriften</strong>,{" "}
                <strong className="text-gray-400">Fett</strong>,{" "}
                <strong className="text-gray-400">Kursiv</strong> und{" "}
                <strong className="text-gray-400">Absätze</strong> (Leerzeile oder Button).
                Einzelne Zeilenumbrüche werden als weicher Umbruch dargestellt.
              </p>
              <div className="flex flex-wrap gap-1.5 rounded border border-hero-border/60 bg-background-dark/80 p-2">
                <button
                  type="button"
                  onClick={() => wrapSelection("**", "**", "fetter Text")}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-slate-900 px-2 py-1.5 font-libre text-xs text-gray-200 hover:border-hero-vibrant/60 hover:text-white"
                  title="Fett (** … **)"
                >
                  <Bold className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Fett
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection("*", "*", "kursiver Text")}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-slate-900 px-2 py-1.5 font-libre text-xs text-gray-200 hover:border-hero-vibrant/60 hover:text-white"
                  title="Kursiv (* … *)"
                >
                  <Italic className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Kursiv
                </button>
                <button
                  type="button"
                  onClick={() => insertHeading("## ")}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-slate-900 px-2 py-1.5 font-libre text-xs text-gray-200 hover:border-hero-vibrant/60 hover:text-white"
                  title="Zwischenüberschrift (##)"
                >
                  <Heading2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Überschrift
                </button>
                <button
                  type="button"
                  onClick={() => insertHeading("### ")}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-slate-900 px-2 py-1.5 font-libre text-xs text-gray-200 hover:border-hero-vibrant/60 hover:text-white"
                  title="Kleiner Titel (###)"
                >
                  <Heading3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Titel klein
                </button>
                <button
                  type="button"
                  onClick={insertParagraphBreak}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-slate-900 px-2 py-1.5 font-libre text-xs text-gray-200 hover:border-hero-vibrant/60 hover:text-white"
                  title="Neuer Absatz (doppelte Leerzeile)"
                >
                  <Pilcrow className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Absatz
                </button>
                <button
                  type="button"
                  onClick={insertBulletLine}
                  className="inline-flex items-center gap-1 rounded border border-hero-border/50 bg-slate-900 px-2 py-1.5 font-libre text-xs text-gray-200 hover:border-hero-vibrant/60 hover:text-white"
                  title="Listenpunkt"
                >
                  <List className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Liste
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                <div className="min-w-0">
                  <span className="block font-barlow text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Bearbeiten
                  </span>
                  <textarea
                    ref={contentRef}
                    value={form.content ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, content: e.target.value }))
                    }
                    rows={14}
                    className="w-full min-h-[280px] rounded border border-hero-dark bg-slate-900 px-3 py-2 font-mono text-sm text-gray-100 focus:border-hero-vibrant outline-none resize-y"
                    spellCheck
                  />
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="block font-barlow text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Vorschau (wie auf der Seite)
                  </span>
                  <div className="flex-1 min-h-[200px] max-h-[min(70vh,26rem)] overflow-y-auto rounded border border-hero-border/50 bg-black/25 p-4">
                    {form.content?.trim() ? (
                      <NewsMarkdownBody markdown={form.content} />
                    ) : (
                      <p className="font-libre text-sm text-gray-500 italic leading-relaxed">
                        Vorschau erscheint hier, sobald du Inhalt einfügst.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
                Header-Bild
              </label>
              <select
                value={imageUrlToSelectValue(form.image_url)}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    image_url: v ? NEWS_IMAGE_BASE + v : "",
                  }));
                }}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
              >
                <option value="">Kein Bild</option>
                {imageOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {/* Live-Vorschau */}
              <div className="mt-2 rounded border border-hero-border/50 overflow-hidden bg-hero-dark/30 w-full max-w-lg aspect-square flex items-center justify-center relative">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Vorschau"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      const next = (e.target as HTMLImageElement)
                        .nextElementSibling;
                      if (next) (next as HTMLElement).style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full flex items-center justify-center absolute inset-0"
                  style={{
                    display: form.image_url ? "none" : "flex",
                  }}
                  aria-hidden
                >
                  <img
                    src={PLACEHOLDER_IMAGE}
                    alt=""
                    className="w-full h-full object-contain opacity-60"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published ?? false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_published: e.target.checked }))
                  }
                  className="rounded border-hero-border"
                />
                <span className="font-libre text-sm text-gray-300">
                  Veröffentlicht
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_on_dashboard ?? false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      show_on_dashboard: e.target.checked,
                    }))
                  }
                  className="rounded border-hero-border"
                />
                <span className="font-libre text-sm text-gray-300">
                  Auf Dashboard zeigen
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_on_landingpage ?? false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      show_on_landingpage: e.target.checked,
                    }))
                  }
                  className="rounded border-hero-border"
                />
                <span className="font-libre text-sm text-gray-300">
                  Auf Landingpage zeigen
                </span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
              >
                {saving
                  ? "Speichern…"
                  : editingId
                  ? "Aktualisieren"
                  : "Erstellen"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-hero-border bg-hero-dark/50 px-4 py-2 font-barlow font-bold uppercase text-sm text-gray-400 hover:text-white"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </section>

      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Alle News-Posts
        </h2>
        {initialPosts.length === 0 ? (
          <p className="font-libre text-gray-400">Noch keine Posts.</p>
        ) : (
          <ul className="space-y-3">
            {initialPosts.map((post) => (
              <li
                key={post.id}
                className="flex items-center justify-between gap-4 rounded border border-hero-border/50 bg-background-dark p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-cinzel font-bold text-hero-vibrant truncate">
                    {post.title}
                  </p>
                  <p className="font-barlow text-xs text-gray-500 uppercase mt-0.5">
                    {post.category}
                    {post.is_published ? " · Veröffentlicht" : " · Entwurf"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {post.is_published ? (
                    <button
                      type="button"
                      onClick={() => handleSendDiscord(post.id)}
                      disabled={!!discordSendingId || saving}
                      className="rounded p-2 text-[#aeb4ff] hover:bg-[#5865F2]/20 transition-colors disabled:opacity-50"
                      title="An Discord senden"
                    >
                      {discordSendingId === post.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => fillForm(post)}
                    disabled={saving}
                    className="rounded p-2 text-gray-400 hover:bg-hero-dark hover:text-accent-gold transition-colors disabled:opacity-50"
                    title="Bearbeiten"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(post.id)}
                    disabled={saving || !!deletingId}
                    className="rounded p-2 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Löschen"
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </>
  );
}
