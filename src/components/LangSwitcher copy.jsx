import { useLang } from '../context/LangContext'

/**
 * LangSwitcher — оптимизированная версия
 *
 * БЫЛО:  <motion.div layoutId="lang-pill"> — layout animation
 *        Framer при каждом переключении запускал FLIP-анимацию:
 *        measure → animate → inverse → play → reflow на каждом кадре.
 *        layoutId работает глобально и может захватывать layout других элементов.
 *
 * СТАЛО: CSS transition на background + box-shadow.
 *        Только composite properties — нет reflow, нет repaint соседей.
 *        whileTap убран — заменён CSS :active { transform: scale(0.93) }.
 */
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
          className="relative px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide"
          style={{
            color: lang === l ? '#fff' : '#64748b',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            background: lang === l ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
            transition: 'background 0.2s ease, color 0.2s ease, transform 0.1s ease',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
          onMouseUp={e => { e.currentTarget.style.transform = '' }}
          onMouseLeave={e => { e.currentTarget.style.transform = '' }}
        >
          {t.lang[l]}
        </button>
      ))}
    </div>
  )
}
