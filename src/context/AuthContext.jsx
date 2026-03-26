import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jwt'))
  const [team, setTeam] = useState(() => {
    const t = localStorage.getItem('team')
    return t ? JSON.parse(t) : null
  })

  const login = (jwt, teamData) => {
    localStorage.setItem('jwt', jwt)
    localStorage.setItem('team', JSON.stringify(teamData))
    setToken(jwt)
    setTeam(teamData)
  }

  const logout = () => {
    localStorage.removeItem('jwt')
    localStorage.removeItem('team')
    localStorage.removeItem('submitted')
    setToken(null)
    setTeam(null)
  }

  const isSubmitted = () => localStorage.getItem('submitted') === 'true'
  const markSubmitted = () => localStorage.setItem('submitted', 'true')

  return (
    <AuthContext.Provider value={{ token, team, login, logout, isSubmitted, markSubmitted }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
