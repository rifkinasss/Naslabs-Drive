'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthUser } from '@/types/user'
import { apiClient } from '@/lib/api-client'
import { mockAuthUser } from '@/lib/mock-data'

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const res = await apiClient.get<{ user: AuthUser }>('/auth/me')
      setUser(res.data.user)
      if (typeof window !== 'undefined') {
        localStorage.setItem('drive_user', JSON.stringify(res.data.user))
      }
    } catch {
      // Fallback to mock user if backend call fails during offline/dev mode
      setUser(mockAuthUser)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('drive_token')
      const storedUser = localStorage.getItem('drive_user')

      if (storedToken) {
        setToken(storedToken)
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)) } catch {}
        }
        refreshUser().finally(() => setLoading(false))
      } else {
        // Default demo fallback user if not logged in
        setUser(mockAuthUser)
        setLoading(false)
      }
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const res = await apiClient.post<{ token: string; user: AuthUser }>('/auth/login', {
      email,
      password: pass,
    })

    const newToken = res.data.token
    const newUser = res.data.user

    setToken(newToken)
    setUser(newUser)

    if (typeof window !== 'undefined') {
      localStorage.setItem('drive_token', newToken)
      localStorage.setItem('drive_user', JSON.stringify(newUser))
    }

    router.push('/drive')
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {}

    setToken(null)
    setUser(null)

    if (typeof window !== 'undefined') {
      localStorage.removeItem('drive_token')
      localStorage.removeItem('drive_user')
    }

    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
