import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'framer-motion'
import { useState } from 'react'

import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider } from './context/LangContext'
import AuroraBackground from './components/AuroraBackground'
import Navbar from './components/Navbar'
import EasterEgg from './components/EasterEgg'
import { useKonami, useTripleClick } from './hooks/useKonami'

import RegisterPage from './pages/RegisterPage'
import HomePage     from './pages/HomePage'
import TaskPage     from './pages/TaskPage'
import QuizPage     from './pages/QuizPage'
import ResultsPage  from './pages/ResultsPage'
import AdminPage    from './pages/AdminPage'
import ResultsNotReady from './pages/ResultsNotReady'


function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/register" replace />
  return children
}

function AppInner() {
  const location = useLocation()
  const { token } = useAuth()
  const isRegisterPage = location.pathname.startsWith('/register')

  const [easterTrigger, setEasterTrigger] = useState(0)
  const [easterEggActive, setEasterEggActive] = useState(false)

  const fireEaster = () => {
    setEasterTrigger(t => t + 1)
    setEasterEggActive(true)
    setTimeout(() => setEasterEggActive(false), 4000)
  }

  useKonami(fireEaster)
  const handleLogoClick = useTripleClick(fireEaster)

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      {!isRegisterPage && token && (
        <Navbar easterEgg={easterEggActive} onLogoClick={handleLogoClick} />
      )}
      {location.pathname.startsWith('/x9k2-admin') && (
        <Navbar easterEgg={false} onLogoClick={() => {}} minimal />
      )}

      <Routes location={location} key={location.pathname}>
        <Route path="/register/:code" element={<RegisterPage />} />
        <Route path="/register"       element={<RegisterPage />} />

        <Route path="/"        element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/task"    element={<ProtectedRoute><TaskPage /></ProtectedRoute>} />
        <Route path="/quiz"    element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><ResultsNotReady /></ProtectedRoute>} />

        <Route path="/x9k2-admin"   element={<AdminPage />} />
        <Route path="/x9k2-admin/*" element={<AdminPage />} />

        <Route path="*" element={<Navigate to={token ? '/' : '/register'} replace />} />
      </Routes>

      <EasterEgg trigger={easterTrigger} />

      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 8px 32px rgba(100,120,200,0.15)',
          color: '#1e293b',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '14px',
          borderRadius: '16px',
          padding: '12px 16px',
        },
        success: { iconTheme: { primary: '#6366f1', secondary: 'white' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: 'white' } },
      }} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <LangProvider>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </LangProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
