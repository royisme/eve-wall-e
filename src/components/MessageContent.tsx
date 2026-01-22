/**
 * MessageContent Component
 * Renders chat message content with Markdown, code highlighting, and sanitization
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function MessageContent({ content, isStreaming, className }: MessageContentProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom rendering for code blocks
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-[0.85em] font-mono border border-border/50"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group my-4">
                {language && (
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground/60 font-mono uppercase">
                    {language}
                  </div>
                )}
                <pre className="overflow-x-auto p-4 rounded-lg bg-muted/50 border border-border/40">
                  <code className={cn("text-sm font-mono", className)} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },

          // Custom rendering for blockquotes
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-4 border-primary/40 pl-4 py-2 my-4 italic text-muted-foreground bg-muted/30 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            );
          },

          // Custom rendering for links
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                {...props}
              >
                {children}
              </a>
            );
          },

          // Custom rendering for lists
          ul({ children, ...props }) {
            return (
              <ul className="list-disc list-inside space-y-1 my-3" {...props}>
                {children}
              </ul>
            );
          },

          ol({ children, ...props }) {
            return (
              <ol className="list-decimal list-inside space-y-1 my-3" {...props}>
                {children}
              </ol>
            );
          },

          // Custom rendering for headings
          h1({ children, ...props }) {
            return (
              <h1 className="text-xl font-bold mt-6 mb-3 pb-2 border-b border-border" {...props}>
                {children}
              </h1>
            );
          },

          h2({ children, ...props }) {
            return (
              <h2 className="text-lg font-bold mt-5 mb-2" {...props}>
                {children}
              </h2>
            );
          },

          h3({ children, ...props }) {
            return (
              <h3 className="text-base font-semibold mt-4 mb-2" {...props}>
                {children}
              </h3>
            );
          },

          // Custom rendering for tables
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border" {...props}>
                  {children}
                </table>
              </div>
            );
          },

          th({ children, ...props }) {
            return (
              <th
                className="border border-border bg-muted px-3 py-2 text-left font-semibold"
                {...props}
              >
                {children}
              </th>
            );
          },

          td({ children, ...props }) {
            return (
              <td className="border border-border px-3 py-2" {...props}>
                {children}
              </td>
            );
          },

          // Custom rendering for paragraphs
          p({ children, ...props }) {
            return (
              <p className="my-2 leading-relaxed" {...props}>
                {children}
              </p>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-primary/60 ml-1 animate-pulse" />
      )}
    </div>
  );
}
