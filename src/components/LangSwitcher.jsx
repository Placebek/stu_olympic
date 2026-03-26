import { motion } from 'framer-motion'
import { useLang } from '../context/LangContext'

export default function LangSwitcher({ compact = false }) {
  const { lang, switchLang, t } = useLang()

  return (
    <div
      className="flex items-center rounded-xl p-0.5 gap-0.5"
      style={{
        background: 'rgba(255,255,255,0.45)',
        border: '1px solid rgba(255,255,255,0.7)',
      }}
    >
      {['kz', 'ru'].map((l) => (
        <motion.button
          key={l}
          onClick={() => switchLang(l)}
          whileTap={{ scale: 0.93 }}
          className="relative px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors duration-200"
          style={{
            color: lang === l ? '#fff' : '#64748b',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          {lang === l && (
            <motion.div
              layoutId="lang-pill"
              className="absolute inset-0 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{t.lang[l]}</span>
        </motion.button>
      ))}
    </div>
  )
}
