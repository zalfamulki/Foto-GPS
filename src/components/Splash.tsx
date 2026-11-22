import { useReducedMotion, motion } from 'motion/react'

/** Layar pembuka: pin jatuh, gelombang GPS mengembang, lalu memudar ke aplikasi. */
export default function Splash() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-canvas"
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      <motion.div
        className="relative flex h-32 w-32 items-center justify-center"
        initial={reduce ? { opacity: 0 } : { y: -90, opacity: 0, rotate: -8 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={reduce ? { duration: 0.3 } : { type: 'spring', stiffness: 210, damping: 16 }}
      >
        {!reduce && (
          <>
            <motion.span
              className="absolute inset-1 rounded-full border-2 border-brand"
              animate={{ scale: [0.6, 1.9], opacity: [0.55, 0] }}
              transition={{ duration: 1.15, repeat: 1, delay: 0.35, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute inset-1 rounded-full border-2 border-brand"
              animate={{ scale: [0.6, 1.9], opacity: [0.55, 0] }}
              transition={{ duration: 1.15, repeat: 1, delay: 0.75, ease: 'easeOut' }}
            />
          </>
        )}
        <svg viewBox="0 0 512 512" className="h-24 w-24" aria-hidden="true">
          <path
            d="M256 92c-70.7 0-128 57.3-128 128 0 24.4 7.6 44.3 20.6 64.6 13.3 20.7 31.5 40.6 48.9 57.9 17.3 17.2 34.7 31.6 47.9 41.3a17.4 17.4 0 0 0 21.2 0c13.2-9.7 30.6-24.1 47.9-41.3 17.4-17.3 35.6-37.2 48.9-57.9 13-20.3 20.6-40.2 20.6-64.6 0-70.7-57.3-128-128-128z"
            fill="#f5a524"
          />
          <circle cx="256" cy="216" r="64" fill="#24211b" />
          <circle cx="256" cy="216" r="42" fill="#f5a524" />
          <circle cx="256" cy="216" r="18" fill="#24211b" />
          <circle cx="239" cy="199" r="7" fill="#f5a524" />
        </svg>
      </motion.div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        <motion.h1
          className="text-2xl font-extrabold tracking-tight text-ink"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          Lokasnap
        </motion.h1>
        <motion.p
          className="text-sm text-muted"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Menyiapkan kamera dan lokasi Anda
        </motion.p>
      </div>

      <motion.div
        className="absolute bottom-12 flex gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brand-ink"
            animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
