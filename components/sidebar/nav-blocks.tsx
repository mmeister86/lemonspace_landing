"use client";

import { useState } from "react";
import { useDraggable, useDndMonitor, DragOverlay } from "@dnd-kit/core";
import {
    Type,
    Heading,
    Image,
    Video,
    MousePointerClick,
    FormInput,
    CreditCard,
    MessageSquareQuote,
    ListCollapse,
    Code,
    Box,
    Columns2,
    Columns3,
    Columns4,
    MoveVertical,
    Minus,
} from "lucide-react";
import { SidebarGroup } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// --- Data Definitions ---

const BLOCKS = [
    {
        id: "block-text",
        title: "Text",
        icon: Type,
        blockType: "text",
        blockData: { content: "Text block" },
    },
    {
        id: "block-heading",
        title: "Überschrift",
        icon: Heading,
        blockType: "heading",
        blockData: { content: "Heading" },
    },
    {
        id: "block-image",
        title: "Bild",
        icon: Image,
        blockType: "image",
        blockData: {},
    },
    {
        id: "block-video",
        title: "Video",
        icon: Video,
        blockType: "video",
        blockData: {},
    },
    {
        id: "block-button",
        title: "Button",
        icon: MousePointerClick,
        blockType: "button",
        blockData: { text: "Click me" },
    },
    {
        id: "block-form",
        title: "Formular",
        icon: FormInput,
        blockType: "form",
        blockData: {},
    },
    {
        id: "block-pricing",
        title: "Preise",
        icon: CreditCard,
        blockType: "pricing",
        blockData: {},
    },
    {
        id: "block-testimonial",
        title: "Testimonial",
        icon: MessageSquareQuote,
        blockType: "testimonial",
        blockData: {},
    },
    {
        id: "block-accordion",
        title: "Akkordeon",
        icon: ListCollapse,
        blockType: "accordion",
        blockData: {},
    },
    {
        id: "block-code",
        title: "Code",
        icon: Code,
        blockType: "code",
        blockData: {},
    },
];

const LAYOUT_BLOCKS = [
    {
        id: "layout-full",
        title: "Volle Breite",
        icon: Box,
        blockType: "grid",
        blockData: { columns: 1 },
    },
    {
        id: "layout-half",
        title: "Zwei Spalten",
        icon: Columns2,
        blockType: "grid",
        blockData: { columns: 2 },
    },
    {
        id: "layout-third",
        title: "Drei Spalten",
        icon: Columns3,
        blockType: "grid",
        blockData: { columns: 3 },
    },
    {
        id: "layout-quarter",
        title: "Vier Spalten",
        icon: Columns4,
        blockType: "grid",
        blockData: { columns: 4 },
    },
    {
        id: "layout-left-sidebar",
        title: "Links 1/3",
        icon: Columns2,
        blockType: "grid",
        blockData: { columns: 2, ratios: [1, 2] },
    },
    {
        id: "layout-right-sidebar",
        title: "Rechts 1/3",
        icon: Columns2,
        blockType: "grid",
        blockData: { columns: 2, ratios: [2, 1] },
    },
    {
        id: "layout-left-sidebar-quarter",
        title: "Links 1/4",
        icon: Columns2,
        blockType: "grid",
        blockData: { columns: 2, ratios: [1, 3] },
    },
    {
        id: "layout-right-sidebar-quarter",
        title: "Rechts 1/4",
        icon: Columns2,
        blockType: "grid",
        blockData: { columns: 2, ratios: [3, 1] },
    },
    {
        id: "layout-spacer",
        title: "Abstand",
        icon: MoveVertical,
        blockType: "spacer",
        blockData: { height: 32 },
    },
    {
        id: "layout-divider",
        title: "Trennlinie",
        icon: Minus,
        blockType: "divider",
        blockData: {},
    },
];

const ALL_BLOCKS = [...BLOCKS, ...LAYOUT_BLOCKS];

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
    const [activeId, setActiveId] = useState<string | null>(null);

    useDndMonitor({
        onDragStart(event) {
            setActiveId(event.active.id as string);
        },
        onDragEnd() {
            setActiveId(null);
        },
    });

    const activeBlock = ALL_BLOCKS.find((b) => b.id === activeId);

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
                                title={block.title}
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
                                title={block.title}
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
                        title={activeBlock.title}
                        icon={activeBlock.icon}
                        className="cursor-grabbing bg-sidebar-accent/50 opacity-90 ring-2 ring-primary"
                    />
                ) : null}
            </DragOverlay>
        </SidebarGroup>
    );
}
