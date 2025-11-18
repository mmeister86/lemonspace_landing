/**
 * Authentifizierungs-Utilities für Cross-App Session Management
 */

/**
 * Whitelist von erlaubten Query-Parametern für Return-URLs
 */
const ALLOWED_QUERY_PARAMS = ["view", "tab", "page"] as const;

type AllowedQueryParam = (typeof ALLOWED_QUERY_PARAMS)[number];

/**
 * Prüft ob ein Query-Parameter in der Whitelist ist
 */
function isAllowedQueryParam(key: string): key is AllowedQueryParam {
  return (ALLOWED_QUERY_PARAMS as readonly string[]).includes(key);
}

/**
 * Erstellt eine bereinigte Return-URL ohne sensible Daten
 * Entfernt Hash/Fragments und filtert Query-Parameter nach Whitelist
 */
function createSanitizedReturnUrl(): string {
  const { origin, pathname, search } = window.location;

  // Erstelle URL-Objekt für einfache Manipulation
  const url = new URL(pathname, origin);

  // Parse bestehende Query-Parameter und kopiere nur erlaubte
  if (search) {
    const searchParams = new URLSearchParams(search);
    for (const [key, value] of searchParams.entries()) {
      // Nur erlaubte Parameter kopieren
      if (isAllowedQueryParam(key)) {
        url.searchParams.set(key, value);
      }
    }
  }

  // Hash wird automatisch nicht übernommen, da wir nur pathname + searchParams verwenden
  return url.pathname + (url.search ? url.search : "");
}

/**
 * Redirect zur Landingpage mit optionaler Return-URL
 */
export function redirectToLandingPage(returnUrl?: string) {
  // Bestimme Landingpage-URL basierend auf Environment
  const isProduction = process.env.NODE_ENV === "production";
  const landingPageUrl = isProduction
    ? "https://lemonspace.io"
    : "http://localhost:3001";

  // Füge Return-URL als Query-Parameter hinzu
  const url = new URL(landingPageUrl);
  if (returnUrl) {
    url.searchParams.set("returnUrl", returnUrl);
  }

  // Redirect
  window.location.href = url.toString();
}

/**
 * Prüft ob ein Fehler ein Authentifizierungsfehler ist
 */
type AuthErrorShape = {
  message?: string;
  response?: { status?: number };
  code?: number;
};

function toAuthError(error: unknown): AuthErrorShape | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  return error as AuthErrorShape;
}

export function isAuthError(error: unknown): boolean {
  const authError = toAuthError(error);
  if (!authError) {
    return false;
  }

  if (
    typeof authError.message === "string" &&
    authError.message.includes("not authorized")
  ) {
    return true;
  }

  if (typeof authError.response?.status === "number") {
    return authError.response.status === 401;
  }

  if (typeof authError.code === "number") {
    return authError.code === 401;
  }

  return false;
}

/**
 * Behandelt Auth-Fehler durch Redirect zur Landingpage
 */
export function handleAuthError(error: unknown, context?: string) {
  if (isAuthError(error)) {
    console.warn(
      `Auth error detected${context ? ` in ${context}` : ""}:`,
      error
    );

    // Für lokale Entwicklung: Zeige Warnung statt sofort redirecten
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      console.warn("Auth error in development - not redirecting automatically");
      // In Entwicklung: Nicht redirecten, damit User manuell zur Landingpage gehen kann
      return false;
    }

    // Erstelle bereinigte Return-URL für nach dem Login
    // Entfernt Hash/Fragments und filtert nur sichere Query-Parameter
    const returnUrl = createSanitizedReturnUrl();
    redirectToLandingPage(returnUrl);
    return true;
  }
  return false;
}
