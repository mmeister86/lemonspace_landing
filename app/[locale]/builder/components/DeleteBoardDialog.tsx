"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
import { useDeleteBoard } from "@/lib/hooks/use-boards";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { useUser } from "@/lib/contexts/user-context";
// import { toast } from "sonner"; // Not used but kept for reference

interface DeleteBoardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteBoardDialog({ open, onOpenChange }: DeleteBoardDialogProps) {
    const t = useTranslations("deleteBoard");
    const router = useRouter();
    const { user } = useUser();
    const currentBoard = useCanvasStore((state) => state.currentBoard);
    const resetStore = useCanvasStore((state) => state.reset);
    const deleteBoardMutation = useDeleteBoard();

    const handleDelete = async () => {
        if (!user?.id || !currentBoard?.id) {
            return;
        }

        try {
            await deleteBoardMutation.mutateAsync(currentBoard.id);

            // Reset store
            resetStore();

            // Close dialog
            onOpenChange(false);

            // Redirect to dashboard or home
            // Assuming /dashboard is the place to go, or maybe just stay on builder with empty state?
            // The requirement says "deletes the whole board from the database and the builder ui".
            // Usually this means redirecting away or showing an empty state.
            // Let's redirect to the builder root which might show a "create new board" state or similar.
            router.push("/builder");

        } catch (error) {
            console.error("Error deleting board:", error);
            // Error handling is done in the hook via toast
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("description")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteBoardMutation.isPending}>
                        {t("cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={deleteBoardMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {deleteBoardMutation.isPending ? "..." : t("confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
