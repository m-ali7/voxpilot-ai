import { describe, expect, it } from 'vitest'

import type { AssistantState } from '../../../types/assistant'
import { MOTION } from './palettes'
import {
  BLOOM_RADIUS_FRACTION,
  LOBES,
  ORB_RADIUS_FRACTION,
  OVERSCAN,
  computeLobePoints,
  computeOrbGeometry,
  hexToRgb,
  maxRenderedRadiusFraction,
  rgba,
} from './shapes'
import type { Point } from './shapes'

function maxRadius(points: Point[]): number {
  let max = 0
  for (const p of points) {
    const d = Math.sqrt(p.x * p.x + p.y * p.y)
    if (d > max) max = d
  }
  return max
}

describe('computeLobePoints', () => {
  it('returns a closed set of points', () => {
    const points = computeLobePoints(100, 100, 100, 0, LOBES[0], 0, 0, 0, 1)
    expect(points.length).toBeGreaterThanOrEqual(3)
  })

  it('is deterministic for fixed inputs', () => {
    const a = computeLobePoints(0, 0, 100, 1234, LOBES[1], 0.5, 0, 0.2, 1)
    const b = computeLobePoints(0, 0, 100, 1234, LOBES[1], 0.5, 0, 0.2, 1)
    expect(a).toEqual(b)
  })

  it('deforms more (larger radius) with higher energy', () => {
    const quiet = computeLobePoints(0, 0, 100, 1000, LOBES[0], 0, 0, 0, 1)
    const loud = computeLobePoints(0, 0, 100, 1000, LOBES[0], 1, 0, 0, 1)
    expect(maxRadius(loud)).toBeGreaterThan(maxRadius(quiet))
  })

  it('changes shape over time (organic motion)', () => {
    const t0 = computeLobePoints(0, 0, 100, 0, LOBES[2], 0, 0, 0, 1)
    const t1 = computeLobePoints(0, 0, 100, 500, LOBES[2], 0, 0, 0, 1)
    expect(t0).not.toEqual(t1)
  })

  it('converges toward the center with higher converge value', () => {
    const open = computeLobePoints(0, 0, 100, 1000, LOBES[0], 0, 0, 0, 1)
    const converged = computeLobePoints(0, 0, 100, 1000, LOBES[0], 0, 0.5, 0, 1)
    expect(maxRadius(converged)).toBeLessThan(maxRadius(open))
  })
})

describe('hexToRgb / rgba', () => {
  it('converts 6-digit hex to rgb', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0])
  })

  it('converts 3-digit hex to rgb', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })

  it('builds rgba strings', () => {
    expect(rgba('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)')
  })
})

describe('orb overscan safety', () => {
  const STATES: AssistantState[] = [
    'idle',
    'listening',
    'understanding',
    'retrieving',
    'thinking',
    'speaking',
    'error',
  ]

  it('keeps the rendered radius within the canvas half-extent for every state', () => {
    for (const state of STATES) {
      // energy is only applied by listening/speaking; use its worst case.
      const energy = MOTION[state].energyScale > 0 ? 1 : 0
      const maxFraction = maxRenderedRadiusFraction(energy)
      const maxRendered = maxFraction * ORB_RADIUS_FRACTION
      expect(maxRendered).toBeLessThan(0.5)
    }
  })

  it('reserves a safety margin at peak amplitude', () => {
    const maxRendered = maxRenderedRadiusFraction(1) * ORB_RADIUS_FRACTION
    expect(0.5 - maxRendered).toBeGreaterThan(0.1)
  })

  it('keeps the bloom within the canvas', () => {
    expect(BLOOM_RADIUS_FRACTION).toBeLessThan(0.5)
  })
})

describe('orb presentation geometry (hero vs compact)', () => {
  it('visible orb radius is proportional to its own container, not the hero', () => {
    const hero = computeOrbGeometry(320, 1)
    const compact = computeOrbGeometry(44, 1)

    // Proportional: orbRadius = container × OVERSCAN × ORB_RADIUS_FRACTION.
    expect(compact.orbRadius).toBeCloseTo(44 * OVERSCAN * ORB_RADIUS_FRACTION, 5)
    expect(hero.orbRadius).toBeCloseTo(320 * OVERSCAN * ORB_RADIUS_FRACTION, 5)
    // Compact is far smaller than hero (does not adopt hero dimensions).
    expect(compact.orbRadius).toBeLessThan(hero.orbRadius)
    expect(compact.canvasCss).toBeLessThan(hero.canvasCss)
  })

  it('compact variant reserves overscan headroom for deformation', () => {
    const compact = computeOrbGeometry(44, 2) // retina
    const maxRendered = maxRenderedRadiusFraction(1) * compact.orbRadius
    expect(maxRendered).toBeLessThan(compact.halfExtent)
  })

  it('hero variant reserves overscan headroom for deformation', () => {
    const hero = computeOrbGeometry(320, 2) // retina
    const maxRendered = maxRenderedRadiusFraction(1) * hero.orbRadius
    expect(maxRendered).toBeLessThan(hero.halfExtent)
  })

  it('visible radius (CSS px) is independent of device pixel ratio', () => {
    const dpr1 = computeOrbGeometry(44, 1)
    const dpr2 = computeOrbGeometry(44, 2)
    expect(dpr1.orbRadius).toBeCloseTo(dpr2.orbRadius / 2, 5)
  })
})
