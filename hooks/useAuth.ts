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
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string) => {
    try {
      await account.create(ID.unique(), email, password, name)
      // Nach erfolgreicher Registrierung direkt einloggen
      const session = await account.createEmailPasswordSession(email, password)
      const currentUser = await account.get()
      setUser(currentUser)
      return { success: true, user: currentUser }
    } catch (error: any) {
      return { success: false, error: error.message || 'Registrierung fehlgeschlagen' }
    }
  }

  const signin = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password)
      const currentUser = await account.get()
      setUser(currentUser)
      return { success: true, user: currentUser }
    } catch (error: any) {
      return { success: false, error: error.message || 'Anmeldung fehlgeschlagen' }
    }
  }

  const logout = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'Abmeldung fehlgeschlagen' }
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
