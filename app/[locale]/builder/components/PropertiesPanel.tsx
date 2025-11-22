import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { Block, BlockType } from "@/lib/types/board";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { BlockDeleteDialog } from "./BlockDeleteDialog";

// ... (keep blockSchemas and BlockFormData as is)

const blockSchemas = {
    text: z.object({
        content: z.string().min(1, "Text darf nicht leer sein"),
    }),
    heading: z.object({
        content: z.string().min(1, "Überschrift darf nicht leer sein"),
        level: z.number().int().min(1).max(6).default(2),
    }),
    button: z.object({
        text: z.string().min(1, "Button-Text darf nicht leer sein"),
        url: z.string().url("Ungültige URL").optional().or(z.literal("")),
    }),
    image: z.object({
        src: z.string().min(1, "Bild-URL darf nicht leer sein"),
        alt: z.string().optional(),
    }),
    video: z.object({
        src: z.string().min(1, "Video-URL darf nicht leer sein"),
        poster: z.string().optional(),
    }),
    spacer: z.object({
        height: z.number().int().min(0).max(200).default(20),
    }),
    form: z.object({
        title: z.string().min(1, "Formular-Titel darf nicht leer sein"),
        fields: z.array(z.string()).optional(),
    }),
    pricing: z.object({
        title: z.string().min(1, "Preis-Titel darf nicht leer sein"),
        price: z.string().min(1, "Preis darf nicht leer sein"),
        description: z.string().optional(),
    }),
    testimonial: z.object({
        quote: z.string().min(1, "Testimonial darf nicht leer sein"),
        author: z.string().min(1, "Autor darf nicht leer sein"),
    }),
    accordion: z.object({
        title: z.string().min(1, "Titel darf nicht leer sein"),
        content: z.string().min(1, "Inhalt darf nicht leer sein"),
    }),
    code: z.object({
        code: z.string().min(1, "Code darf nicht leer sein"),
        language: z.string().default("javascript"),
    }),
};

type BlockFormData = Record<string, unknown>;

