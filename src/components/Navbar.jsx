import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangSwitcher from './LangSwitcher'
import { Menu, X, Zap, LogOut } from 'lucide-react'

export default function Navbar({ easterEgg, onLogoClick }) {
  const { team, logout } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const navItems = [
    { to: '/', label: t.nav.home },
    { to: '/task', label: t.nav.task },
    { to: '/quiz', label: t.nav.quiz },
    { to: '/results', label: t.nav.results },
  ]

  const handleLogout = () => {
    logout()
    navigate('/register')
    setOpen(false)
  }

  // Варианты анимации для мобильного меню
  const menuVariants = {
    closed: { x: '100%' },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        when: 'beforeChildren',
        staggerChildren: 0.07,
      },
    },
  }

  const itemVariants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 },
  }

  return (
    <>
      {/* Основная панель навигации (всегда видна) */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="flex justify-center mt-4 "
      >
        <div
          className="glass-strong rounded-2xl px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
          style={{
            boxShadow: '0 8px 40px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}
        >
          {/* Логотип */}
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 group select-none flex-shrink-0"
          >
            <motion.div
              whileHover={{ rotate: 20, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500"
            >
              <Zap size={16} color="white" fill="white" />
            </motion.div>
            <span
              className={`font-bold text-lg tracking-tight ${easterEgg ? 'easter-egg-active' : ''}`}
              style={{ color: '#1e1b4b', fontFamily: '"Clash Display", sans-serif' }}
            >
              Olymp<span style={{ color: '#6366f1' }}>IQ</span>
            </span>
          </button>

          {/* Десктопные ссылки — с md на lg для большего комфорта */}
          <div className="hidden lg:flex items-center gap-1.5 flex-1 justify-center">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/60 hover:text-indigo-600'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Правая часть: Lang + Team info + Logout (десктоп) */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <LangSwitcher />

            {team && (
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50/70 text-indigo-700 border border-indigo-200/50"
                >
                  {team.name}
                  {team.variant && <span className="ml-1.5 opacity-70">#{team.variant}</span>}
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50/80 transition-all"
                  title={t.nav.logout}
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Мобильные контролы: Lang + Burger */}
          <div className="flex lg:hidden items-center gap-2">
            <LangSwitcher />
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-xl hover:bg-white/60 transition-all"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Мобильное полноэкранное меню (слайд справа) */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 lg:hidden bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)} // клик по фону → закрыть
          >
            <motion.div
              variants={menuVariants}
              onClick={e => e.stopPropagation()} // не закрывать при клике внутри
              className="absolute right-0 top-0 h-full w-4/5 max-w-sm glass-strong shadow-2xl"
            >
              <div className="p-6 flex flex-col h-full">
                {/* Верхняя часть с логотипом и крестиком */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500">
                      <Zap size={20} color="white" fill="white" />
                    </div>
                    <span className="font-bold text-xl" style={{ fontFamily: '"Clash Display", sans-serif' }}>
                      Olymp<span className="text-indigo-500">IQ</span>
                    </span>
                  </div>
                  <button onClick={() => setOpen(false)}>
                    <X size={28} className="text-slate-600" />
                  </button>
                </div>

                {/* Ссылки */}
                <div className="flex flex-col gap-2 mb-auto">
                  {navItems.map(({ to, label }) => (
                    <motion.div key={to} variants={itemVariants}>
                      <NavLink
                        to={to}
                        end={to === '/'}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          `flex px-5 py-4 rounded-2xl text-base font-medium transition-all ${
                            isActive
                              ? 'bg-indigo-500/10 text-indigo-700 font-semibold'
                              : 'text-slate-700 hover:bg-white/50 active:bg-indigo-100'
                          }`
                        }
                      >
                        {label}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>

                {/* Нижняя часть — команда и выход */}
                {team && (
                  <motion.div
                    variants={itemVariants}
                    className="mt-auto pt-6 border-t border-white/20"
                  >
                    <div className="flex items-center justify-between px-2 mb-4">
                      <div>
                        <p className="font-medium text-slate-800">{team.name}</p>
                        {team.variant && (
                          <p className="text-xs text-slate-500">Variant #{team.variant}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full py-3.5 px-5 rounded-xl bg-red-50/70 hover:bg-red-100 text-red-600 font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} />
                      {t.nav.logout}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}