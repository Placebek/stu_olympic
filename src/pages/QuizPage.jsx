import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../context/LangContext'
import { getMyQuiz, submitBulk, getMyResults } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Wifi, Database, CheckCircle2, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Send, BarChart2, Loader2
} from 'lucide-react'

const CAT_CONFIG = {
  network:  { icon: <Wifi size={16} />,     color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)'  },
  database: { icon: <Database size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)'  },
}

// ── Helpers ─────────────────────────────────────────────────────────────────
// Returns the localised text/options from a question object based on current lang.
// lang is expected to be 'kz' | 'ru' (whatever useLang provides).
function qText(q, lang) {
  return lang === 'kz' ? q.text_kz : q.text_ru
}
function qOptions(q, lang) {
  return lang === 'kz' ? q.options_kz : q.options_ru
}

export default function QuizPage() {
  const { t, lang } = useLang()   // <-- added `lang` from context (e.g. 'kz' | 'ru')
  const [quiz, setQuiz]             = useState(null)
  const [answers, setAnswers]       = useState({})      // { question_id: chosen_index }
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [results, setResults]       = useState(null)    // after submit
  const [activeTab, setActiveTab]   = useState('network')
  const [activeIdx, setActiveIdx]   = useState(0)

  useEffect(() => { loadQuiz() }, [])

  const loadQuiz = async () => {
    setLoading(true)
    try {
      const r = await getMyQuiz()
      setQuiz(r.data)
      if (r.data.is_completed) {
        const res = await getMyResults()
        setResults(res.data)
      }
    } catch (e) {
      toast.error('Тест жүктелмеді / Ошибка загрузки теста')
    } finally {
      setLoading(false)
    }
  }

  const currentQuestions = quiz
    ? (activeTab === 'network' ? quiz.network_questions : quiz.database_questions)
    : []

  const currentQ = currentQuestions[activeIdx]

  const handleSelect = (qId, idx) => {
    if (quiz?.is_completed || results) return
    setAnswers(prev => ({ ...prev, [qId]: idx }))
  }

  const answeredCount = Object.keys(answers).length
  const totalQ = quiz
    ? (quiz.network_questions?.length || 0) + (quiz.database_questions?.length || 0)
    : 0

  const handleSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    const payload = Object.entries(answers).map(([qId, idx]) => ({
      question_id: Number(qId),
      chosen_index: idx,
    }))
    try {
      await submitBulk(payload)
      const res = await getMyResults()
      setResults(res.data)
      toast.success(t.quiz.completedTitle + ' 🎉')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Жіберу қатесі')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div
        className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin"
        style={{ animationDuration: '1.5s' }}
      />
    </div>
  )

  if (results) return <ResultsView results={results} t={t} lang={lang} />

  if (!quiz) return null

  const allQuestions = [
    ...(quiz.network_questions || []),
    ...(quiz.database_questions || []),
  ]
  const netLen = quiz.network_questions?.length || 0

  // Per-tab answered helpers
  const tabAnswered = (tabKey) => {
    const qs = tabKey === 'network' ? quiz.network_questions : quiz.database_questions
    return (qs || []).filter(q => answers[q.id] !== undefined).length
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1
            className="text-3xl font-bold text-slate-900 mb-1"
            style={{ fontFamily: '"Clash Display", sans-serif' }}
          >
            {t.quiz.title}
          </h1>
          <p className="text-slate-500 text-sm">{t.quiz.subtitle}</p>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  transform: `scaleX(${totalQ ? answeredCount / totalQ : 0})`,
                  transformOrigin: 'left center',
                  transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {answeredCount}/{totalQ} {t.quiz.answered}
            </span>
          </div>

          {/* Dot navigator */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {allQuestions.map((q, i) => {
              const isNet    = i < netLen
              const tabKey   = isNet ? 'network' : 'database'
              const tabIndex = isNet ? i : i - netLen
              const isAnswered = answers[q.id] !== undefined
              const isCurrent  = activeTab === tabKey && activeIdx === tabIndex
              return (
                <button
                  key={q.id}
                  onClick={() => { setActiveTab(tabKey); setActiveIdx(tabIndex) }}
                  className="w-7 h-7 rounded-lg text-xs font-bold transition-all duration-200"
                  style={{
                    background: isCurrent
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : isAnswered
                        ? (isNet ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)')
                        : 'rgba(255,255,255,0.6)',
                    color: isCurrent ? '#fff' : isAnswered ? (isNet ? '#4338ca' : '#065f46') : '#94a3b8',
                    border: isCurrent ? 'none' : '1px solid rgba(255,255,255,0.7)',
                  }}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── Tab switcher ─────────────────────────────────────────────── */}
        <div className="glass rounded-2xl p-1 flex gap-1 mb-5">
          {[
            { key: 'network',  label: t.quiz.networkSection, icon: <Wifi size={14} />,     color: '#6366f1' },
            { key: 'database', label: t.quiz.dbSection,      icon: <Database size={14} />, color: '#10b981' },
          ].map(tab => {
            const tabQs = tab.key === 'network' ? quiz.network_questions : quiz.database_questions
            const answered = (tabQs || []).filter(q => answers[q.id] !== undefined).length
            const total    = tabQs?.length || 0
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setActiveIdx(0) }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={activeTab === tab.key
                  ? { background: `${tab.color}18`, color: tab.color, border: `1px solid ${tab.color}30` }
                  : { color: '#94a3b8' }
                }
              >
                {tab.icon} {tab.label}
                <span className="text-xs opacity-60">({answered}/{total})</span>
              </button>
            )
          })}
        </div>

        {/* ── Question card ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {currentQ && (
            <motion.div
              key={`${activeTab}-${activeIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="glass-card rounded-3xl p-6 md:p-8 mb-5"
            >
              {/* Q header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div
                    className="px-3 py-1 rounded-xl text-xs font-bold"
                    style={{
                      background: CAT_CONFIG[activeTab].bg,
                      color:      CAT_CONFIG[activeTab].color,
                      border:    `1px solid ${CAT_CONFIG[activeTab].border}`,
                    }}
                  >
                    {CAT_CONFIG[activeTab].icon}
                  </div>
                  <span className="text-sm text-slate-500 font-medium">
                    {t.quiz.question} {activeIdx + 1} {t.quiz.of} {currentQuestions.length}
                  </span>
                </div>
                {answers[currentQ.id] !== undefined && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                    <CheckCircle2 size={18} />
                  </motion.div>
                )}
              </div>

              {/* Question text — localised */}
              <p className="text-lg font-semibold text-slate-800 mb-6 leading-relaxed">
                {qText(currentQ, lang)}
              </p>

              {/* Options — localised */}
              <div className="space-y-3">
                {qOptions(currentQ, lang).map((opt, oi) => {
                  const isSelected = answers[currentQ.id] === oi
                  return (
                    <motion.button
                      key={oi}
                      onClick={() => handleSelect(currentQ.id, oi)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center gap-3"
                      style={isSelected
                        ? {
                            background:  `${CAT_CONFIG[activeTab].color}15`,
                            border:      `2px solid ${CAT_CONFIG[activeTab].color}`,
                            boxShadow:   `0 4px 16px ${CAT_CONFIG[activeTab].color}20`,
                          }
                        : {
                            background: 'rgba(255,255,255,0.5)',
                            border:     '1.5px solid rgba(255,255,255,0.75)',
                          }
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-200"
                        style={isSelected
                          ? { background: CAT_CONFIG[activeTab].color, color: '#fff' }
                          : { background: 'rgba(148,163,184,0.15)', color: '#64748b' }
                        }
                      >
                        {String.fromCharCode(65 + oi)}
                      </div>
                      <span
                        className={`text-sm leading-relaxed ${isSelected ? 'font-semibold' : 'text-slate-700'}`}
                        style={isSelected ? { color: CAT_CONFIG[activeTab].color } : {}}
                      >
                        {opt}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
            disabled={activeIdx === 0}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="btn-glass flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft size={16} /> {t.quiz.prev}
          </motion.button>

          {activeIdx < currentQuestions.length - 1 ? (
            <motion.button
              onClick={() => setActiveIdx(i => i + 1)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
            >
              {t.quiz.next} <ChevronRight size={16} />
            </motion.button>
          ) : (
            <motion.button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              {submitting
                ? <Loader2 size={16} className="animate-spin" />
                : <><Send size={14} /> {t.quiz.submitAll}</>
              }
            </motion.button>
          )}
        </div>

        {/* Unanswered warning */}
        {answeredCount < totalQ && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-amber-600 mt-3">
            ⚠ {totalQ - answeredCount} {t.quiz.unanswered}
          </motion.p>
        )}
      </div>

      {/* ── Confirm modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="glass-strong rounded-3xl p-8 max-w-sm w-full"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))' }}
              >
                <Send size={24} className="text-emerald-600" />
              </div>
              <h3
                className="text-xl font-bold text-slate-800 text-center mb-2"
                style={{ fontFamily: '"Clash Display", sans-serif' }}
              >
                {t.quiz.confirmTitle}
              </h3>
              <p className="text-sm text-slate-500 text-center mb-2">
                {answeredCount}/{totalQ} {t.quiz.answered}
              </p>
              {answeredCount < totalQ && (
                <div
                  className="rounded-2xl p-3 mb-4"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <p className="text-xs text-amber-600">{t.quiz.confirmDesc}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-glass flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600"
                >
                  {t.quiz.cancel}
                </button>
                <motion.button
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                >
                  <Send size={14} /> {t.quiz.confirm}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Results view ─────────────────────────────────────────────────────────────
function ResultsView({ results, t, lang }) {
  const [openAnswer, setOpenAnswer] = useState(null)

  const pct   = results.score_percent || 0
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
      <div className="max-w-2xl mx-auto">

        {/* Score hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-4"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)`, border: `2px solid ${color}40` }}
          >
            <span className="text-4xl font-black" style={{ color, fontFamily: '"Clash Display", sans-serif' }}>
              {Math.round(pct)}%
            </span>
          </motion.div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: '"Clash Display", sans-serif' }}>
            {t.quiz.completedTitle}
          </h1>
          <p className="text-slate-500 text-sm">{t.quiz.completedDesc}</p>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          {[
            { label: t.quiz.correct,  value: results.correct_count,                                 icon: <CheckCircle2 size={18}/>, c: '#10b981' },
            { label: t.quiz.wrong,    value: results.total_questions - results.correct_count,        icon: <XCircle size={18}/>,     c: '#ef4444' },
            { label: t.quiz.network,  value: results.network_correct,                               icon: <Wifi size={18}/>,         c: '#6366f1' },
            { label: t.quiz.database, value: results.database_correct,                              icon: <Database size={18}/>,    c: '#10b981' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.c}15`, color: s.c }}
              >
                {s.icon}
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ fontFamily: '"Clash Display", sans-serif', color: s.c }}>
                  {s.value}
                </div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Answer breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-card rounded-3xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={16} className="text-indigo-500" />
            <span className="font-semibold text-sm text-slate-700">{t.quiz.myResults}</span>
          </div>

          <div className="space-y-2">
            {results.answers?.map((ans, i) => {
              // Results API may return pre-localised text, or bilingual fields.
              // Support both: prefer text_kz/text_ru if present, fall back to question_text.
              const questionLabel = lang === 'kz'
                ? (ans.question_text_kz || ans.question_text)
                : (ans.question_text_ru || ans.question_text)

              const options = lang === 'kz'
                ? (ans.options_kz || ans.options)
                : (ans.options_ru || ans.options)

              return (
                <motion.div
                  key={ans.question_id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.03 }}
                >
                  <button
                    onClick={() => setOpenAnswer(openAnswer === ans.question_id ? null : ans.question_id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/40 transition-colors text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={ans.is_correct
                        ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                        : { background: 'rgba(239,68,68,0.12)',  color: '#ef4444' }
                      }
                    >
                      {ans.is_correct ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                    </div>
                    <span className="flex-1 text-sm text-slate-700 truncate">{questionLabel}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={ans.category === 'network'
                        ? { background: 'rgba(99,102,241,0.1)',  color: '#6366f1' }
                        : { background: 'rgba(16,185,129,0.1)',  color: '#10b981' }
                      }
                    >
                      {ans.category === 'network' ? t.quiz.network : t.quiz.database}
                    </span>
                  </button>

                  <AnimatePresence>
                    {openAnswer === ans.question_id && options && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-3 pb-3 pt-1 space-y-1.5">
                          {options.map((opt, oi) => (
                            <div
                              key={oi}
                              className="flex items-center gap-2 p-2 rounded-xl text-xs"
                              style={oi === ans.correct_index
                                ? { background: 'rgba(16,185,129,0.1)',  color: '#065f46', border: '1px solid rgba(16,185,129,0.2)' }
                                : oi === ans.chosen_index && !ans.is_correct
                                  ? { background: 'rgba(239,68,68,0.08)', color: '#7f1d1d', border: '1px solid rgba(239,68,68,0.15)' }
                                  : { background: 'rgba(255,255,255,0.4)', color: '#64748b' }
                              }
                            >
                              <span
                                className="w-5 h-5 rounded-md flex items-center justify-center font-bold flex-shrink-0"
                                style={{ background: 'rgba(255,255,255,0.6)' }}
                              >
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {opt}
                              {oi === ans.correct_index && (
                                <CheckCircle2 size={12} className="ml-auto text-emerald-500 flex-shrink-0"/>
                              )}
                              {oi === ans.chosen_index && !ans.is_correct && (
                                <XCircle size={12} className="ml-auto text-red-400 flex-shrink-0"/>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}