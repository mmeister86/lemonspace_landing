"use client";

import React from "react";
import { handleAuthError, isAuthError } from "@/lib/auth-utils";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface AuthErrorBoundaryState {
  hasError: boolean;
  isAuthError: boolean;
  error?: Error;
  retryCount: number;
  retryDisabled: boolean;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_COOLDOWN_MS = 3000; // 3 Sekunden Debounce

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }>;
}

class AuthErrorBoundaryClass extends React.Component<
  AuthErrorBoundaryProps & {
    t: (key: string) => string;
    router: ReturnType<typeof useRouter>;
  },
  AuthErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(
    props: AuthErrorBoundaryProps & {
      t: (key: string) => string;
      router: ReturnType<typeof useRouter>;
    }
  ) {
    super(props);
    this.state = {
      hasError: false,
      isAuthError: false,
      retryCount: 0,
      retryDisabled: false,
    };
  }

  componentDidUpdate(
    prevProps: AuthErrorBoundaryProps & {
      t: (key: string) => string;
      router: ReturnType<typeof useRouter>;
    },
    prevState: AuthErrorBoundaryState
  ) {
    // Reset retryCount wenn der Fehler erfolgreich behoben wurde
    if (prevState.hasError && !this.state.hasError) {
      this.setState({ retryCount: 0, retryDisabled: false });
    }
  }

  componentWillUnmount() {
    // Cleanup timeout wenn Komponente unmounted wird
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<AuthErrorBoundaryState> {
    // Setze nur den State, ohne handleAuthError aufzurufen
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AuthErrorBoundary caught an error:", error, errorInfo);

    // Prüfe ob es ein Auth-Fehler ist und setze isAuthError nur einmal
    if (!this.state.isAuthError && isAuthError(error)) {
      // Rufe handleAuthError nur einmal hier auf
      handleAuthError(error, "AuthErrorBoundary");
      this.setState({ isAuthError: true });
    }
  }

  handleRetry = () => {
    // Verhindere Retry wenn Button disabled ist
    if (this.state.retryDisabled) {
      return;
    }

    // Prüfe ob der Fehler ein persistenter Auth-Fehler ist
    const isPersistentAuthError =
      this.state.error && isAuthError(this.state.error);

    // Incrementiere Retry-Counter
    const newRetryCount = this.state.retryCount + 1;

    // Wenn Max-Retry erreicht oder persistenter Auth-Fehler mit vielen Versuchen, leite zum Sign-In weiter
    if (
      newRetryCount >= MAX_RETRY_ATTEMPTS ||
      (isPersistentAuthError && newRetryCount >= MAX_RETRY_ATTEMPTS - 1)
    ) {
      // Setze Retry-Counter trotzdem, damit UI den Limit-Status zeigt
      this.setState({ retryCount: newRetryCount });
      this.props.router.push("/signin");
      return;
    }

    // Setze Retry-Button auf disabled für Cooldown-Periode
    this.setState({ retryDisabled: true, retryCount: newRetryCount });

    // Clear bestehenden Timeout falls vorhanden
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Re-enable Retry-Button nach Cooldown
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ retryDisabled: false });
      this.retryTimeoutId = null;
    }, RETRY_COOLDOWN_MS);

    // Setze den State zurück, um einen Retry zu ermöglichen
    // Nur wenn es kein persistenter Auth-Fehler ist oder noch Versuche übrig sind
    if (!isPersistentAuthError || newRetryCount < MAX_RETRY_ATTEMPTS) {
      this.setState({
        hasError: false,
        isAuthError: false,
        error: undefined,
      });
    }
  };

  handleDismiss = () => {
    // Clear bestehenden Timeout falls vorhanden
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    // Setze den State zurück, um den Fehler zu verwerfen
    // Reset auch retryCount und retryDisabled
    this.setState({
      hasError: false,
      isAuthError: false,
      error: undefined,
      retryCount: 0,
      retryDisabled: false,
    });
  };

  render() {
    if (this.state.hasError) {
      // Wenn es ein Auth-Fehler ist, zeige recoverable UI
      if (this.state.isAuthError) {
        const { t, router } = this.props;
        return (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="text-center max-w-md w-full">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t("message")}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => router.push("/signin")}
                  variant="default"
                >
                  {t("signIn")}
                </Button>
                {this.state.retryCount < MAX_RETRY_ATTEMPTS ? (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    disabled={this.state.retryDisabled}
                  >
                    {this.state.retryDisabled
                      ? `${t("retry")} (${Math.ceil(
                          RETRY_COOLDOWN_MS / 1000
                        )}s)`
                      : t("retry")}
                  </Button>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    {t("maxRetriesReached")}
                  </div>
                )}
                <Button onClick={this.handleDismiss} variant="ghost">
                  {t("dismiss")}
                </Button>
              </div>
              {this.state.retryCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">
                  {t("retryAttempts")}: {this.state.retryCount} /{" "}
                  {MAX_RETRY_ATTEMPTS}
                </p>
              )}
            </div>
          </div>
        );
      }

      // Für andere Fehler: Fallback-Komponente verwenden
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} />;
      }

      // Standard Fallback
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              Ein Fehler ist aufgetreten
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {this.state.error?.message || "Unbekannter Fehler"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper-Komponente, die die Übersetzungen lädt
export function AuthErrorBoundary(props: AuthErrorBoundaryProps) {
  const t = useTranslations("authError");
  const router = useRouter();

  return <AuthErrorBoundaryClass {...props} t={t} router={router} />;
}
