import { useEffect } from 'react'
import { motion, useReducedMotion, useSpring } from 'framer-motion'

import type { AssistantState } from '../../types/assistant'

interface OrbVisuals {
  label: string
  glow: string
  core: string
  ring: string
  ringSpeed: string
  segmented: boolean
  morph: string[] | string
  morphDuration: number
  scale: number
}

const IDLE_MORPH = [
  '46% 54% 52% 48% / 50% 46% 54% 50%',
  '53% 47% 45% 55% / 47% 54% 46% 53%',
  '46% 54% 52% 48% / 50% 46% 54% 50%',
]

const VISUALS: Record<AssistantState, OrbVisuals> = {
  idle: {
    label: 'Ready',
    glow: 'rgba(59,130,246,0.35)',
    core: 'radial-gradient(circle at 35% 30%, #3b82f6 0%, #1d4ed8 34%, #0b1220 78%)',
    ring: 'conic-gradient(from 0deg, rgba(96,165,250,0.9), rgba(96,165,250,0) 40%, rgba(139,92,246,0.7) 55%, rgba(96,165,250,0) 80%, rgba(96,165,250,0.9))',
    ringSpeed: '22s',
    segmented: false,
    morph: IDLE_MORPH,
    morphDuration: 7,
    scale: 1,
  },
  listening: {
    label: 'Listening',
    glow: 'rgba(34,211,238,0.55)',
    core: 'radial-gradient(circle at 35% 30%, #67e8f9 0%, #06b6d4 30%, #0b1220 76%)',
    ring: 'conic-gradient(from 0deg, rgba(103,232,249,0.95), rgba(103,232,249,0) 35%, rgba(56,189,248,0.8) 55%, rgba(103,232,249,0) 80%, rgba(103,232,249,0.95))',
    ringSpeed: '7s',
    segmented: false,
    morph: '50%',
    morphDuration: 0.4,
    scale: 1.18,
  },
  understanding: {
    label: 'Understanding',
    glow: 'rgba(139,92,246,0.5)',
    core: 'radial-gradient(circle at 35% 30%, #a78bfa 0%, #7c3aed 32%, #0b1220 78%)',
    ring: 'conic-gradient(from 0deg, rgba(167,139,250,0.9), rgba(167,139,250,0) 40%, rgba(99,102,241,0.7) 60%, rgba(167,139,250,0) 82%, rgba(167,139,250,0.9))',
    ringSpeed: '12s',
    segmented: false,
    morph: '50%',
    morphDuration: 0.5,
    scale: 0.96,
  },
  retrieving: {
    label: 'Gathering intelligence',
    glow: 'rgba(45,212,191,0.5)',
    core: 'radial-gradient(circle at 35% 30%, #5eead4 0%, #0d9488 32%, #0b1220 78%)',
    ring: 'repeating-conic-gradient(from 0deg, rgba(94,234,212,0.95) 0deg 8deg, rgba(94,234,212,0) 8deg 30deg)',
    ringSpeed: '14s',
    segmented: true,
    morph: '50%',
    morphDuration: 0.5,
    scale: 0.98,
  },
  thinking: {
    label: 'Thinking',
    glow: 'rgba(99,102,241,0.55)',
    core: 'radial-gradient(circle at 35% 30%, #818cf8 0%, #4f46e5 30%, #0b1220 76%)',
    ring: 'conic-gradient(from 0deg, rgba(129,140,248,1), rgba(129,140,248,0) 30%, rgba(99,102,241,0.9) 55%, rgba(129,140,248,0) 78%, rgba(129,140,248,1))',
    ringSpeed: '5s',
    segmented: false,
    morph: '50%',
    morphDuration: 0.4,
    scale: 0.94,
  },
  speaking: {
    label: 'Speaking',
    glow: 'rgba(59,130,246,0.5)',
    core: 'radial-gradient(circle at 35% 30%, #93c5fd 0%, #2563eb 32%, #0b1220 78%)',
    ring: 'conic-gradient(from 0deg, rgba(147,197,253,0.95), rgba(147,197,253,0) 38%, rgba(59,130,246,0.8) 58%, rgba(147,197,253,0) 80%, rgba(147,197,253,0.95))',
    ringSpeed: '10s',
    segmented: false,
    morph: '50%',
    morphDuration: 0.5,
    scale: 1.08,
  },
  error: {
    label: 'Something went wrong',
    glow: 'rgba(251,146,60,0.4)',
    core: 'radial-gradient(circle at 35% 30%, #fca5a5 0%, #dc2626 30%, #0b1220 78%)',
    ring: 'conic-gradient(from 0deg, rgba(252,165,165,0.9), rgba(252,165,165,0) 40%, rgba(251,146,60,0.7) 60%, rgba(252,165,165,0) 80%, rgba(252,165,165,0.9))',
    ringSpeed: '16s',
    segmented: false,
    morph: '50%',
    morphDuration: 0.5,
    scale: 1,
  },
}

interface AssistantOrbProps {
  state: AssistantState
  level: number
  interactive?: boolean
  disabled?: boolean
  onClick?: () => void
  label?: string
}

export function AssistantOrb({
  state,
  level,
  interactive = false,
  disabled = false,
  onClick,
  label = 'VoxPilot',
}: AssistantOrbProps) {
  const reducedMotion = useReducedMotion()
  const visuals = VISUALS[state]
  const scale = useSpring(1, { stiffness: 240, damping: 22 })

  useEffect(() => {
    const target =
      state === 'listening' ? visuals.scale + Math.min(level, 1) * 0.2 : visuals.scale
    scale.set(target)
  }, [level, state, scale, visuals.scale])

  const morph = reducedMotion ? '50%' : visuals.morph

  return (
    <div className="relative grid place-items-center" style={{ width: '100%', aspectRatio: '1' }}>
      {/* Ready pulse — signals the orb is interactive */}
      {state === 'idle' && !reducedMotion && (
        <div
          aria-hidden
          className="orb-pulse absolute inset-0 rounded-full border border-blue-400/40"
        />
      )}

      {/* Ambient glow */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background: visuals.glow }}
        animate={{ opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rotating ring */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: visuals.ring,
          maskImage:
            'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
          WebkitMaskImage:
            'radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))',
          animation: reducedMotion
            ? 'none'
            : `orb-spin ${visuals.ringSpeed} linear infinite`,
        }}
      />

      {/* Core */}
      <motion.div
        aria-hidden
        className="relative aspect-square w-[82%]"
        style={{ scale, background: visuals.core }}
        animate={{ borderRadius: morph }}
        transition={{
          duration: visuals.morphDuration,
          repeat: state === 'idle' && !reducedMotion ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />

      {/* Invisible interactive surface */}
      {interactive && (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="absolute inset-0 z-10 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed"
        />
      )}
    </div>
  )
}
