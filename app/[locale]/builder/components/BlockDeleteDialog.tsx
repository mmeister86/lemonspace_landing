"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useUpdateBoard } from "@/lib/hooks/use-boards";
import { Loader2Icon } from "lucide-react";

interface BlockDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string | null;
}

export function BlockDeleteDialog({
  open,
  onOpenChange,
  blockId,
}: BlockDeleteDialogProps) {
  const removeBlock = useCanvasStore((state) => state.removeBlock);
  const addBlock = useCanvasStore((state) => state.addBlock);
  const currentBoard = useCanvasStore((state) => state.currentBoard);
  const blocks = useCanvasStore((state) => state.blocks);
  const updateBoardMutation = useUpdateBoard();

  // Verwende isPending für TanStack Query v5 (isLoading ist deprecated)
  const isLoading = updateBoardMutation.isPending;

  const handleDelete = async () => {
    // Early return wenn bereits ein Request läuft
    if (isLoading) return;

    if (!blockId) return;

    // Prüfe, ob ein Board geladen ist, bevor wir den Block entfernen
    if (!currentBoard) {
      toast.error("Kein Board geladen", {
        description:
          "Es ist kein Board geladen. Bitte laden Sie zuerst ein Board, bevor Sie einen Block löschen.",
      });
      // Dialog bleibt offen, damit der Benutzer das Problem sehen kann
      return;
    }

    // Finde den zu löschenden Block für möglichen Rollback
    const blockToDelete = blocks.find((b) => b.id === blockId);
    if (!blockToDelete) return;

    // Berechne aktualisierte Blöcke vor dem Entfernen
    const updatedBlocks = blocks.filter((b) => b.id !== blockId);

    // Optimistic UI: Entferne Block sofort aus Store
    removeBlock(blockId);

    try {
      // Warte auf erfolgreiche Backend-Mutation
      await updateBoardMutation.mutateAsync({
        boardId: currentBoard.id,
        boardData: {
          ...currentBoard,
          blocks: updatedBlocks,
        },
      });

      // Bei Erfolg: Dialog schließen
      onOpenChange(false);
    } catch (error) {
      // Rollback: Füge Block wieder hinzu bei Fehler
      addBlock(blockToDelete);
      console.error("Fehler beim Speichern des Boards:", error);
      toast.error("Fehler beim Löschen des Blocks", {
        description:
          "Der Block konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
      });
      // Dialog bleibt offen, damit der Benutzer es erneut versuchen kann
    }
  };

  // Verhindere Dialog-Schließung während des Ladens
  const handleOpenChange = (newOpen: boolean) => {
    // Blockiere Schließen während des Ladens
    if (!newOpen && isLoading) {
      return;
    }
    onOpenChange(newOpen);
  };

  if (!blockId) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Der Block wird
            dauerhaft vom Board entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
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
