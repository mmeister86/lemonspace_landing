"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBoardWithInitialization } from "@/lib/hooks/use-board";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { BuilderClient } from "../builder-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, FileQuestion } from "lucide-react";

export default function BoardBuilderPage() {
  const t = useTranslations("boardBuilder");
  const params = useParams();
  const router = useRouter();

  // boardId parameter can be either UUID or Slug
  // The API will automatically detect the format and perform the appropriate lookup
  const boardIdentifier = params.boardId as string;

  const {
    data: boardData,
    isLoading,
    error,
    initializeCanvas,
  } = useBoardWithInitialization(boardIdentifier);

  const [isInitialized, setIsInitialized] = useState(false);

  // Get stable references to store actions individually to avoid infinite loops
  // Actions are stable references from Zustand, so selecting them individually is safe
  const setNavigating = useCanvasStore((state) => state.setNavigating);
  const setLastBoardId = useCanvasStore((state) => state.setLastBoardId);
  const setBoardLoadingState = useCanvasStore((state) => state.setBoardLoadingState);
  const setCurrentBoard = useCanvasStore((state) => state.setCurrentBoard);
  const currentBoardId = useCanvasStore((state) => state.currentBoard?.id || null);

  // Set navigating state when board identifier changes
  useEffect(() => {
    console.log(`[BoardBuilderPage] Board identifier changed to: ${boardIdentifier}`);

    // Capture currentBoardId at the beginning of the effect to avoid dependency on it
    const capturedCurrentBoardId = currentBoardId;

    setNavigating(true);
    setLastBoardId(capturedCurrentBoardId);
    setBoardLoadingState('loading');

    // Reset initialization state when board identifier changes
    setIsInitialized(false);
  }, [boardIdentifier, setNavigating, setLastBoardId, setBoardLoadingState, currentBoardId]);

  // Handle redirect from /builder to first available board
  useEffect(() => {
    if (boardIdentifier === 'undefined' || !boardIdentifier) {
      console.log('[BoardBuilderPage] Invalid board identifier, redirecting...');
      router.push('/builder');
      return;
    }
  }, [boardIdentifier, router]);

  // Initialize canvas only once when data loads for a specific board
  useEffect(() => {
    if (boardData && !isInitialized) {
      console.log(`[BoardBuilderPage] Initializing canvas for board: ${boardData.boardMeta.title}`);
      initializeCanvas({ setCurrentBoard });
      setIsInitialized(true);
      setBoardLoadingState('ready');
    }
  }, [boardData, isInitialized, initializeCanvas, setCurrentBoard, setBoardLoadingState]);

  // Clear navigating state immediately when initialization is complete
  useEffect(() => {
    if (isInitialized) {
      console.log('[BoardBuilderPage] Navigation complete, clearing navigating state');
      setNavigating(false);
    }
  }, [isInitialized, setNavigating]);

  // Handle error state
  useEffect(() => {
    if (error) {
      setBoardLoadingState('error');
      setNavigating(false);
    }
  }, [error, setBoardLoadingState, setNavigating]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  // Error handling
  if (error) {
    const errorCode = (error as Error & { code?: string }).code;
    const statusCode = (error as Error & { statusCode?: number }).statusCode;

    // Unauthorized
    if (statusCode === 401 || errorCode === "UNAUTHORIZED") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>{t("error.unauthorized.title")}</AlertTitle>
            <AlertDescription>
              {t("error.unauthorized.description")}
            </AlertDescription>
            <Button
              className="mt-4"
              onClick={() => router.push("/signin")}
            >
              {t("error.unauthorized.button")}
            </Button>
          </Alert>
        </div>
      );
    }

    // Forbidden
    if (statusCode === 403 || errorCode === "FORBIDDEN") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertTitle>{t("error.forbidden.title")}</AlertTitle>
            <AlertDescription>
              {t("error.forbidden.description")}
            </AlertDescription>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/builder")}
            >
              {t("error.forbidden.button")}
            </Button>
          </Alert>
        </div>
      );
    }

    // Not found
    if (statusCode === 404 || errorCode === "NOT_FOUND") {
      return (
        <div className="flex h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <FileQuestion className="h-4 w-4" />
            <AlertTitle>{t("error.notFound.title")}</AlertTitle>
            <AlertDescription>
              {t("error.notFound.description")}
            </AlertDescription>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/builder")}
            >
              {t("error.notFound.button")}
            </Button>
          </Alert>
        </div>
      );
    }

    // Generic error
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.generic.title")}</AlertTitle>
          <AlertDescription>
            {error.message || t("error.generic.descriptionFallback")}
          </AlertDescription>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            {t("error.generic.button")}
          </Button>
        </Alert>
      </div>
    );
  }

  // Check permissions
  if (boardData && !boardData.permissions.canEdit) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertTitle>{t("readOnly.title")}</AlertTitle>
          <AlertDescription>
            {t("readOnly.description")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render builder
  return <BuilderClient />;
}
