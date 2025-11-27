"use client";

import { useTranslations } from "next-intl";
import { useEditorRef, useEditorSelector } from "platejs/react";
import { Indent, Outdent } from "lucide-react";

import { ToolbarButton } from "@/components/ui/toolbar";

function runWithSelection(
  editor: ReturnType<typeof useEditorRef>,
  callback: () => void
) {
  const currentSelection = editor.selection;
  if (!currentSelection) {
    return;
  }

  editor.tf.select(currentSelection);
  callback();
  editor.tf.focus();
}

export function IndentToolbarButton() {
  const t = useTranslations("editor.toolbar");
  const editor = useEditorRef();

  const handleIndent = () => {
    runWithSelection(editor, () => {
      if (typeof editor.tf.indent === "function") {
        editor.tf.indent();
        return;
      }

      const block = editor.api.block();
      if (block) {
        const currentIndent = (block[0] as { indent?: number }).indent || 0;
        editor.tf.setNodes({ indent: Math.min(currentIndent + 1, 10) });
      }
    });
  };

  return (
    <ToolbarButton tooltip={t("indent")} onClick={handleIndent}>
      <Indent className="size-4" />
    </ToolbarButton>
  );
}

export function OutdentToolbarButton() {
  const t = useTranslations("editor.toolbar");
  const editor = useEditorRef();

  const currentIndent = useEditorSelector((editor) => {
    const block = editor.api.block();
    return (block?.[0] as { indent?: number })?.indent || 0;
  }, []);

  const handleOutdent = () => {
    runWithSelection(editor, () => {
      if (typeof editor.tf.outdent === "function") {
        editor.tf.outdent();
        return;
      }

      const block = editor.api.block();
      if (block) {
        const blockIndent = (block[0] as { indent?: number }).indent || 0;
        if (blockIndent > 0) {
          editor.tf.setNodes({ indent: blockIndent - 1 });
        }
      }
    });
  };

  return (
    <ToolbarButton
      tooltip={t("outdent")}
      onClick={handleOutdent}
      disabled={currentIndent === 0}
    >
      <Outdent className="size-4" />
    </ToolbarButton>
  );
}
