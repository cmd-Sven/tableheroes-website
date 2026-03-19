"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownDisplayProps = {
  content: string;
  emptyMessage?: string;
  className?: string;
};

export function MarkdownDisplay({
  content,
  emptyMessage = "Keine Beschreibung vorhanden.",
  className = "",
}: MarkdownDisplayProps) {
  const text = (content || "").trim();

  if (!text) {
    return (
      <p className={`font-libre text-[#e5e5e5]/70 leading-relaxed italic ${className}`}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={`font-libre text-[#e5e5e5] leading-relaxed prose prose-invert max-w-none
        prose-p:my-2 prose-p:leading-relaxed
        prose-headings:font-barlow prose-headings:text-accent-blood prose-headings:border-b prose-headings:border-hero-border prose-headings:pb-2 prose-headings:mb-2 prose-headings:mt-4
        prose-h1:text-2xl prose-h1:font-semibold
        prose-h2:text-xl prose-h2:font-semibold
        prose-h3:text-lg prose-h3:font-medium prose-h3:text-accent-gold
        prose-strong:text-white prose-strong:font-bold
        prose-em:text-gray-300 prose-em:italic
        prose-ul:my-3 prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-1
        prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-1
        prose-blockquote:border-l-4 prose-blockquote:border-accent-gold prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-300 prose-blockquote:my-3
        prose-a:text-hero-vibrant prose-a:hover:underline
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
