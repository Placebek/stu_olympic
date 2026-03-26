import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { ArrowRight, BookOpen, Clock, FileCheck, Trophy, Shield, Zap, Hash } from 'lucide-react'

const RULE_ICONS = [<Clock size={20}/>, <FileCheck size={20}/>, <Shield size={20}/>, <Trophy size={20}/>]

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.1 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } } },
}

export default function HomePage() {
  const navigate = useNavigate()
  const { team } = useAuth()
  const { t } = useLang()

  const stats = [
    { value: '3ч', label: t.home.time },
    { value: '∞', label: t.home.attempts },
    { value: '1', label: t.home.finalSubmit },
  ]

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }} className="text-center mb-12">
          {team?.variant && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Hash size={14} className="text-indigo-500" />
              <span className="text-sm font-medium text-indigo-700">{t.home.variantBadge} {team.variant}</span>
            </motion.div>
          )}
          {team && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="glass rounded-2xl inline-block px-6 py-3 mb-6">
              <p className="text-slate-600 text-sm">
                {t.home.greeting} <span className="font-bold text-indigo-600">{team.name}</span>! {t.home.greetingEmoji}
              </p>
            </motion.div>
          )}
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-4" style={{ fontFamily: '"Clash Display", sans-serif' }}>
            {t.home.title}{' '}
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              2025
            </span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">{t.home.subtitle}</p>
        </motion.div>

        <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-3 gap-4 mb-10">
          {stats.map((s) => (
            <motion.div key={s.label} variants={stagger.item} className="glass-card rounded-2xl p-5 text-center">
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: '"Clash Display", sans-serif', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}
              </div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="glass-card rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <BookOpen size={18} color="white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: '"Clash Display", sans-serif' }}>{t.home.rulesTitle}</h2>
          </div>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid md:grid-cols-2 gap-4">
            {t.home.rules.map((rule, i) => (
              <motion.div key={rule.title} variants={stagger.item} className="flex gap-3 p-4 rounded-2xl transition-all duration-200 hover:bg-white/40">
                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                  {RULE_ICONS[i]}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 mb-1">{rule.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{rule.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="text-center">
          <motion.button onClick={() => navigate('/task')} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            className="btn-primary inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base">
            <Zap size={18} fill="white" />
            {t.home.goToTask}
            <ArrowRight size={18} />
          </motion.button>
          <p className="text-xs text-slate-400 mt-3">{t.home.readyNote}</p>
        </motion.div>
      </div>
    </div>
  )
}
