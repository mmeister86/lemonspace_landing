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
import { useUpdateBoardSlug } from "@/app/lib/hooks/use-boards";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useUser } from "@/app/lib/user-context";
import {
  validateSlug,
  generateSlug,
  checkSlugExistsForUser,
} from "@/app/lib/services/board-service";
import { toast } from "sonner";

const slugSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug muss mindestens 3 Zeichen lang sein")
    .max(50, "Slug darf maximal 50 Zeichen lang sein")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten"
    ),
});

type SlugFormData = z.infer<typeof slugSchema>;

interface BoardSlugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardSlugDialog({ open, onOpenChange }: BoardSlugDialogProps) {
  const currentBoard = useCanvasStore((state) => state.currentBoard);
  const updateBoardSlug = useCanvasStore((state) => state.updateBoardSlug);
  const updateBoardSlugMutation = useUpdateBoardSlug();
  const { user, userData } = useUser();
  const [isCheckingSlug, setIsCheckingSlug] = React.useState(false);
  const [slugError, setSlugError] = React.useState<string | null>(null);

  const form = useForm<SlugFormData>({
    resolver: zodResolver(slugSchema),
    defaultValues: {
      slug: currentBoard?.slug || "",
    },
  });

  const [debouncedSlug, setDebouncedSlug] = React.useState<string>("");

  // Aktualisiere Form-Werte wenn Board sich ändert
  React.useEffect(() => {
    if (currentBoard?.slug) {
      form.reset({ slug: currentBoard.slug });
      setSlugError(null);
      setDebouncedSlug("");
    }
  }, [currentBoard?.slug, form]);

  // Debounce Slug-Änderungen
  const slugValue = form.watch("slug");

  React.useEffect(() => {
    // Setze debouncedSlug sofort zurück wenn leer
    if (!slugValue) {
      setDebouncedSlug("");
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedSlug(slugValue);
    }, 400); // 400ms Debounce (zwischen 300-500ms)

    return () => {
      clearTimeout(timeoutId);
    };
  }, [slugValue]);

  // Validiere Slug beim Tippen (nur Form-State aktualisieren)
  const handleSlugChange = (value: string) => {
    form.setValue("slug", value);
    setSlugError(null);
  };

  // Eindeutigkeitsprüfung mit Debounce und Request-Cancellation
  React.useEffect(() => {
    // Guard: Prüfe ob debouncedSlug vorhanden, format-valide und verschieden vom aktuellen Board-Slug
    if (!debouncedSlug) {
      setIsCheckingSlug(false);
      return;
    }

    // Format-Validierung vor der Prüfung
    if (!validateSlug(debouncedSlug)) {
      setSlugError(
        "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten (3-50 Zeichen)"
      );
      setIsCheckingSlug(false);
      return;
    }

    // Guard: Prüfe ob sich der Slug geändert hat und user/currentBoard existieren
    if (debouncedSlug === currentBoard?.slug || !user || !currentBoard) {
      setIsCheckingSlug(false);
      return;
    }

    // Flag um zu prüfen ob dieser Request noch relevant ist
    let isCurrentRequest = true;

    const checkSlugUniqueness = async () => {
      setIsCheckingSlug(true);
      setSlugError(null);

      try {
        const exists = await checkSlugExistsForUser(
          user.id,
          debouncedSlug,
          currentBoard.id
        );

        // Prüfe ob Request noch relevant ist (könnte durch Cleanup abgebrochen worden sein)
        if (!isCurrentRequest) {
          return;
        }

        if (exists) {
          setSlugError(
            "Dieser Slug ist bereits für eines Ihrer Boards vergeben"
          );
        }
      } catch (error) {
        // Prüfe ob Request noch relevant ist
        if (!isCurrentRequest) {
          return;
        }

        // Setze Fehler bei Request-Fehlern
        console.error("Fehler bei Slug-Prüfung:", error);
        setSlugError(
          "Fehler bei der Slug-Prüfung. Bitte versuchen Sie es erneut."
        );
      } finally {
        // Nur isCheckingSlug zurücksetzen wenn Request noch relevant ist
        if (isCurrentRequest) {
          setIsCheckingSlug(false);
        }
      }
    };

    checkSlugUniqueness();

    // Cleanup: Markiere Request als nicht mehr relevant beim Unmount oder bei Änderung
    return () => {
      isCurrentRequest = false;
    };
  }, [
    debouncedSlug,
    currentBoard?.slug,
    currentBoard?.id,
    user?.id,
    user,
    currentBoard,
  ]);

  const onSubmit = async (data: SlugFormData) => {
    if (!currentBoard) {
      toast.error("Kein Board ausgewählt");
      return;
    }

    if (!user) {
      toast.error("Nicht angemeldet");
      return;
    }

    // Prüfe nochmal auf Eindeutigkeit
    if (data.slug !== currentBoard.slug) {
      const exists = await checkSlugExistsForUser(
        user.id,
        data.slug,
        currentBoard.id
      );
      if (exists) {
        setSlugError("Dieser Slug ist bereits für eines Ihrer Boards vergeben");
        return;
      }
    }

    // Optimistic Update
    updateBoardSlug(data.slug);

    try {
      await updateBoardSlugMutation.mutateAsync({
        boardId: currentBoard.id,
        slug: data.slug,
      });

      toast.success("Slug erfolgreich geändert");
      onOpenChange(false);
    } catch (error) {
      // Rollback bei Fehler
      updateBoardSlug(currentBoard.slug);
      console.error("Fehler beim Ändern des Slugs:", error);
      toast.error("Fehler beim Ändern des Slugs", {
        description: "Bitte versuchen Sie es erneut.",
      });
    }
  };

  const handleGenerateFromTitle = () => {
    if (currentBoard?.title) {
      const generatedSlug = generateSlug(currentBoard.title);
      handleSlugChange(generatedSlug);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl = userData?.username
    ? `${baseUrl}/${userData.username}/${form.watch("slug")}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slug ändern</DialogTitle>
          <DialogDescription>
            Ändern Sie den Slug Ihres Boards. Der Slug wird in der URL
            verwendet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug
              </label>
              {currentBoard?.title && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateFromTitle}
                  className="h-7 text-xs"
                >
                  Aus Titel generieren
                </Button>
              )}
            </div>
            <Input
              id="slug"
              {...form.register("slug", {
                onChange: (e) => handleSlugChange(e.target.value),
              })}
              placeholder="mein-board"
              aria-invalid={!!form.formState.errors.slug || !!slugError}
            />
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
            {slugError && (
              <p className="text-sm text-destructive">{slugError}</p>
            )}
            {isCheckingSlug && (
              <p className="text-sm text-muted-foreground">
                Prüfe Verfügbarkeit...
              </p>
            )}
            {previewUrl && !slugError && form.watch("slug") && (
              <div className="mt-2 rounded-md bg-muted p-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Vorschau URL:
                </p>
                <p className="text-sm font-mono break-all">{previewUrl}</p>
              </div>
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
            <Button
              type="submit"
              disabled={
                updateBoardSlugMutation.isPending ||
                isCheckingSlug ||
                !!slugError
              }
            >
              {updateBoardSlugMutation.isPending ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
