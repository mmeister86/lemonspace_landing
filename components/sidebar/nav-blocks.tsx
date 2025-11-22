"use client";

import { useState } from "react";
import { useDraggable, useDndMonitor, DragOverlay } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { SidebarGroup } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BLOCKS, LAYOUT_BLOCKS } from "@/app/[locale]/builder/config/blocks";

// --- Components ---

interface SidebarBlockCardProps {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    className?: string;
}

function SidebarBlockCard({ title, icon: Icon, className }: SidebarBlockCardProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border bg-sidebar-accent/10 hover:bg-sidebar-accent/50 p-2 text-sidebar-foreground shadow-sm transition-all aspect-square",
                className
            )}
        >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium text-center leading-tight">{title}</span>
        </div>
    );
}

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
    icon,
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
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-50")}
        >
            <SidebarBlockCard title={title} icon={icon} />
        </div>
    );
}

export function NavBlocks() {
    const t = useTranslations();
    const [activeId, setActiveId] = useState<string | null>(null);

    useDndMonitor({
        onDragStart(event) {
            setActiveId(event.active.id as string);
        },
        onDragEnd() {
            setActiveId(null);
        },
    });

    const allBlocks = [...BLOCKS, ...LAYOUT_BLOCKS];
    const activeBlock = allBlocks.find((b) => b.id === activeId);

    return (
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
            <Tabs defaultValue="blocks" className="w-full">
                <div className="px-4 py-2">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="blocks">Blöcke</TabsTrigger>
                        <TabsTrigger value="layout">Layout</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="blocks" className="px-4 pb-4 mt-0">
                    <div className="grid grid-cols-2 gap-2">
                        {BLOCKS.map((block) => (
                            <DraggableBlockItem
                                key={block.id}
                                id={block.id}
                                title={t(block.labelKey)}
                                icon={block.icon}
                                blockType={block.blockType}
                                blockData={block.blockData}
                            />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="layout" className="px-4 pb-4 mt-0">
                    <div className="grid grid-cols-2 gap-2">
                        {LAYOUT_BLOCKS.map((block) => (
                            <DraggableBlockItem
                                key={block.id}
                                id={block.id}
                                title={t(block.labelKey)}
                                icon={block.icon}
                                blockType={block.blockType}
                                blockData={block.blockData}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <DragOverlay>
                {activeBlock ? (
                    <SidebarBlockCard
                        title={t(activeBlock.labelKey)}
                        icon={activeBlock.icon}
                        className="cursor-grabbing bg-sidebar-accent/50 opacity-90 ring-2 ring-primary"
                    />
                ) : null}
            </DragOverlay>
        </SidebarGroup>
    );
}
