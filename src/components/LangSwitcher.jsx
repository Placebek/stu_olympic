import { useLang } from '../context/LangContext'

export default function LangSwitcher() {
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
        <button
          key={l}
          onClick={() => switchLang(l)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide"
          style={{
            color: lang === l ? '#fff' : '#64748b',
            background: lang === l ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
            transition: 'background 0.2s ease, color 0.2s ease',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          {t.lang[l]}
        </button>
      ))}
    </div>
  )
}
