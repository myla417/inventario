import { supabase } from '@/lib/supabase'
import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  user: any
  login: (userData: any) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    supabase.auth.getUser().then((data) => {
      if (data.data.user) {
        login(data.data.user)
      }
    })
  }, [])

  const login = (userData: any) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    navigate('/dashboard')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}