'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, type Session } from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial user check
    checkUser()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
          },
        },
      })

      if (error) {
        return { success: false, error: extractErrorMessage(error, 'Registrierung fehlgeschlagen') }
      }

      setUser(data.user)
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: extractErrorMessage(error, 'Registrierung fehlgeschlagen') }
    }
  }

  const signin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Verbesserte Fehlerbehandlung mit mehr Details
        const errorMessage = extractErrorMessage(error, 'Anmeldung fehlgeschlagen')

        // Logge zusätzliche Details in Development
        if (process.env.NODE_ENV === 'development') {
          console.error('[useAuth] Signin Fehler:', {
            error,
            message: errorMessage,
            status: error.status,
            name: error.name,
          })
        }

        return { success: false, error: errorMessage }
      }

      setUser(data.user)
      return { success: true, user: data.user }
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Anmeldung fehlgeschlagen')

      if (process.env.NODE_ENV === 'development') {
        console.error('[useAuth] Signin Fehler:', {
          error,
          message: errorMessage,
        })
      }

      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return { success: false, error: extractErrorMessage(error, 'Abmeldung fehlgeschlagen') }
      }

      setUser(null)
      return { success: true }
    } catch (error) {
      return { success: false, error: extractErrorMessage(error, 'Abmeldung fehlgeschlagen') }
    }
  }

  /**
   * Extrahiert eine benutzerfreundliche Fehlermeldung aus einem Supabase-Fehler
   * @param error - Der aufgetretene Fehler
   * @param defaultMessage - Standard-Fehlermeldung falls keine spezifische gefunden wird
   * @returns Benutzerfreundliche Fehlermeldung
   */
  function extractErrorMessage(error: unknown, defaultMessage: string): string {
    // Supabase AuthError hat zusätzliche Eigenschaften
    if (error instanceof AuthError) {
      const { status, message } = error

      // Spezifische Fehlermeldungen basierend auf Status-Code
      switch (status) {
        case 400:
          // Bad Request - Meist ungültige Credentials
          if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('credentials')) {
            return 'E-Mail oder Passwort ist falsch. Bitte versuchen Sie es erneut.'
          }
          if (message.toLowerCase().includes('email') && message.toLowerCase().includes('not confirmed')) {
            return 'Bitte verifizieren Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.'
          }
          return message || 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.'

        case 401:
          // Unauthorized - Falsche Credentials
          return 'E-Mail oder Passwort ist falsch. Bitte versuchen Sie es erneut.'

        case 403:
          // Forbidden - Email-Verifizierung erforderlich
          if (message.toLowerCase().includes('verif') || message.toLowerCase().includes('email')) {
            return 'Bitte verifizieren Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.'
          }
          return message || 'Zugriff verweigert. Bitte überprüfen Sie Ihre Berechtigungen.'

        case 422:
          // Unprocessable Entity - Meist Validierungsfehler
          if (message.toLowerCase().includes('password')) {
            return 'Das Passwort erfüllt nicht die Anforderungen. Es muss mindestens 6 Zeichen lang sein.'
          }
          if (message.toLowerCase().includes('email')) {
            return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
          }
          return message || 'Ungültige Eingabe. Bitte überprüfen Sie Ihre Daten.'

        case 429:
          // Too Many Requests
          return 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.'

        case 500:
        case 502:
        case 503:
          // Server Errors
          return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'

        default:
          // Verwende die Supabase-Fehlermeldung oder Standard-Meldung
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
