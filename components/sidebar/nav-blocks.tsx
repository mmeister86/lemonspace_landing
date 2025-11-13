"use client";

import { useDraggable } from "@dnd-kit/core";
import { Type } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface DraggableBlockItemProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  blockType: string;
  blockData?: Record<string, unknown>;
}

function DraggableBlockItem({
  id,
  title,
  icon: Icon,
  blockType,
  blockData = {},
}: DraggableBlockItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type: blockType,
      data: blockData,
    },
  });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50"
        )}
        size="sm"
      >
        <Icon />
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavBlocks() {
  const blocks = [
    {
      id: "block-text",
      title: "Text",
      icon: Type,
      blockType: "text",
      blockData: {
        content: "",
      },
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Blöcke</SidebarGroupLabel>
      <SidebarMenu>
        {blocks.map((block) => (
          <DraggableBlockItem
            key={block.id}
            id={block.id}
            title={block.title}
            icon={block.icon}
            blockType={block.blockType}
            blockData={block.blockData}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

