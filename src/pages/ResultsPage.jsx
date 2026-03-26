import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { getRating, getMyRating } from '../utils/api'
import { Trophy, RefreshCw, Wifi, Database, FileCheck, Star, Crown, Medal } from 'lucide-react'

const RANK_CONFIG = {
  1: { emoji: '🥇', gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)', glow: 'rgba(251,191,36,0.35)', text: '#92400e', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  size: 'text-2xl' },
  2: { emoji: '🥈', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)', glow: 'rgba(100,116,139,0.25)', text: '#1e3a5f', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', size: 'text-xl'  },
  3: { emoji: '🥉', gradient: 'linear-gradient(135deg,#cd7c4e,#b45309)', glow: 'rgba(180,83,9,0.25)',   text: '#7c2d12', bg: 'rgba(205,124,78,0.1)',   border: 'rgba(205,124,78,0.3)',  size: 'text-xl'  },
}

const DEMO = [
  { rank:1, team_id:1, team_name:'Team Alpha',     variant:3, quiz_score:9, quiz_correct:9, quiz_total:10, quiz_completed:true,  tasks_submitted:1, tasks_correct:1, tasks_checked:1, total_score:14 },
  { rank:2, team_id:2, team_name:'NullPointers',   variant:7, quiz_score:8, quiz_correct:8, quiz_total:10, quiz_completed:true,  tasks_submitted:1, tasks_correct:1, tasks_checked:1, total_score:13 },
  { rank:3, team_id:3, team_name:'ByteForce',      variant:1, quiz_score:7, quiz_correct:7, quiz_total:10, quiz_completed:true,  tasks_submitted:1, tasks_correct:0, tasks_checked:1, total_score:7  },
  { rank:4, team_id:4, team_name:'Recursion Gang', variant:2, quiz_score:5, quiz_correct:5, quiz_total:10, quiz_completed:true,  tasks_submitted:0, tasks_correct:0, tasks_checked:0, total_score:5  },
  { rank:5, team_id:5, team_name:'Hello World',    variant:5, quiz_score:3, quiz_correct:3, quiz_total:10, quiz_completed:false, tasks_submitted:1, tasks_correct:0, tasks_checked:0, total_score:3  },
  { rank:6, team_id:6, team_name:'Code Monkeys',   variant:4, quiz_score:0, quiz_correct:0, quiz_total:10, quiz_completed:false, tasks_submitted:0, tasks_correct:0, tasks_checked:0, total_score:0  },
]

