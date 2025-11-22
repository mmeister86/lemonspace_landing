"use client";

import { useTranslations } from "next-intl";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BLOCKS, LAYOUT_BLOCKS } from "@/app/[locale]/builder/config/blocks";
import type { BlockType } from "@/lib/types/board";

interface BlockSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (type: BlockType, data: Record<string, unknown>) => void;
}

interface SelectionBlockCardProps {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
}

function SelectionBlockCard({ title, icon: Icon, onClick }: SelectionBlockCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-md aspect-square w-full"
            )}
        >
            <Icon className="h-8 w-8" />
            <span className="text-sm font-medium text-center leading-tight">{title}</span>
        </button>
    );
}

export function BlockSelectionDialog({
    open,
    onOpenChange,
    onSelect,
}: BlockSelectionDialogProps) {
    const t = useTranslations();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{t("blockSelection.title")}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="blocks" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 border-b bg-muted/30">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="blocks">Blöcke</TabsTrigger>
                            <TabsTrigger value="layout">Layout</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-6">
                            <TabsContent value="blocks" className="mt-0">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                    {BLOCKS.map((block) => (
                                        <SelectionBlockCard
                                            key={block.id}
                                            title={t(block.labelKey)}
                                            icon={block.icon}
                                            onClick={() => onSelect(block.blockType as BlockType, block.blockData)}
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="layout" className="mt-0">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                    {LAYOUT_BLOCKS.map((block) => (
                                        <SelectionBlockCard
                                            key={block.id}
                                            title={t(block.labelKey)}
                                            icon={block.icon}
                                            onClick={() => onSelect(block.blockType as BlockType, block.blockData)}
                                        />
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
