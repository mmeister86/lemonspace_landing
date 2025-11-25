import { Block } from "@/lib/types/board";
import { TextBlock } from "./TextBlock";
import { GridBlock } from "./GridBlock";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface BlockRendererProps {
  block: Block;
  isSelected?: boolean;
  isPreviewMode?: boolean;
}

export function BlockRenderer({
  block,
  isSelected,
  isPreviewMode = false,
}: BlockRendererProps) {
  // Gemeinsames Wrapper-Styling
  const wrapperClass = cn(
    !isPreviewMode &&
      "p-4 border rounded-lg bg-background relative cursor-pointer transition-all",
    !isPreviewMode &&
      isSelected &&
      "ring-2 ring-primary ring-offset-2 border-primary"
  );

  switch (block.type) {
    case "grid":
      return (
        <GridBlock
          block={block}
          isSelected={isSelected}
          isPreviewMode={isPreviewMode}
        />
      );

    case "text":
      return (
        <TextBlock
          block={block}
          isSelected={isSelected}
          isPreviewMode={isPreviewMode}
        />
      );

    case "heading":
      return (
        <div data-block-id={block.id} className={wrapperClass}>
          <h1
            className={cn(
              "font-bold",
              `text-${(block.data.level as number) || 2}xl`
            )}
          >
            {block.data.content as string}
          </h1>
        </div>
      );

    case "button":
      return (
        <div data-block-id={block.id} className={wrapperClass}>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            {(block.data.text as string) || "Button"}
          </button>
        </div>
      );

    case "image":
      return (
        <div data-block-id={block.id} className={wrapperClass}>
          <Image
            src={block.data.src as string}
            alt={(block.data.alt as string) || ""}
            width={500}
            height={300}
            className="w-full h-auto"
          />
        </div>
      );

    // ... weitere Block-Typen

    default:
      return (
        <div data-block-id={block.id} className={wrapperClass}>
          <div className="text-sm font-medium mb-2">Block: {block.type}</div>
          <div className="text-xs text-muted-foreground">ID: {block.id}</div>
        </div>
      );
  }
}
