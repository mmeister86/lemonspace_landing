"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
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
import { useCreateBoard } from "@/app/lib/hooks/use-boards";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useUser } from "@/app/lib/user-context";
import { generateSlug } from "@/app/lib/services/board-service";
import { toast } from "sonner";

// Zod Schema für Validierung (nur Titel ist Pflicht, Slug ist optional)
const createBoardSchema = z.object({
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

type CreateBoardFormData = z.infer<typeof createBoardSchema>;

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const t = useTranslations("createBoard");
  const { user } = useUser();
  const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
  const createBoardMutation = useCreateBoard();
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // State für Slug-Management
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(false);

  const form = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardSchema),
    mode: "onChange", // Enable real-time validation to keep isValid in sync
    reValidateMode: "onChange", // Re-validate on change after initial validation
    defaultValues: {
      title: "",
      slug: "",
    },
  });

  const titleValue = form.watch("title");
  const slugValue = form.watch("slug");

  // Auto-Focus auf Titel-Feld beim Öffnen
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        // Use the form's ref to focus the title field
        const titleField = document.getElementById('title') as HTMLInputElement;
        titleField?.focus();
      }, 100);
    }
  }, [open]);

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

  // Handler für manuelle Slug-Bearbeitung
  const handleSlugChange = (value: string) => {
    setIsSlugManuallyEdited(true);
    form.setValue("slug", value, {
      shouldValidate: true,
      shouldDirty: true
    });
  };

  // Handler für Auto-Generierung aus Titel
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

  // Submit Handler
  const onSubmit = async (data: CreateBoardFormData) => {
    if (!user?.id) {
      toast.error(t("error.notLoggedIn"));
      return;
    }

    try {
      const newBoard = await createBoardMutation.mutateAsync({
        title: data.title,
        slug: data.slug, // Optional - API generiert wenn nicht vorhanden
        grid_config: { columns: 4, gap: 16 },
        blocks: [],
      });

      setCurrentBoard(newBoard);
      onOpenChange(false);
      toast.success(t("success"));
    } catch (error) {
      console.error("Fehler beim Erstellen des Boards:", error);
      // Die Fehlermeldung wird bereits im Hook angezeigt
    }
  };

  // Button Disable Logic
  const isSubmitDisabled =
    !titleValue || // Titel ist leer
    !form.formState.isValid || // Form-Validierung fehlgeschlagen
    createBoardMutation.isPending; // API Request läuft

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
            <Label htmlFor="title">{t("titleLabel")}</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder={t("titlePlaceholder")}
              aria-invalid={!!form.formState.errors.title}
              aria-describedby={
                form.formState.errors.title ? "title-error" : undefined
              }
            />
            {form.formState.errors.title && (
              <p id="title-error" className="text-sm text-destructive">
                {form.formState.errors.title.message ? t(form.formState.errors.title.message) : ""}
              </p>
            )}
          </div>

          {/* Slug-Feld */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug">{t("slugLabel")}</Label>
              {titleValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateFromTitle}
                  className="h-7 text-xs"
                >
                  {t("generateFromTitle")}
                </Button>
              )}
            </div>
            <Input
              id="slug"
              {...form.register("slug", {
                onChange: (e) => handleSlugChange(e.target.value),
              })}
              placeholder={t("slugPlaceholder")}
              aria-invalid={!!form.formState.errors.slug}
              aria-describedby={
                form.formState.errors.slug ? "slug-error" : undefined
              }
            />
            {form.formState.errors.slug && (
              <p id="slug-error" className="text-sm text-destructive">
                {form.formState.errors.slug.message ? t(form.formState.errors.slug.message) : ""}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
            >
              {createBoardMutation.isPending
                ? t("creating")
                : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
