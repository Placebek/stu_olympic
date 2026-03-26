import { motion } from 'framer-motion'

export default function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      {/* Main gradient base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #e8eaff 0%, #f0f4ff 30%, #e8f4fd 60%, #ede8ff 100%)',
        }}
      />

      {/* Blob 1 – indigo */}
      <motion.div
        className="aurora-blob"
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 600, height: 600,
          top: '-10%', left: '-10%',
          background: 'radial-gradient(circle, rgba(165,180,252,0.55) 0%, transparent 70%)',
        }}
      />

      {/* Blob 2 – violet */}
      <motion.div
        className="aurora-blob"
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -20, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{
          width: 700, height: 700,
          top: '20%', right: '-15%',
          background: 'radial-gradient(circle, rgba(196,181,253,0.45) 0%, transparent 70%)',
        }}
      />

      {/* Blob 3 – cyan */}
      <motion.div
        className="aurora-blob"
        animate={{
          x: [0, 30, -40, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.05, 0.98, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        style={{
          width: 500, height: 500,
          bottom: '-10%', left: '20%',
          background: 'radial-gradient(circle, rgba(147,210,255,0.4) 0%, transparent 70%)',
        }}
      />

      {/* Blob 4 – rose accent */}
      <motion.div
        className="aurora-blob"
        animate={{
          x: [0, -20, 50, 0],
          y: [0, 50, -30, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
        style={{
          width: 400, height: 400,
          bottom: '10%', right: '10%',
          background: 'radial-gradient(circle, rgba(251,207,232,0.45) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