export default function ResultsPage() {
  const { t }         = useLang()
  const { token }     = useAuth()
  const [rating, setRating]       = useState([])
  const [myRank, setMyRank]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true)
    try {
      const [rRes, meRes] = await Promise.allSettled([
        getRating(),
        token ? getMyRating() : Promise.reject(),
      ])
      if (rRes.status === 'fulfilled') setRating(rRes.value.data)
      else setRating(DEMO)
      if (meRes.status === 'fulfilled') setMyRank(meRes.value.data)
    } catch {
      setRating(DEMO)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const podium   = rating.filter(r => r.rank <= 3)
  const rest     = rating.filter(r => r.rank > 3)
  const hasScores = rating.some(r => r.total_score > 0)

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 relative z-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
            style={{ background:'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow:'0 8px 32px rgba(251,191,36,0.35)' }}>
            <Trophy size={24} color="white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2" style={{ fontFamily:'"Clash Display", sans-serif' }}>
            {t.results.title}
          </h1>
          <p className="text-slate-500 text-sm">
            {hasScores ? `${rating.length} ${t.results.teamsTotal}` : t.results.notStarted}
          </p>

          {/* Formula hint */}
          <div className="inline-flex items-center gap-3 mt-3 px-4 py-2 rounded-xl"
            style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.15)' }}>
            <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              <Wifi size={11}/> +1
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <FileCheck size={11}/> +5
            </span>
          </div>

          <div className="mt-3">
            <motion.button onClick={() => load(true)} disabled={refreshing}
              whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-indigo-600 transition-colors"
              style={{ background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.7)' }}>
              <motion.div animate={refreshing ? { rotate:360 } : {}} transition={{ duration:1, repeat: refreshing ? Infinity : 0, ease:'linear' }}>
                <RefreshCw size={14}/>
              </motion.div>
              {t.results.refresh}
            </motion.button>
          </div>
        </motion.div>

        {/* My rank banner */}
        <AnimatePresence>
          {myRank && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="mb-5 rounded-2xl p-4 flex items-center gap-4"
              style={{ background:'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))', border:'1px solid rgba(99,102,241,0.2)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg"
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontFamily:'"Clash Display", sans-serif' }}>
                {myRank.rank}
              </div>
              <div className="flex-1">
                <p className="font-bold text-indigo-800 text-sm" style={{ fontFamily:'"Clash Display", sans-serif' }}>{t.results.myPlace}</p>
                <p className="text-xs text-indigo-600">{myRank.team_name} · #{myRank.variant}</p>
              </div>
              <ScoreBreakdown entry={myRank} t={t} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate:360 }} transition={{ duration:1.5, repeat:Infinity, ease:'linear' }}
              className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-500" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* Podium top-3 */}
            {podium.length > 0 && (
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Star size={16} className="text-amber-400" fill="currentColor"/>
                  <span className="font-semibold text-sm text-slate-700">{t.results.podiumTitle}</span>
                </div>
                <div className="space-y-3">
                  {podium.map((entry, idx) => {
                    const cfg = RANK_CONFIG[entry.rank]
                    return (
                      <motion.div key={entry.team_id}
                        initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4 p-4 rounded-2xl"
                        style={{ background: cfg.bg, border:`1px solid ${cfg.border}`, boxShadow: entry.rank === 1 ? `0 4px 20px ${cfg.glow}` : undefined }}>
                        {/* Medal */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                          style={{ background: cfg.gradient, boxShadow:`0 4px 12px ${cfg.glow}` }}>
                          {cfg.emoji}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate" style={{ fontFamily:'"Clash Display", sans-serif' }}>
                            {entry.team_name}
                          </p>
                          <p className="text-xs" style={{ color: cfg.text }}>#{entry.variant}</p>
                        </div>
                        {/* Score breakdown */}
                        <ScoreBreakdown entry={entry} t={t} />
                        {/* Total */}
                        <div className="text-right flex-shrink-0">
                          <div className={`font-black ${cfg.size}`} style={{ fontFamily:'"Clash Display", sans-serif', color: cfg.text }}>
                            {entry.total_score}
                          </div>
                          <p className="text-xs text-slate-400">{t.results.pts}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Rest of teams */}
            {rest.length > 0 && (
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
                className="glass-card rounded-3xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/40 flex items-center gap-2">
                  <Medal size={16} className="text-slate-400"/>
                  <span className="font-semibold text-sm text-slate-600">{t.results.allTeams}</span>
                </div>
                <div className="divide-y divide-white/30">
                  {rest.map((entry, idx) => (
                    <motion.div key={entry.team_id}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: 0.25 + idx * 0.04 }}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-white/20 transition-colors">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background:'rgba(148,163,184,0.15)', color:'#64748b' }}>
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{entry.team_name}</p>
                        <p className="text-xs text-slate-400">#{entry.variant}</p>
                      </div>
                      <ScoreBreakdown entry={entry} t={t} compact />
                      <div className="font-bold text-slate-700 text-sm flex-shrink-0" style={{ fontFamily:'"Clash Display", sans-serif' }}>
                        {entry.total_score} <span className="font-normal text-xs text-slate-400">{t.results.pts}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty */}
            {rating.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Trophy size={36} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">{t.results.notStarted}</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// Score breakdown pill component
function ScoreBreakdown({ entry, t, compact = false }) {
  if (compact) {
    return (
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {entry.quiz_completed && (
          <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1"
            style={{ background:'rgba(99,102,241,0.1)', color:'#6366f1' }}>
            <Wifi size={10}/> {entry.quiz_score}
          </span>
        )}
        {entry.tasks_checked > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1"
            style={{ background:'rgba(16,185,129,0.1)', color:'#059669' }}>
            <FileCheck size={10}/> {entry.tasks_correct * 5}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
      <div className="flex items-center gap-1 text-xs"
        style={{ color: entry.quiz_completed ? '#6366f1' : '#94a3b8' }}>
        <Wifi size={11}/>
        <span className="font-semibold">{entry.quiz_score}</span>
        <span className="opacity-60">/ {entry.quiz_total}</span>
      </div>
      <div className="flex items-center gap-1 text-xs"
        style={{ color: entry.tasks_checked > 0 ? '#059669' : '#94a3b8' }}>
        <FileCheck size={11}/>
        <span className="font-semibold">{entry.tasks_correct * 5}</span>
        <span className="opacity-60">({entry.tasks_correct}/{entry.tasks_submitted})</span>
      </div>
    </div>
  )
}
