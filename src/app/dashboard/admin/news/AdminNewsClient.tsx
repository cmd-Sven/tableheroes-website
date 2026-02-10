"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createNewsPost,
  updateNewsPost,
  deleteNewsPost,
} from "@/src/lib/actions/news-actions";
import {
  NEWS_CATEGORIES,
  type NewsPost,
  type NewsPostInsert,
} from "@/src/lib/constants/news";
import { Trash2, Edit, X } from "lucide-react";

const NEWS_IMAGE_BASE = "/images/news/";
const PLACEHOLDER_IMAGE = "/images/dark-marmor.jpg";

type Props = {
  initialPosts: NewsPost[];
  /** Dateinamen aus public/images/news/ für Dropdown */
  imageOptions: string[];
};

export function AdminNewsClient({ initialPosts, imageOptions = [] }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
          resetForm();
          router.refresh();
        } else toast.error(result.error);
      } else {
        const result = await createNewsPost(form);
        if (result.success) {
          toast.success("News erstellt.");
          resetForm();
          router.refresh();
        } else toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Diesen News-Post wirklich löschen?")) return;
    setSaving(true);
    try {
      const result = await deleteNewsPost(id);
      if (result.success) {
        toast.success("News gelöscht.");
        router.refresh();
      } else toast.error(result.error);
    } finally {
      setSaving(false);
    }
  }

  return (
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
            <div>
              <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
                Inhalt (Markdown)
              </label>
              <textarea
                value={form.content ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={6}
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none resize-y"
              />
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
              <div className="mt-2 rounded border border-hero-border/50 overflow-hidden bg-hero-dark/30 w-full max-w-xs aspect-video flex items-center justify-center relative">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Vorschau"
                    className="w-full h-full object-cover"
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
                    className="w-full h-full object-cover opacity-60"
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
                className="flex items-center justify-between gap-4 rounded border border-hero-border/50 bg-background-dark/50 p-4"
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
                    onClick={() => handleDelete(post.id)}
                    disabled={saving}
                    className="rounded p-2 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
