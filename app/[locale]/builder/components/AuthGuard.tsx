"use client";

import { useUser } from "@/app/lib/user-context";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, error } = useUser();
  const t = useTranslations("authGuard");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade...</p>
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
                <strong>Warnung:</strong>{" "}
                {error.message || "Ein Fehler ist aufgetreten"}
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
