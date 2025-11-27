'use client';

import * as React from 'react';

import { useTranslations } from 'next-intl';
import { useEditorRef, useEditorSelector } from 'platejs/react';
import { ChevronDown, Minus, Plus } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToolbarButton } from '@/components/ui/toolbar';
import { cn } from '@/lib/utils';

const fontSizes = [
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
  { label: '64', value: '64px' },
];

export function FontSizeToolbarButton() {
  const t = useTranslations('editor.toolbar');
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const savedSelectionRef = React.useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Get the current font size from marks
  const currentFontSize = useEditorSelector((editor) => {
    const marks = editor.api.marks();
    return (marks?.fontSize as string) || '16px';
  }, []);

  const currentLabel = currentFontSize.replace('px', '');

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
      editor.tf.addMarks({ fontSize: value });
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

  const adjustSize = (delta: number) => {
    const currentValue = parseInt(currentFontSize.replace('px', ''), 10) || 16;
    const newValue = Math.max(8, Math.min(128, currentValue + delta));
    if (editor.selection) {
      editor.tf.addMarks({ fontSize: `${newValue}px` });
    }
    editor.tf.focus();
  };

  return (
    <div className="flex items-center">
      <ToolbarButton
        tooltip={t('decreaseFontSize')}
        onClick={() => adjustSize(-2)}
        className="min-w-7 px-1"
      >
        <Minus className="size-3" />
      </ToolbarButton>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <ToolbarButton tooltip={t('fontSize')} className="min-w-12 justify-between px-1">
            <span className="text-xs tabular-nums">{currentLabel}</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </ToolbarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[80px] max-h-[300px] overflow-y-auto"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            editor.tf.focus();
          }}
        >
          {fontSizes.map((size) => {
            const isActive = currentFontSize === size.value;
            return (
              <DropdownMenuItem
                key={size.value}
                className={cn('justify-center tabular-nums', isActive && 'bg-accent')}
                onSelect={(e) => handleSelect(size.value, e)}
                onPointerDown={(e) => e.preventDefault()}
                tabIndex={-1}
              >
                {size.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarButton
        tooltip={t('increaseFontSize')}
        onClick={() => adjustSize(2)}
        className="min-w-7 px-1"
      >
        <Plus className="size-3" />
      </ToolbarButton>
    </div>
  );
}
