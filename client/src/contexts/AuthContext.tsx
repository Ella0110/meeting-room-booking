import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AuthUser } from '../types'
import { logout as apiLogout } from '../api/auth'

interface AuthContextType {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('authUser')
      return stored ? (JSON.parse(stored) as AuthUser) : null
    } catch {
      return null
    }
  })

  function setUser(u: AuthUser | null) {
    setUserState(u)
    if (u) {
      localStorage.setItem('authUser', JSON.stringify(u))
    } else {
      localStorage.removeItem('authUser')
    }
  }

  async function logout() {
    try { await apiLogout() } catch { /* ignore */ }
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
