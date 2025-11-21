"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCreateBoard } from "@/lib/hooks/use-boards";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useUser } from "@/lib/contexts/user-context";
import { generateSlug } from "@/lib/services/board-service";
import { toast } from "sonner";

// Zod Schema für Validierung (nur Titel ist Pflicht, Slug ist optional)
const saveAsBoardSchema = z.object({
    title: z
        .string()
        .min(3, "validation.titleMinLength")
        .max(100, "validation.titleMaxLength"),
    slug: z
        .string()
        .min(3, "validation.slugMinLength")
        .max(50, "validation.slugMaxLength")
        .regex(/^[a-z0-9-]+$/, "validation.slugFormat")
        .optional(),
});

type SaveAsBoardFormData = z.infer<typeof saveAsBoardSchema>;

interface SaveAsBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SaveAsBoardDialog({ open, onOpenChange }: SaveAsBoardDialogProps) {
    const t = useTranslations("saveAsBoard");
    const tCreate = useTranslations("createBoard"); // Reuse validation messages
    const router = useRouter();
    const { user } = useUser();
    const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
    const currentBoard = useCanvasStore((state) => state.currentBoard);
    const blocks = useCanvasStore((state) => state.blocks);
    const createBoardMutation = useCreateBoard();

    // State für Slug-Management
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(false);

    const form = useForm<SaveAsBoardFormData>({
        resolver: zodResolver(saveAsBoardSchema),
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            title: "",
            slug: "",
        },
    });

    const titleValue = form.watch("title");
    form.watch("slug");

    // Pre-fill title with "Copy of [Current Title]"
    React.useEffect(() => {
        if (open && currentBoard) {
            const newTitle = t("copyOf", { title: currentBoard.title });
            form.setValue("title", newTitle, { shouldValidate: true });
            if (!isSlugManuallyEdited) {
                const generatedSlug = generateSlug(newTitle);
                form.setValue("slug", generatedSlug, { shouldValidate: true });
            }

            setTimeout(() => {
                const titleField = document.getElementById('save-as-title') as HTMLInputElement;
                titleField?.focus();
                titleField?.select();
            }, 100);
        }
    }, [open, currentBoard, form, isSlugManuallyEdited]);

    // Auto-Slug-Generierung aus Titel (wenn nicht manuell editiert)
    React.useEffect(() => {
        if (!isSlugManuallyEdited && titleValue) {
            const generatedSlug = generateSlug(titleValue);
            form.setValue("slug", generatedSlug, {
                shouldValidate: true,
                shouldDirty: true
            });
        }
    }, [titleValue, isSlugManuallyEdited, form]);

    // Reset state wenn Dialog geschlossen wird
    React.useEffect(() => {
        if (!open) {
            form.reset();
            setIsSlugManuallyEdited(false);
        }
    }, [open, form]);

    const handleSlugChange = (value: string) => {
        setIsSlugManuallyEdited(true);
        form.setValue("slug", value, {
            shouldValidate: true,
            shouldDirty: true
        });
    };

    const handleGenerateFromTitle = () => {
        if (titleValue) {
            const generatedSlug = generateSlug(titleValue);
            setIsSlugManuallyEdited(false);
            form.setValue("slug", generatedSlug, {
                shouldValidate: true,
                shouldDirty: true
            });
        }
    };

    const onSubmit = async (data: SaveAsBoardFormData) => {
        if (!user?.id) {
            toast.error(tCreate("error.notLoggedIn"));
            return;
        }

        if (!currentBoard) {
            toast.error("No board to save");
            return;
        }

        try {
            // Regenerate block IDs to ensure uniqueness
            const newBlocks = blocks.map(block => ({
                ...block,
                id: crypto.randomUUID()
            }));

            const newBoard = await createBoardMutation.mutateAsync({
                title: data.title,
                slug: data.slug,
                grid_config: currentBoard.grid_config || { columns: 4, gap: 16 },
                blocks: newBlocks,
            });

            // Update store für sofortige UI-Aktualisierung
            setCurrentBoard(newBoard);

            // Dialog schließen
            onOpenChange(false);

            // Success-Nachricht
            toast.success(t("success"));

            // Navigation zum neuen Board
            const boardIdentifier = newBoard.slug || newBoard.id;
            setTimeout(() => {
                router.push(`/builder/${boardIdentifier}`);
            }, 1000);
        } catch (error) {
            console.error("Fehler beim Speichern des Boards:", error);
        }
    };

    const isSubmitDisabled =
        !titleValue ||
        !form.formState.isValid ||
        createBoardMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Titel-Feld */}
                    <div className="space-y-2">
                        <Label htmlFor="save-as-title">{tCreate("titleLabel")}</Label>
                        <Input
                            id="save-as-title"
                            {...form.register("title")}
                            placeholder={tCreate("titlePlaceholder")}
                            aria-invalid={!!form.formState.errors.title}
                        />
                        {form.formState.errors.title && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.title.message ? tCreate(form.formState.errors.title.message) : ""}
                            </p>
                        )}
                    </div>

                    {/* Slug-Feld */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="save-as-slug">{tCreate("slugLabel")}</Label>
                            {titleValue && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleGenerateFromTitle}
                                    className="h-7 text-xs"
                                >
                                    {tCreate("generateFromTitle")}
                                </Button>
                            )}
                        </div>
                        <Input
                            id="save-as-slug"
                            {...form.register("slug", {
                                onChange: (e) => handleSlugChange(e.target.value),
                            })}
                            placeholder={tCreate("slugPlaceholder")}
                            aria-invalid={!!form.formState.errors.slug}
                        />
                        {form.formState.errors.slug && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.slug.message ? tCreate(form.formState.errors.slug.message) : ""}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {tCreate("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitDisabled}
                        >
                            {createBoardMutation.isPending
                                ? t("saving")
                                : t("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
