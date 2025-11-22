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
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { toast } from "sonner";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlockSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (type: BlockType, data: Record<string, unknown>) => void;
    target?: { parentId?: string; containerId?: string };
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
    target,
}: BlockSelectionDialogProps) {
    const t = useTranslations();
    const clipboard = useCanvasStore((state) => state.clipboard);
    const pasteBlock = useCanvasStore((state) => state.pasteBlock);

    const handlePaste = () => {
        const success = pasteBlock(target);
        if (success) {
            toast.success(t("toast.pasteSuccess"));
            onOpenChange(false);
        } else {
            toast.error(t("toast.pasteError"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0">
                    <DialogTitle>{t("blockSelection.title")}</DialogTitle>
                    {clipboard && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handlePaste}
                        >
                            <ClipboardPaste className="h-4 w-4" />
                            {t("blockSelection.paste")}
                        </Button>
                    )}
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
