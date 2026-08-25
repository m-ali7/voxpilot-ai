import type { AssistantState } from '../../../types/assistant'
import { MOTION, PALETTES } from './palettes'
import {
  BLOOM_RADIUS_FRACTION,
  LOBES,
  ORB_RADIUS_FRACTION,
  computeLobePoints,
  computeOrbGeometry,
  drawLobe,
  rgba,
} from './shapes'

export interface OrbSignals {
  state: AssistantState
  micLevel: number
  playbackLevel: number
}

export type OrbDetail = 'full' | 'compact'

/**
 * Canvas 2D renderer for the VoxPilot orb. Owns the requestAnimationFrame
 * loop and draws organic, additive-blended lobes. It reads signals via a
 * provider callback so it stays decoupled from React/store — no per-frame
 * React re-renders.
 */
export class OrbRenderer {
  private readonly ctx: CanvasRenderingContext2D
  private rafId: number | null = null
  private reducedMotion = false
  private size = 0
  private dpr = 1
  private energy = 0

  private readonly canvas: HTMLCanvasElement
  private readonly getSignals: () => OrbSignals
  private readonly detail: OrbDetail

  constructor(canvas: HTMLCanvasElement, getSignals: () => OrbSignals, detail: OrbDetail) {
    this.canvas = canvas
    this.getSignals = getSignals
    this.detail = detail

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable.')
    this.ctx = ctx
  }

  /**
   * @param containerCssSize the orb container's layout CSS size (px). The
   *   backing store is inflated by OVERSCAN around it for transparent overscan.
   */
  resize(containerCssSize: number, dpr: number): void {
    if (containerCssSize <= 0) return
    this.dpr = dpr
    const geo = computeOrbGeometry(containerCssSize, dpr)
    this.canvas.width = geo.backing
    this.canvas.height = geo.backing
    this.canvas.style.width = `${geo.canvasCss}px`
    this.canvas.style.height = `${geo.canvasCss}px`
    this.size = geo.canvasCss
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
  }

  start(): void {
    if (this.rafId !== null) return
    const loop = (t: number) => {
      this.draw(t)
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  drawOnce(t: number = performance.now()): void {
    this.draw(t)
  }

  dispose(): void {
    this.stop()
  }

  private smoothEnergy(target: number): number {
    this.energy += (target - this.energy) * 0.12
    return this.energy
  }

  private draw(t: number): void {
    if (this.size <= 0) return
    const { state, micLevel, playbackLevel } = this.getSignals()
    const palette = PALETTES[state]
    const motion = MOTION[state]
    const rawEnergy = state === 'listening' ? micLevel : state === 'speaking' ? playbackLevel : 0
    const energy = this.reducedMotion
      ? 0
      : this.smoothEnergy(Math.max(0, Math.min(1, rawEnergy)))

    const size = this.size * this.dpr
    const c = size / 2
    const orbR = size * ORB_RADIUS_FRACTION
    const ctx = this.ctx

    ctx.clearRect(0, 0, size, size)
    ctx.globalCompositeOperation = 'lighter'

    // Outer bloom. Fades to a fully transparent version of the SAME glow
    // colour, and is well inside the overscanned canvas, so it never touches an
    // edge and no rectangular boundary is visible.
    const bloomR = size * BLOOM_RADIUS_FRACTION
    const bloom = ctx.createRadialGradient(c, c, orbR * 0.2, c, c, bloomR)
    bloom.addColorStop(0, rgba(palette.glow, palette.glowAlpha))
    bloom.addColorStop(1, rgba(palette.glow, 0))
    ctx.globalAlpha = this.reducedMotion ? 0.5 : 0.6 + energy * 0.4
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, size, size)
    ctx.globalAlpha = 1

    // Organic lobes
    const lobeCount = this.detail === 'compact' ? 3 : LOBES.length
    for (let i = 0; i < lobeCount; i += 1) {
      const spec = LOBES[i]
      const color = [palette.a, palette.b, palette.c][i % 3]
      const time = this.reducedMotion ? 0 : t
      const points = computeLobePoints(
        c,
        c,
        orbR,
        time,
        spec,
        energy,
        motion.converge,
        motion.orbit,
        motion.timeScale,
      )
      drawLobe(ctx, points, color, spec.alpha)
    }

    ctx.globalCompositeOperation = 'source-over'
  }
}
