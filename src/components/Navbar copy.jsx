import { useState, memo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangSwitcher from './LangSwitcher'
import { Menu, X, Zap, LogOut } from 'lucide-react'

/**
 * Navbar — исправления:
 *
 * 1. БАГ ЦЕНТРОВКИ:
 *    БЫЛО:  className="fixed top-4 left-1/2 ..." style={{ transform: 'translateX(-50%)' }}
 *           Framer Motion при animate={{ y }} пересчитывал весь transform-style,
 *           иногда сбрасывая translateX(-50%) → навбар улетал вправо на мобильных.
 *    СТАЛО: убран motion.nav для входной анимации, заменён CSS-классом .page-enter
 *           на враппере. Центровка: left-0 right-0 mx-auto — надёжнее, без JS.
 *
 * 2. whileHover на логотипе (rotate+scale) → layout recalc всего nav.
 *    СТАЛО: CSS transition только на transform логотипа, без Framer.
 *
 * 3. Mobile menu — AnimatePresence с height анимацией вызывал reflow.
 *    СТАЛО: opacity + translateY (compositor-only), высота — auto через CSS.
 *
 * 4. memo() — NavLink-и не ре-рендерятся при смене языка если label не изменился.
 */
const NavItem = memo(({ to, label }) => (
  <NavLink
    to={to}
    end={to === '/'}
    className={({ isActive }) =>
      `px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'bg-indigo-500 text-white shadow-sm'
          : 'text-slate-600 hover:bg-white/60 hover:text-indigo-600'
      }`
    }
  >
    {label}
  </NavLink>
))

export default function Navbar({ easterEgg, onLogoClick, minimal }) {
  const { team, logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const navItems = minimal ? [] : [
    { to: '/',        label: t.nav.home },
    { to: '/task',    label: t.nav.task },
    { to: '/quiz',    label: t.nav.quiz },
    { to: '/results', label: t.nav.results },
  ]

  const handleLogout = () => {
    logout(); navigate('/register'); setOpen(false)
  }

  return (
    /*
     * Центровка: left-0 right-0 + mx-auto + max-w-4xl
     * Это надёжнее, чем left-1/2 + translateX(-50%), которое
     * конфликтовало с Framer transform.
     */
    <nav className="fixed top-4 left-0 right-0 mx-auto z-50 w-[calc(100%-2rem)] max-w-4xl">
      <div
        className="glass-strong rounded-2xl px-5 py-3 flex items-center justify-between gap-3"
        style={{ boxShadow: '0 8px 40px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.95)' }}
      >
        {/* Logo — CSS hover вместо Framer whileHover */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 select-none flex-shrink-0"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center logo-icon"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', transition: 'transform 0.2s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'rotate(20deg) scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <Zap size={16} color="white" fill="white" />
          </div>
          <span
            className={`font-bold text-lg tracking-tight ${easterEgg ? 'easter-egg-active' : ''}`}
            style={{ color: '#1e1b4b', fontFamily: '"Clash Display", sans-serif' }}
          >
            Olymp<span style={{ color: '#6366f1' }}>IQ</span>
          </span>
        </button>

        {/* Desktop nav */}
        {!minimal && (
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ to, label }) => (
              <NavItem key={to} to={to} label={label} />
            ))}
          </div>
        )}

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <LangSwitcher />
          {team && !minimal && (
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                {team.name}
                {team.variant != null && (
                  <span className="ml-1.5 opacity-60">#{team.variant}</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title={t.nav.logout}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <LangSwitcher />
          {!minimal && (
            <button
              onClick={() => setOpen(o => !o)}
              className="p-2 rounded-xl hover:bg-white/60 transition-colors"
            >
              {open
                ? <X size={20} className="text-slate-600" />
                : <Menu size={20} className="text-slate-600" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu — opacity+translateY (compositor-only, без height reflow) */}
      <AnimatePresence>
        {open && !minimal && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mt-2 glass-strong rounded-2xl p-3 flex flex-col gap-1"
          >
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-white/60'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {team && (
              <div className="mt-2 pt-2 border-t border-white/50 flex items-center justify-between px-2">
                <span className="text-xs text-slate-500 font-medium">{team.name}</span>
                <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-600 font-medium">
                  {t.nav.logout}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
