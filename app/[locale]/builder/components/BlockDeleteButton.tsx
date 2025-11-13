"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useUpdateBoard } from "@/app/lib/hooks/use-boards";
import { cn } from "@/lib/utils";

interface BlockDeleteButtonProps {
  blockId: string;
}

export function BlockDeleteButton({ blockId }: BlockDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const removeBlock = useCanvasStore((state) => state.removeBlock);
  const currentBoard = useCanvasStore((state) => state.currentBoard);
  const blocks = useCanvasStore((state) => state.blocks);
  const updateBoardMutation = useUpdateBoard();

  const handleDelete = async () => {
    // Aktualisiere Board in AppWrite, falls ein Board geladen ist
    if (!currentBoard) {
      // Falls kein Board geladen ist, entferne Block direkt aus Store
      removeBlock(blockId);
      setOpen(false);
      return;
    }

    // Berechne aktualisierte Blöcke vor dem Entfernen
    const updatedBlocks = blocks.filter((b) => b.id !== blockId);

    setIsDeleting(true);
    try {
      // Warte auf erfolgreiche Backend-Mutation
      await updateBoardMutation.mutateAsync({
        boardId: currentBoard.id,
        boardData: {
          ...currentBoard,
          blocks: updatedBlocks,
        },
      });

      // Nur bei erfolgreicher Mutation: Entferne Block aus Store und schließe Dialog
      removeBlock(blockId);
      setOpen(false);
    } catch (error) {
      // Bei Fehler: Lokalen State intakt lassen und Fehler anzeigen
      console.error("Fehler beim Löschen des Blocks:", error);
      toast.error("Fehler beim Löschen des Blocks", {
        description:
          "Der Block konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
      });
      // Dialog bleibt offen, damit der Benutzer es erneut versuchen kann
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Verhindere Schließen während des Löschens
    if (!newOpen && isDeleting) {
      return;
    }
    setOpen(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-full absolute top-2 right-2 z-10",
            "shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Der Block wird
            dauerhaft vom Board entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gelöscht...
              </>
            ) : (
              "Löschen"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
