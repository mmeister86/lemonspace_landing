'use client'

import { useState, useEffect } from 'react'
import { account } from '@/lib/appwrite'
import { ID, AppwriteException } from 'appwrite'
import { Models } from 'appwrite'

export function useAuth() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    try {
      await account.create(ID.unique(), email, password, name)
      // Nach erfolgreicher Registrierung direkt einloggen
      await account.createEmailPasswordSession(email, password)
      const currentUser = await account.get()
      setUser(currentUser)
      return { success: true, user: currentUser }
    } catch (error) {
      return { success: false, error: extractErrorMessage(error, 'Registrierung fehlgeschlagen') }
    }
  }

  const signin = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password)
      const currentUser = await account.get()
      setUser(currentUser)
      return { success: true, user: currentUser }
    } catch (error) {
      // Verbesserte Fehlerbehandlung mit mehr Details
      const errorMessage = extractErrorMessage(error, 'Anmeldung fehlgeschlagen')

      // Logge zusätzliche Details in Development
      if (process.env.NODE_ENV === 'development') {
        console.error('[useAuth] Signin Fehler:', {
          error,
          message: errorMessage,
          ...(error instanceof AppwriteException && {
            code: error.code,
            type: error.type,
            response: error.response,
          }),
        })
      }

      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      return { success: true }
    } catch (error) {
      return { success: false, error: extractErrorMessage(error, 'Abmeldung fehlgeschlagen') }
    }
  }

  /**
   * Extrahiert eine benutzerfreundliche Fehlermeldung aus einem Appwrite-Fehler
   * @param error - Der aufgetretene Fehler
   * @param defaultMessage - Standard-Fehlermeldung falls keine spezifische gefunden wird
   * @returns Benutzerfreundliche Fehlermeldung
   */
  function extractErrorMessage(error: unknown, defaultMessage: string): string {
    // AppwriteException hat zusätzliche Eigenschaften
    if (error instanceof AppwriteException) {
      const { code, message } = error

      // Spezifische Fehlermeldungen basierend auf Status-Code
      switch (code) {
        case 401:
          // Unauthorized - Falsche Credentials oder Benutzer existiert nicht
          if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('credentials')) {
            return 'E-Mail oder Passwort ist falsch. Bitte versuchen Sie es erneut.'
          }
          if (message.toLowerCase().includes('user') && message.toLowerCase().includes('not found')) {
            return 'Kein Konto mit dieser E-Mail-Adresse gefunden.'
          }
          return message || 'E-Mail oder Passwort ist falsch.'

        case 403:
          // Forbidden - Email-Verifizierung erforderlich
          if (message.toLowerCase().includes('verif') || message.toLowerCase().includes('email')) {
            return 'Bitte verifizieren Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.'
          }
          return message || 'Zugriff verweigert. Bitte überprüfen Sie Ihre Berechtigungen.'

        case 429:
          // Too Many Requests
          return 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.'

        case 400:
          // Bad Request
          return message || 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.'

        case 404:
          // Not Found
          return message || 'Die angeforderte Ressource wurde nicht gefunden.'

        case 500:
        case 502:
        case 503:
          // Server Errors
          return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'

        default:
          // Verwende die Appwrite-Fehlermeldung oder Standard-Meldung
          return message || defaultMessage
      }
    }

    // Fallback für normale Error-Objekte
    if (error instanceof Error) {
      return error.message || defaultMessage
    }

    // Fallback für unbekannte Fehlertypen
    return defaultMessage
  }

  return {
    user,
    loading,
    signup,
    signin,
    logout,
    checkUser,
  }
}
