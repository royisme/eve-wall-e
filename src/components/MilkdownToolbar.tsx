import React from "react";
import { useInstance } from "@milkdown/react";
import { commandsCtx, CmdKey } from "@milkdown/core";
import { 
  toggleStrongCommand, 
  toggleEmphasisCommand, 
  wrapInBulletListCommand, 
  wrapInOrderedListCommand,
  wrapInBlockquoteCommand
} from "@milkdown/preset-commonmark";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function MilkdownToolbar() {
  const [loading, getEditor] = useInstance();

  const call = <T,>(command: { key: CmdKey<T> }) => {
    if (loading) return;
    getEditor().action((ctx) => ctx.get(commandsCtx).call(command.key));
  };

  return (
    <div className="flex items-center gap-1 border-b bg-muted/20 p-1" role="toolbar" aria-label="Formatting">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => call(toggleStrongCommand)}
        aria-label="Bold"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => call(toggleEmphasisCommand)}
        aria-label="Italic"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <div className="mx-1 h-4 w-px bg-border/50" aria-hidden="true" />
      
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => call(wrapInBulletListCommand)}
        aria-label="Bullet List"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => call(wrapInOrderedListCommand)}
        aria-label="Ordered List"
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => call(wrapInBlockquoteCommand)}
        aria-label="Quote"
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
    </div>
  );
}
