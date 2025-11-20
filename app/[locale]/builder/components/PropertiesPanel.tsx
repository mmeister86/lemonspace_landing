"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BlockType } from "@/lib/types/board";
import { Separator } from "@/components/ui/separator";

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

    const block = blocks.find((b) => b.id === selectedBlockId);

    const currentSchema = block
        ? blockSchemas[block.type] || blockSchemas.text
        : blockSchemas.text;

    const form = useForm<BlockFormData>({
        resolver: zodResolver(currentSchema),
        defaultValues: (block?.data as BlockFormData) || {},
        mode: "onChange", // Auto-save on change
    });

    // Update form values when selected block changes
    useEffect(() => {
        if (block) {
            form.reset((block.data as BlockFormData) || {});
        }
    }, [block, form]);

    // Auto-save changes
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (block && form.formState.isValid) {
                updateBlock(block.id, {
                    data: value as BlockFormData,
                });
            }
        });
        return () => subscription.unsubscribe();
    }, [form, block, updateBlock]);

    if (!block) {
        return (
            <div className="w-80 border-l bg-background p-4 text-muted-foreground text-sm text-center flex items-center justify-center h-full">
                Wählen Sie einen Block aus, um dessen Eigenschaften zu bearbeiten.
            </div>
        );
    }

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
        };
        return titles[type] || type;
    };

    return (
        <div className="w-80 border-l bg-background flex flex-col h-full">
            <div className="p-4 border-b">
                <h3 className="font-semibold leading-none tracking-tight">
                    {getBlockTitle(block.type)}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Eigenschaften bearbeiten
                </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    {getFormFields(block.type)}

                    <Separator className="my-4" />

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Erweitert</h4>
                        <div className="text-xs text-muted-foreground">
                            Block ID: {block.id}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
