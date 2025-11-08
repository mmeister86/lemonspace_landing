'use client'

import { useState, useEffect } from 'react'
import { account } from '@/lib/appwrite'
import { ID } from 'appwrite'
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
      const errorMessage = error instanceof Error ? error.message : 'Registrierung fehlgeschlagen'
      return { success: false, error: errorMessage }
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
      let errorMessage = 'Anmeldung fehlgeschlagen'
      if (error instanceof Error) {
        errorMessage = error.message
        // Logge zusätzliche Details in Development
        if (process.env.NODE_ENV === 'development') {
          console.error('[useAuth] Signin Fehler:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
          })
        }
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
      const errorMessage = error instanceof Error ? error.message : 'Abmeldung fehlgeschlagen'
      return { success: false, error: errorMessage }
    }
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