export function PropertiesPanel() {
    const selectedBlockId = useCanvasStore((state) => state.selectedBlockId);
    const blocks = useCanvasStore((state) => state.blocks);
    const updateBlock = useCanvasStore((state) => state.updateBlock);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const removeBlock = useCanvasStore((state) => state.removeBlock);
    const selectBlock = useCanvasStore((state) => state.selectBlock);

    const block = blocks.find((b) => b.id === selectedBlockId);
    const [lastBlock, setLastBlock] = useState<Block | undefined>(undefined);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (block) {
            setLastBlock(block);
        }
    }, [block]);

    const displayBlock = block || lastBlock;

    const currentSchema = displayBlock
        ? (displayBlock.type === 'grid' ? blockSchemas.text : blockSchemas[displayBlock.type] || blockSchemas.text)
        : blockSchemas.text;

    const form = useForm<BlockFormData>({
        resolver: zodResolver(currentSchema),
        defaultValues: (displayBlock?.data as BlockFormData) || {},
        mode: "onChange", // Auto-save on change
    });

    // Update form values when selected block changes
    useEffect(() => {
        if (block) {
            form.reset((block.data as BlockFormData) || {});
        }
    }, [block, form]);

    // Auto-save changes with debouncing to prevent flooding undo history
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const subscription = form.watch((value) => {
            if (block && form.formState.isValid) {
                // Clear any existing timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // Set a new timeout to debounce the update
                timeoutId = setTimeout(() => {
                    updateBlock(block.id, {
                        data: value as BlockFormData,
                    });
                }, 300); // 300ms debounce delay
            }
        });

        return () => {
            // Clean up subscription and timeout
            subscription.unsubscribe();
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [form, block, updateBlock]);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            selectBlock(null);
        }
    };

    const handleDelete = () => {
        setDeleteDialogOpen(true);
    };

    const getFormFields = (type: BlockType) => {
        switch (type) {
            case "text":
                return (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Inhalt</label>
                        <Textarea
                            {...form.register("content")}
                            placeholder="Text eingeben..."
                            rows={4}
                        />
                    </div>
                );
            case "heading":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Überschrift</label>
                            <Input
                                {...form.register("content")}
                                placeholder="Überschrift eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ebene (1-6)</label>
                            <Input
                                type="number"
                                {...form.register("level", { valueAsNumber: true })}
                                placeholder="Überschriftenebene"
                                min={1}
                                max={6}
                            />
                        </div>
                    </div>
                );
            case "button":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Button-Text</label>
                            <Input
                                {...form.register("text")}
                                placeholder="Button-Text eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ziel-URL</label>
                            <Input
                                {...form.register("url")}
                                placeholder="URL eingeben..."
                            />
                        </div>
                    </div>
                );
            case "image":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bild-URL</label>
                            <Input
                                {...form.register("src")}
                                placeholder="Bild-URL eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Alt-Text</label>
                            <Input
                                {...form.register("alt")}
                                placeholder="Alt-Text eingeben..."
                            />
                        </div>
                    </div>
                );
            case "video":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Video-URL</label>
                            <Input
                                {...form.register("src")}
                                placeholder="Video-URL eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Poster-Bild-URL</label>
                            <Input
                                {...form.register("poster")}
                                placeholder="Poster-Bild-URL eingeben..."
                            />
                        </div>
                    </div>
                );
            case "spacer":
                return (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Höhe (px)</label>
                        <Input
                            type="number"
                            {...form.register("height", { valueAsNumber: true })}
                            placeholder="Höhe in Pixeln"
                            min={0}
                            max={200}
                        />
                    </div>
                );
            case "form":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Titel</label>
                            <Input
                                {...form.register("title")}
                                placeholder="Formular-Titel eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Felder (JSON)</label>
                            <Textarea
                                {...form.register("fields")}
                                placeholder="Felder als JSON-Array eingeben..."
                                rows={3}
                            />
                        </div>
                    </div>
                );
            case "pricing":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Titel</label>
                            <Input
                                {...form.register("title")}
                                placeholder="Titel eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Preis</label>
                            <Input
                                {...form.register("price")}
                                placeholder="Preis eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Beschreibung</label>
                            <Textarea
                                {...form.register("description")}
                                placeholder="Beschreibung eingeben..."
                                rows={3}
                            />
                        </div>
                    </div>
                );
            case "testimonial":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Zitat</label>
                            <Textarea
                                {...form.register("quote")}
                                placeholder="Testimonial eingeben..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Autor</label>
                            <Input
                                {...form.register("author")}
                                placeholder="Autor eingeben..."
                            />
                        </div>
                    </div>
                );
            case "accordion":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Titel</label>
                            <Input
                                {...form.register("title")}
                                placeholder="Titel eingeben..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Inhalt</label>
                            <Textarea
                                {...form.register("content")}
                                placeholder="Inhalt eingeben..."
                                rows={3}
                            />
                        </div>
                    </div>
                );
            case "code":
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Sprache</label>
                            <Input
                                {...form.register("language")}
                                placeholder="z.B. javascript"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Code</label>
                            <Textarea
                                {...form.register("code")}
                                placeholder="Code eingeben..."
                                rows={8}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const getBlockTitle = (type: BlockType) => {
        const titles: Record<BlockType, string> = {
            text: "Text",
            heading: "Überschrift",
            image: "Bild",
            button: "Button",
            spacer: "Abstandhalter",
            video: "Video",
            form: "Formular",
            pricing: "Preis-Tabelle",
            testimonial: "Testimonial",
            accordion: "Akkordeon",
            code: "Code",
            grid: "Layout-Grid",
        };
        return titles[type] || type;
    };

    if (!displayBlock) return null;

    // Do not show the properties sheet for grid blocks
    if (block?.type === 'grid') {
        return null;
    }

    return (
        <>
            <Sheet open={!!block} onOpenChange={handleOpenChange} modal={false}>
                <SheetContent
                    className="w-[400px] sm:w-[540px] overflow-y-auto p-6 pt-12 flex flex-col h-full"
                    side="right"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <SheetHeader className="mb-6 shrink-0">
                        <SheetTitle>{getBlockTitle(displayBlock.type)}</SheetTitle>
                        <SheetDescription>
                            Eigenschaften bearbeiten
                        </SheetDescription>
                    </SheetHeader>

                    <form className="flex-1 flex flex-col" onSubmit={(e) => e.preventDefault()}>
                        <div className="flex-1 space-y-6">
                            {getFormFields(displayBlock.type)}
                        </div>

                        <div className="mt-auto pt-6 space-y-6">
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={handleDelete}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Block löschen
                            </Button>

                            <Separator />

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Erweitert</h4>
                                <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                                    ID: {displayBlock.id}
                                </div>
                            </div>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
            <BlockDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                blockId={displayBlock.id}
            />
        </>
    );
}
