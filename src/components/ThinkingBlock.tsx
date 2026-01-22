/**
 * ThinkingBlock Component
 * Displays AI thinking process with collapsible UI
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import type { ThinkingBlock as ThinkingBlockType } from "@/lib/streaming-chat-types";

interface ThinkingBlockProps {
  thinking: ThinkingBlockType[];
}

export function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(thinking.map(t => t.id)));

  if (thinking.length === 0) return null;

  const toggleThinking = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {thinking.map((block) => {
        const isExpanded = expandedIds.has(block.id);

        return (
          <div
            key={block.id}
            className="border border-purple-200/40 bg-purple-50/30 dark:bg-purple-900/10 dark:border-purple-800/30 rounded-xl overflow-hidden animate-in fade-in duration-200"
          >
            <button
              onClick={() => toggleThinking(block.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              )}
              <Brain className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Thinking...
              </span>
              {!isExpanded && block.content && (
                <span className="text-xs text-purple-600/60 dark:text-purple-400/60 truncate flex-1 text-left">
                  {block.content.split("\n")[0]}
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 animate-in slide-in-from-top-2 duration-200">
                <pre className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {block.content || "..."}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
