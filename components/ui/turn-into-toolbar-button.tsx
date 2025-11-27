'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';
import { useEditorRef, useEditorSelector } from 'platejs/react';
import {
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToolbarButton } from '@/components/ui/toolbar';

export function TurnIntoToolbarButton() {
  const t = useTranslations('editor.toolbar');

  const turnIntoItems = [
    { icon: Pilcrow, label: t('paragraph'), value: 'p' },
    { icon: Heading1, label: t('heading1'), value: 'h1' },
    { icon: Heading2, label: t('heading2'), value: 'h2' },
    { icon: Heading3, label: t('heading3'), value: 'h3' },
    { icon: Quote, label: t('quote'), value: 'blockquote' },
  ];

  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const savedSelectionRef = React.useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Get the current block type
  const currentBlockType = useEditorSelector((editor) => {
    const block = editor.api.block();
    return block?.[0]?.type as string | undefined;
  }, []);

  const currentItem = turnIntoItems.find((item) => item.value === currentBlockType) || turnIntoItems[0];
  const CurrentIcon = currentItem.icon;

  // Save selection when dropdown opens
  React.useEffect(() => {
    if (open && editor.selection) {
      savedSelectionRef.current = editor.selection;
    }
  }, [open, editor]);

  const handleSelect = React.useCallback((value: string, event: Event) => {
    event.preventDefault();

    // Use saved selection or current selection
    const currentSelection = savedSelectionRef.current || editor.selection;

    if (currentSelection) {
      editor.tf.select(currentSelection);
    }

    if (value === 'blockquote') {
      // Toggle blockquote
      editor.tf.toggleBlock('blockquote');
    } else {
      // Set the block type
      editor.tf.setNodes({ type: value });
    }

    setOpen(false);

    // Restore selection and focus after a short delay to ensure DOM is updated
    setTimeout(() => {
      if (currentSelection) {
        editor.tf.select(currentSelection);
        editor.tf.focus();
      }
    }, 0);
  }, [editor]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip={t('turnInto')} className="min-w-[100px] justify-between">
          <CurrentIcon className="size-4" />
          <span className="text-xs">{currentItem.label}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[150px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.tf.focus();
        }}
      >
        {turnIntoItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentBlockType === item.value;
          return (
            <DropdownMenuItem
              key={item.value}
              className={isActive ? 'bg-accent' : ''}
              onSelect={(e) => handleSelect(item.value, e)}
              onPointerDown={(e) => e.preventDefault()}
              tabIndex={-1}
            >
              <Icon className="mr-2 size-4" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
