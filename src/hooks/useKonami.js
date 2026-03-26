import { useEffect, useState, useCallback } from 'react'

const KONAMI = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'b','a'
]

export function useKonami(callback) {
  const [seq, setSeq] = useState([])

  const onKey = useCallback((e) => {
    setSeq(prev => {
      const next = [...prev, e.key].slice(-KONAMI.length)
      if (next.join(',') === KONAMI.join(',')) {
        callback?.()
        return []
      }
      return next
    })
  }, [callback])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])
}

// Easter egg: triple click on logo
export function useTripleClick(callback) {
  const [clicks, setClicks] = useState(0)
  const [timer, setTimer] = useState(null)

  return () => {
    const count = clicks + 1
    setClicks(count)
    if (timer) clearTimeout(timer)
    const t = setTimeout(() => setClicks(0), 600)
    setTimer(t)
    if (count >= 3) {
      setClicks(0)
      callback?.()
    }
  }
}
