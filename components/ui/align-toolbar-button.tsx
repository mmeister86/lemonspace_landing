"use client";

import * as React from "react";

import { useTranslations } from "next-intl";
import { useEditorRef, useEditorSelector } from "platejs/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToolbarButton } from "@/components/ui/toolbar";

export function AlignToolbarButton() {
  const t = useTranslations("editor.toolbar");

  const alignItems = [
    { icon: AlignLeft, label: t("alignLeft"), value: "left" },
    { icon: AlignCenter, label: t("alignCenter"), value: "center" },
    { icon: AlignRight, label: t("alignRight"), value: "right" },
    { icon: AlignJustify, label: t("alignJustify"), value: "justify" },
  ] as const;
  type AlignmentValue = (typeof alignItems)[number]["value"];

  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const savedSelectionRef = React.useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Get the current alignment
  const currentAlign = useEditorSelector((editor) => {
    const block = editor.api.block();
    return (block?.[0] as { align?: string })?.align || "left";
  }, []);

  const currentItem =
    alignItems.find((item) => item.value === currentAlign) || alignItems[0];
  const CurrentIcon = currentItem.icon;

  // Save selection when dropdown opens
  React.useEffect(() => {
    if (open && editor.selection) {
      savedSelectionRef.current = editor.selection;
    }
  }, [open, editor]);

  const handleSelect = React.useCallback(
    (value: AlignmentValue, event: Event) => {
      event.preventDefault();

      const currentSelection = savedSelectionRef.current || editor.selection;

      if (!currentSelection) {
        return;
      }

      editor.tf.select(currentSelection);

      if (typeof editor.tf.textAlign?.setNodes === "function") {
        editor.tf.textAlign.setNodes(value as never);
      } else {
        editor.tf.setNodes({ align: value });
      }

      setOpen(false);

      setTimeout(() => {
        editor.tf.select(currentSelection);
        editor.tf.focus();
      }, 0);
    },
    [editor]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip={t("align")} className="min-w-9">
          <CurrentIcon className="size-4" />
          <ChevronDown className="size-3 text-muted-foreground" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[120px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.tf.focus();
        }}
      >
        {alignItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentAlign === item.value;
          return (
            <DropdownMenuItem
              key={item.value}
              className={isActive ? "bg-accent" : ""}
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
