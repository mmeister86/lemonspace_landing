"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBoardWithInitialization } from "@/app/lib/hooks/use-board";
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

  const canvasStore = useCanvasStore();
  const hasInitialized = useRef(false);

  // Initialize canvas only once when data loads for a specific board
  useEffect(() => {
    if (boardData && !hasInitialized.current) {
      initializeCanvas(canvasStore);
      hasInitialized.current = true;
    }
  }, [boardData, initializeCanvas, canvasStore]);

  // Reset initialization flag if the board identifier changes
  useEffect(() => {
    hasInitialized.current = false;
  }, [boardIdentifier]);

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
