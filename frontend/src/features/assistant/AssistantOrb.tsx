import { useEffect } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

import type { AssistantState } from '../../types/assistant'

interface Palette {
  a: string
  b: string
  c: string
  glow: string
}

const PALETTES: Record<AssistantState, Palette> = {
  idle: { a: '#3b82f6', b: '#2563eb', c: '#4338ca', glow: 'rgba(59,130,246,0.35)' },
  listening: { a: '#67e8f9', b: '#06b6d4', c: '#1d4ed8', glow: 'rgba(34,211,238,0.5)' },
  understanding: { a: '#a78bfa', b: '#7c3aed', c: '#4338ca', glow: 'rgba(139,92,246,0.45)' },
  retrieving: { a: '#5eead4', b: '#0d9488', c: '#1e3a8a', glow: 'rgba(45,212,191,0.45)' },
  thinking: { a: '#818cf8', b: '#4f46e5', c: '#312e81', glow: 'rgba(99,102,241,0.5)' },
  speaking: { a: '#93c5fd', b: '#2563eb', c: '#1e40af', glow: 'rgba(59,130,246,0.45)' },
  error: { a: '#fca5a5', b: '#dc2626', c: '#7f1d1d', glow: 'rgba(244,63,94,0.42)' },
}

// Ambient motion characteristics per state. `duration` controls the speed of the
// internal fluid drift (lower = more active); `drift` controls displacement.
const MOTION: Record<AssistantState, { duration: number; drift: number }> = {
  idle: { duration: 11, drift: 7 },
  listening: { duration: 4.5, drift: 11 },
  understanding: { duration: 6.5, drift: 5 },
  retrieving: { duration: 5, drift: 6 },
  thinking: { duration: 3.5, drift: 10 },
  speaking: { duration: 4.5, drift: 9 },
  error: { duration: 11, drift: 4 },
}

interface FluidBlobProps {
  color: string
  size: string
  blur: number
  x: string
  y: string
  duration: number
  drift: number
  scale: MotionValue<number>
  reducedMotion: boolean | null
}

function FluidBlob({
  color,
  size,
  blur,
  x,
  y,
  duration,
  drift,
  scale,
  reducedMotion,
}: FluidBlobProps) {
  return (
    <motion.div
      aria-hidden
      className="absolute rounded-full mix-blend-screen"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle at 38% 32%, ${color}, transparent 70%)`,
        filter: `blur(${blur}px)`,
        scale,
      }}
      animate={
        reducedMotion
          ? { borderRadius: '50%' }
          : {
              borderRadius: [
                '42% 58% 60% 40% / 46% 42% 58% 54%',
                '58% 42% 46% 54% / 52% 58% 42% 48%',
                '44% 56% 52% 48% / 46% 52% 48% 54%',
                '42% 58% 60% 40% / 46% 42% 58% 54%',
              ],
              x: [0, drift, -drift * 0.6, 0],
              y: [0, -drift * 0.7, drift * 0.5, 0],
              rotate: [0, 14, -10, 0],
            }
      }
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

interface AssistantOrbProps {
  state: AssistantState
  level: number
  playbackLevel?: number
  interactive?: boolean
  disabled?: boolean
  onClick?: () => void
  label?: string
  detail?: 'full' | 'compact'
}

export function AssistantOrb({
  state,
  level,
  playbackLevel = 0,
  interactive = false,
  disabled = false,
  onClick,
  label = 'VoxPilot',
  detail = 'full',
}: AssistantOrbProps) {
  const reducedMotion = useReducedMotion()
  const palette = PALETTES[state]
  const motionConf = MOTION[state]

  // Single normalized activity value: mic level while listening, playback
  // level while speaking, otherwise ambient (0).
  const activity = useSpring(0, { stiffness: 160, damping: 28 })

  useEffect(() => {
    const raw =
      state === 'listening' ? level : state === 'speaking' ? playbackLevel : 0
    activity.set(Math.min(1, Math.max(0, raw)))
  }, [level, playbackLevel, state, activity])

  // Amplitude drives non-uniform deformation (not whole-orb scaling) + glow.
  const deformA = useTransform(activity, (v) => 1 + v * 0.24)
  const deformB = useTransform(activity, (v) => 1 - v * 0.12)
  const deformC = useTransform(activity, (v) => 1 + v * 0.16)
  const glowOpacity = useTransform(activity, (v) => 0.5 + v * 0.5)
  const coreScale = useTransform(activity, (v) => 1 + v * 0.1)

  return (
    <div className="relative grid place-items-center" style={{ width: '100%', aspectRatio: '1' }}>
      {/* Ready pulse — signals the orb is interactive */}
      {state === 'idle' && !reducedMotion && <div aria-hidden className="orb-pulse absolute inset-0" />}

      {/* Atmosphere / bloom */}
      <motion.div
        aria-hidden
        className="absolute inset-[-6%] rounded-full"
        style={{
          background: `radial-gradient(circle, ${palette.glow}, transparent 66%)`,
          opacity: glowOpacity,
        }}
        animate={reducedMotion ? undefined : { scale: [1, 1.05, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Glass volume — translucent, no hard border */}
      <motion.div
        aria-hidden
        className="absolute inset-[4%] rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 32%, ${palette.a}59, ${palette.b}2e 46%, ${palette.c}1f 72%, transparent 80%)`,
          filter: 'blur(2px)',
        }}
        animate={reducedMotion ? undefined : { scale: [1, 1.03, 1], rotate: [0, 6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Rotational flow — retrieving / thinking */}
      {(state === 'retrieving' || state === 'thinking') && !reducedMotion && (
        <div
          aria-hidden
          className="absolute inset-[8%] rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${palette.a}00, ${palette.a}55, ${palette.a}00 40%)`,
            maskImage: 'radial-gradient(farthest-side, transparent 62%, #000 68%)',
            WebkitMaskImage: 'radial-gradient(farthest-side, transparent 62%, #000 68%)',
            animation: `orb-spin ${state === 'thinking' ? 3 : 6}s linear infinite`,
          }}
        />
      )}

      {/* Internal fluid forms */}
      <FluidBlob
        color={palette.a}
        size="52%"
        blur={14}
        x="24%"
        y="22%"
        duration={motionConf.duration}
        drift={motionConf.drift}
        scale={deformA}
        reducedMotion={reducedMotion}
      />
      <FluidBlob
        color={palette.b}
        size="44%"
        blur={16}
        x="38%"
        y="38%"
        duration={motionConf.duration * 1.15}
        drift={motionConf.drift}
        scale={deformB}
        reducedMotion={reducedMotion}
      />
      {detail !== 'compact' && (
        <FluidBlob
          color={palette.c}
          size="50%"
          blur={18}
          x="30%"
          y="30%"
          duration={motionConf.duration * 1.3}
          drift={motionConf.drift * 0.8}
          scale={deformC}
          reducedMotion={reducedMotion}
        />
      )}

      {/* Bright core */}
      <motion.div
        aria-hidden
        className="relative aspect-square w-[34%] rounded-full"
        style={{
          scale: coreScale,
          background: `radial-gradient(circle at 42% 36%, ${palette.a}ee, ${palette.b}88 55%, transparent 75%)`,
          filter: 'blur(1px)',
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
