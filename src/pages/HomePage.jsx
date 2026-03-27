import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ArrowRight, BookOpen, Clock, FileCheck, Trophy, Shield, Zap, Hash } from 'lucide-react'

const RULE_ICONS = [<Clock size={20} />, <FileCheck size={20} />, <Shield size={20} />, <Trophy size={20} />]

/**
 * HomePage — изменения:
 * 1. team → user (соло олимпиада)
 * 2. Убраны все motion.div — заменены CSS .page-enter + CSS-анимации с delay
 *    БЫЛО: 6 отдельных motion.div с initial/animate/transition → 6 RAF listeners
 *    СТАЛО: одна CSS-анимация на контейнере, stagger через animationDelay
 * 3. whileHover на кнопке → CSS :hover transform
 */
export default function HomePage() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { t }      = useLang()

  const stats = [
    { value: t.home.hours, label: t.home.time },
    { value: '∞',  label: t.home.attempts },
    { value: '1',  label: t.home.finalSubmit },
  ]

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
      <div className="max-w-4xl mx-auto page-enter">

        {/* Hero */}
        <div className="text-center mb-12">
          {user?.variant != null && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                opacity: 0,
                animation: 'fadeInUp 0.5s ease 0.1s forwards',
              }}
            >
              <Hash size={14} className="text-indigo-500" />
              <span className="text-sm font-medium text-indigo-700">
                {t.home.variantBadge} {user.variant}
              </span>
            </div>
          )}

          {user && (
            <div
              className="glass rounded-2xl inline-block px-6 py-3 mb-6"
              style={{ opacity: 0, animation: 'fadeInUp 0.5s ease 0.15s forwards' }}
            >
              <p className="text-slate-600 text-sm">
                {t.home.greeting}{' '}
                <span className="font-bold text-indigo-600">{user.name || user.firstName}</span>!{' '}
                {t.home.greetingEmoji}
              </p>
            </div>
          )}

          <h1
            className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-4"
            style={{
              fontFamily: '"Clash Display", sans-serif',
              opacity: 0,
              animation: 'fadeInUp 0.5s ease 0.2s forwards',
            }}
          >
            {t.home.title}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              2026
            </span>
          </h1>

          <p
            className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed"
            style={{ opacity: 0, animation: 'fadeInUp 0.5s ease 0.25s forwards' }}
          >
            {t.home.subtitle}
          </p>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-3 gap-4 mb-10"
          style={{ opacity: 0, animation: 'fadeInUp 0.5s ease 0.3s forwards' }}
        >
          {stats.map((s, i) => (
            <div key={s.label} className="glass-card rounded-2xl p-5 text-center">
              <div
                className="text-3xl font-bold mb-1"
                style={{
                  fontFamily: '"Clash Display", sans-serif',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {s.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div
          className="glass-card rounded-3xl p-6 md:p-8 mb-8"
          style={{ opacity: 0, animation: 'fadeInUp 0.5s ease 0.35s forwards' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <BookOpen size={18} color="white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: '"Clash Display", sans-serif' }}>
              {t.home.rulesTitle}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {t.home.rules.map((rule, i) => (
              <div key={rule.title} className="flex gap-3 p-4 rounded-2xl hover:bg-white/40 transition-colors">
                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                  {RULE_ICONS[i]}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 mb-1">{rule.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="text-center"
          style={{ opacity: 0, animation: 'fadeInUp 0.5s ease 0.4s forwards' }}
        >
          <button
            onClick={() => navigate('/task')}
            className="btn-primary inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base"
          >
            <Zap size={18} fill="white" />
            {t.home.goToTask}
            <ArrowRight size={18} />
          </button>
          <p className="text-xs text-slate-400 mt-3">{t.home.readyNote}</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
