import type { AssistantState } from '../../../types/assistant'

export interface StatePalette {
  /** Bright core color. */
  a: string
  /** Mid color. */
  b: string
  /** Deep/edge color. */
  c: string
  /** Outer bloom color (hex, no alpha). */
  glow: string
  /** Peak alpha of the outer bloom. */
  glowAlpha: number
}

export const PALETTES: Record<AssistantState, StatePalette> = {
  idle: { a: '#3b82f6', b: '#6366f1', c: '#1e40af', glow: '#3b82f6', glowAlpha: 0.32 },
  listening: { a: '#38bdf8', b: '#22d3ee', c: '#3b82f6', glow: '#22d3ee', glowAlpha: 0.5 },
  understanding: { a: '#a78bfa', b: '#8b5cf6', c: '#4f46e5', glow: '#8b5cf6', glowAlpha: 0.45 },
  retrieving: { a: '#2dd4bf', b: '#14b8a6', c: '#0ea5e9', glow: '#2dd4bf', glowAlpha: 0.42 },
  thinking: { a: '#818cf8', b: '#6366f1', c: '#a78bfa', glow: '#6366f1', glowAlpha: 0.5 },
  speaking: { a: '#60a5fa', b: '#3b82f6', c: '#818cf8', glow: '#3b82f6', glowAlpha: 0.45 },
  error: { a: '#f87171', b: '#dc2626', c: '#7f1d1d', glow: '#f87171', glowAlpha: 0.38 },
}

export interface StateMotion {
  /** Global motion speed multiplier. */
  timeScale: number
  /** How strongly amplitude drives deformation (listening/speaking). */
  energyScale: number
  /** Pull lobes toward center (0..1) — "absorbing" (understanding). */
  converge: number
  /** Orbital rotation strength (0..1) — "searching/circulating". */
  orbit: number
}

export const MOTION: Record<AssistantState, StateMotion> = {
  idle: { timeScale: 0.5, energyScale: 0, converge: 0, orbit: 0.12 },
  listening: { timeScale: 1.0, energyScale: 1.0, converge: 0, orbit: 0.16 },
  understanding: { timeScale: 0.7, energyScale: 0, converge: 0.3, orbit: 0.1 },
  retrieving: { timeScale: 0.9, energyScale: 0, converge: 0, orbit: 0.55 },
  thinking: { timeScale: 1.3, energyScale: 0, converge: 0.06, orbit: 0.65 },
  speaking: { timeScale: 1.0, energyScale: 1.0, converge: 0, orbit: 0.2 },
  error: { timeScale: 0.4, energyScale: 0, converge: 0.16, orbit: 0.05 },
}
