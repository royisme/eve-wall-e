import { useState } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  return (
    <div className="flex-1 border rounded overflow-hidden flex flex-col">
      <div className="bg-muted p-2 border-b text-xs">Markdown Mode</div>
      <textarea
        className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
