"use client";

import { createEditor } from "prosekit/core";
import { ProseKit } from "prosekit/react";
import { Block } from "@/lib/types/board";
import { useMemo, useEffect, useState } from "react";
import { EditorToolbar } from "../blocks/EditorToolbar";
import { defineExtension } from "../blocks/editor-extension";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface TextPropertiesProps {
  block: Block;
}

export function TextProperties({ block: blockProp }: TextPropertiesProps) {
  // Read block directly from store to ensure we always have the latest version
  const storeBlock = useCanvasStore(
    (state) => state.blocks.find((b) => b.id === blockProp.id) || blockProp
  );
  const block = storeBlock;
  const updateBlock = useCanvasStore((state) => state.updateBlock);
  const t = useTranslations("propertiesPanel");
  const [isSaving, setIsSaving] = useState(false);

  const extension = useMemo(() => {
    return defineExtension();
  }, []);

  const editor = useMemo(() => {
    return createEditor({
      extension,
      defaultContent: (block.data.content as string) || undefined,
    });
  }, [extension, block.id]); // Nur block.id als Dependency, nicht block.data.content

  // Update editor content when block.data.content changes externally (but not on initial mount)
  useEffect(() => {
    // Skip if this is the initial render (editor was just created with defaultContent)
    const currentContent = editor.getDocJSON();
    const blockContent = block.data.content;

    // Only update if content actually changed
    if (
      blockContent &&
      JSON.stringify(currentContent) !== JSON.stringify(blockContent)
    ) {
      try {
        editor.setDocJSON(blockContent);
      } catch (error) {
        // Fallback: If content is a string, try to set it as plain text
        if (typeof blockContent === "string") {
          editor.commands.insertText(blockContent);
        }
      }
    }
  }, [editor, block.data.content]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      const json = editor.getDocJSON();
      updateBlock(block.id, {
        data: {
          ...block.data,
          content: json,
        },
      });
    } catch (error) {
      console.error("Error saving text content:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProseKit editor={editor}>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("content")}</label>
        <div className="border rounded-md bg-background flex flex-col overflow-hidden min-h-[200px]">
          <EditorToolbar blockId={block.id} />
          <div className="prose dark:prose-invert max-w-none flex-1 overflow-y-auto p-4">
            <div
              ref={editor.mount}
              className={cn("min-h-[150px] h-full outline-none")}
              contentEditable={true}
            />
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-2"
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </ProseKit>
  );
}
