import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLang } from '../context/LangContext'

export default function EasterEgg({ trigger }) {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (trigger) {
      const msgs = t.easter
      setMsg(msgs[Math.floor(Math.random() * msgs.length)])
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 3500)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity:0, y:50, scale:0.8 }}
          animate={{ opacity:1, y:0, scale:1 }}
          exit={{ opacity:0, y:50, scale:0.8 }}
          transition={{ type:'spring', stiffness:300, damping:20 }}
          className="fixed bottom-6 left-1/2 z-[100]"
          style={{ transform:'translateX(-50%)' }}
        >
          <div className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', boxShadow:'0 8px 32px rgba(99,102,241,0.5)', fontFamily:'"JetBrains Mono", monospace' }}>
            {msg}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
