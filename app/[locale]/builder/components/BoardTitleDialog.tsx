"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useUpdateBoardTitle } from "@/lib/hooks/use-boards";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { toast } from "sonner";

const titleSchema = z.object({
  title: z
    .string()
    .min(1, "Titel muss mindestens 1 Zeichen lang sein")
    .max(100, "Titel darf maximal 100 Zeichen lang sein"),
});

type TitleFormData = z.infer<typeof titleSchema>;

interface BoardTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardTitleDialog({
  open,
  onOpenChange,
}: BoardTitleDialogProps) {
  const currentBoard = useCanvasStore((state) => state.currentBoard);
  const updateBoardTitle = useCanvasStore((state) => state.updateBoardTitle);
  const updateBoardTitleMutation = useUpdateBoardTitle();

  const form = useForm<TitleFormData>({
    resolver: zodResolver(titleSchema),
    defaultValues: {
      title: currentBoard?.title || "",
    },
  });

  // Aktualisiere Form-Werte wenn Board sich ändert
  React.useEffect(() => {
    if (currentBoard?.title) {
      form.reset({ title: currentBoard.title });
    }
  }, [currentBoard?.title, form]);

  const onSubmit = async (data: TitleFormData) => {
    if (!currentBoard) {
      toast.error("Kein Board ausgewählt");
      return;
    }

    // Originalen Titel speichern für Rollback
    const originalTitle = currentBoard.title;

    // Optimistic Update
    updateBoardTitle(data.title);

    try {
      await updateBoardTitleMutation.mutateAsync({
        boardId: currentBoard.id,
        title: data.title,
      });

      toast.success("Titel erfolgreich geändert");
      onOpenChange(false);
    } catch (error) {
      // Rollback bei Fehler
      updateBoardTitle(originalTitle);
      console.error("Fehler beim Ändern des Titels:", error);
      toast.error("Fehler beim Ändern des Titels", {
        description: "Bitte versuchen Sie es erneut.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Titel ändern</DialogTitle>
          <DialogDescription>
            Ändern Sie den Titel Ihres Boards. Der Titel wird auch für die
            automatische Slug-Generierung verwendet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Titel
            </label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Mein Board"
              aria-invalid={!!form.formState.errors.title}
              aria-describedby={
                form.formState.errors.title ? "title-error" : undefined
              }
            />
            {form.formState.errors.title && (
              <p id="title-error" className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateBoardTitleMutation.isPending}>
              {updateBoardTitleMutation.isPending
                ? "Speichern..."
                : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
