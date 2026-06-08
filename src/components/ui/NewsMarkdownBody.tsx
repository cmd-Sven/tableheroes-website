"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { prepareNewsMarkdown } from "@/src/lib/markdown-normalize";

type Props = {
  markdown: string;
  className?: string;
};

/** Einheitliche News-Darstellung (Landing, Dashboard, Admin-Vorschau). */
export function NewsMarkdownBody({ markdown, className = "" }: Props) {
  const text = prepareNewsMarkdown(markdown || "") || "*Kein Inhalt.*";

  return (
    <div className={`news-markdown-body ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => {
            if (!href) return <>{children}</>;
            if (href.startsWith("/")) {
              return (
                <Link href={href} className="text-hero-vibrant underline hover:text-hero-vibrant/90">
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-hero-vibrant underline hover:text-hero-vibrant/90"
              >
                {children}
              </a>
            );
          },
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
