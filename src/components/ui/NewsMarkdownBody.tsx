"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const proseNews =
  "font-libre text-gray-200 leading-relaxed prose prose-invert max-w-none " +
  "prose-p:my-2 prose-p:leading-relaxed " +
  "prose-headings:font-cinzel prose-headings:text-accent-gold prose-headings:font-bold " +
  "prose-h1:text-2xl prose-h1:mt-4 prose-h1:mb-3 " +
  "prose-h2:text-xl prose-h2:mt-4 prose-h2:mb-2 " +
  "prose-h3:text-lg prose-h3:mt-3 prose-h3:mb-2 " +
  "prose-strong:font-semibold prose-strong:text-white " +
  "prose-em:italic prose-em:text-gray-300 " +
  "prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-0.5 " +
  "prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5 " +
  "prose-blockquote:border-l-4 prose-blockquote:border-accent-gold/60 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-300 " +
  "prose-a:text-hero-vibrant prose-a:underline hover:prose-a:text-hero-vibrant/90";

type Props = {
  markdown: string;
  className?: string;
};

/** Einheitliche News-Darstellung (Landing, Dashboard, Admin-Vorschau). */
export function NewsMarkdownBody({ markdown, className = "" }: Props) {
  const text = markdown?.trim() ? markdown : "*Kein Inhalt.*";
  return (
    <div className={`${proseNews} ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</ReactMarkdown>
    </div>
  );
}
