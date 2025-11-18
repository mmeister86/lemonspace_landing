"use client";

import { useUser } from "@/lib/contexts/user-context";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error } = useUser();
  const t = useTranslations("authGuard");

  // Enhanced loading state with timeout protection
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t("loading")}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            {t("loadingSubtext")}
          </p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error but user is authenticated
  if (error && user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              {t("loadingError.title")}
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error.message || t("loadingError.messageFallback")}
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                {t("loadingError.reloadButton")}
              </Button>
              <Button asChild className="w-full">
                <Link href="/">{t("loadingError.homeButton")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nur blockieren wenn kein authentifizierter User vorhanden ist
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t("notLoggedIn")}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t("pleaseSignIn")}
          </p>
          <Button asChild>
            <Link href="/">{t("backToHomepage")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Wenn User vorhanden ist, aber ein Fehler existiert, zeige nicht-blockierenden Error-Banner
  return (
    <>
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>{t("warning")}:</strong>{" "}
                {error.message || t("errorOccurred")}
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
