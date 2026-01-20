import React, { useMemo, useEffect } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/kit/plugin/history';
import { cursor } from '@milkdown/kit/plugin/cursor';
import debounce from 'lodash.debounce';

import "@/milkdown.css";
import { MilkdownToolbar } from './MilkdownToolbar';

interface MilkdownEditorProps {
  initialValue: string;
  onChange: (markdown: string) => void;
  className?: string;
  readOnly?: boolean;
}

function MilkdownEditorInner({ initialValue, onChange, readOnly }: MilkdownEditorProps) {
  const debouncedChange = useMemo(
    () => debounce((markdown: string) => {
      onChange(markdown);
    }, 500),
    [onChange]
  );

  useEffect(() => {
    return () => {
      debouncedChange.cancel();
    };
  }, [debouncedChange]);

  useEditor((root) => 
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValue);
        
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          debouncedChange(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(history)
      .use(cursor)
      .use(listener),
    []
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border bg-background">
      {!readOnly && <MilkdownToolbar />}
      <div className={`flex-1 overflow-auto ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
        <Milkdown />
      </div>
    </div>
  );
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <div className={`milkdown-container h-full w-full ${props.className || ''}`}>
      <MilkdownProvider>
        <MilkdownEditorInner {...props} />
      </MilkdownProvider>
    </div>
  );
}
