"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@/lib/contexts/user-context";
import { useBoards, useCreateBoard } from "@/lib/hooks/use-boards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function BuilderPage() {
  const t = useTranslations("builderPage");
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { data: boards, isLoading: boardsLoading } = useBoards(user?.id || null);
  const createBoard = useCreateBoard();
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const creationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to prevent board creation from running multiple times in Strict Mode
  const hasInitializedRef = useRef(false);

  const createInitialBoard = useCallback(async () => {
    console.log("[BuilderPage] createInitialBoard called");

    // Prevent multiple calls in Strict Mode
    if (hasInitializedRef.current) {
      console.log("[BuilderPage] Already initialized, skipping");
      return;
    }

    hasInitializedRef.current = true;
    setIsCreatingBoard(true);
    setCreateError(null);

    // Set a timeout (30 seconds) to prevent indefinite hanging
    creationTimeoutRef.current = setTimeout(() => {
      setCreateError("Board creation timed out. Please try again.");
      setIsCreatingBoard(false);
      console.error("Board creation timed out after 30 seconds");
    }, 30000);

    try {
      const newBoard = await createBoard.mutateAsync({
        title: t("firstBoardTitle"),
        slug: t("firstBoardSlug"),
        grid_config: { columns: 4, gap: 16 },
        blocks: [],
      });

      // Clear the timeout if the operation completed successfully
      clearTimeout(creationTimeoutRef.current);
      setIsCreatingBoard(false);
      router.replace(`/builder/${newBoard.slug}`);
    } catch (error) {
      // Clear the timeout if there was an error
      clearTimeout(creationTimeoutRef.current);
      console.error("Failed to create initial board:", error);
      setCreateError(error instanceof Error ? error.message : "Failed to create your first board");
      setIsCreatingBoard(false);
    }
  }, [createBoard, t, router]);

  useEffect(() => {
    // Wait for user loading to complete
    if (userLoading) {
      return;
    }

    // Only redirect if loading is done and user is not authenticated
    if (!user?.id) {
      router.push("/signin");
      return;
    }

    // Wait for boards to load
    if (boardsLoading || !boards) {
      return;
    }

    if (boards.length > 0) {
      // Redirect to first available board
      router.replace(`/builder/${boards[0].slug}`);
    } else if (!isCreatingBoard && !hasInitializedRef.current) {
      // No boards found, create the first one automatically
      // Only call if we haven't already initialized
      createInitialBoard();
    }
  }, [user, userLoading, boards, boardsLoading, router, isCreatingBoard, createInitialBoard]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (creationTimeoutRef.current) {
        clearTimeout(creationTimeoutRef.current);
      }
    };
  }, []);

  // Show loading state while redirecting or creating board
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-4 w-full max-w-md">
        {isCreatingBoard ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-lg font-medium">{t("creatingFirstBoard")}</p>
            <p className="text-sm text-muted-foreground">{t("creatingBoardSubtext")}</p>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : createError ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
            <Button onClick={createInitialBoard} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("tryAgain")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        )}
      </div>
    </div>
  );
}
