import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * AuroraBackground — оптимизированная версия
 *
 * БЫЛО:  4× <motion.div animate={{x,y,scale}}>
 *        Framer Motion обновлял transform через JS на каждом RAF → main thread занят
 *        → compositor не мог работать независимо → jank при скролле
 *
 * СТАЛО: Нативные CSS @keyframes c transform: translate() scale()
 *        → анимация живёт целиком в compositor thread, main thread свободен
 *        will-change: transform в .aurora-blob → браузер заранее выделяет GPU-слой
 *        contain: strict → изолирует repaints каждого блоба
 *        На мобильных: blob-4 скрыт через media query (на 25% меньше слоёв)
 *        prefers-reduced-motion: animation: none через CSS media query
 */
export default function AuroraBackground() {
  const reduced = useReducedMotion()

  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="aurora-base" />
      {!reduced && (
        <>
          <div className="aurora-blob aurora-blob-1" />
          <div className="aurora-blob aurora-blob-2" />
          <div className="aurora-blob aurora-blob-3" />
          <div className="aurora-blob aurora-blob-4" />
        </>
      )}
    </div>
  )
}
