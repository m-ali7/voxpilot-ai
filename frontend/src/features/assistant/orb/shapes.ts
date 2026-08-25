export interface Point {
  x: number
  y: number
}

/** Maximum |sin(a) + 0.4·sin(b)| — bounds the wobble term. */
export const MAX_WOBBLE_SUM = 1.4
/** How strongly energy boosts lobe deformation. */
export const ENERGY_BOOST = 1.7
/** Base orb radius as a fraction of the (overscanned) canvas dimension. */
export const ORB_RADIUS_FRACTION = 0.3
/** Outer bloom radius as a fraction of the (overscanned) canvas dimension. */
export const BLOOM_RADIUS_FRACTION = 0.42
/** Internal overscan factor: canvas is this many times the container. */
export const OVERSCAN = 1.5

export interface OrbGeometry {
  /** Canvas CSS dimension (px). */
  canvasCss: number
  /** Canvas backing-store dimension (device px). */
  backing: number
  /** Base orb radius in device px. */
  orbRadius: number
  /** Half the backing-store dimension (device px). */
  halfExtent: number
}

/**
 * Derive the render geometry for a given container size. The visible orb radius
 * is proportional to the container (container × OVERSCAN × ORB_RADIUS_FRACTION),
 * so hero and compact variants stay proportional without adopting each other's
 * dimensions.
 */
export function computeOrbGeometry(containerCss: number, dpr: number): OrbGeometry {
  const canvasCss = containerCss * OVERSCAN
  const backing = Math.max(1, Math.round(canvasCss * dpr))
  return {
    canvasCss,
    backing,
    orbRadius: backing * ORB_RADIUS_FRACTION,
    halfExtent: backing / 2,
  }
}

/** A single organic lobe's static geometry + motion parameters. */
export interface LobeSpec {
  /** Radius as a fraction of the orb radius (0..1). */
  baseRadius: number
  /** Center offset from the orb center as a fraction of the orb radius. */
  offsetX: number
  offsetY: number
  /** Phase offset (radians) to decorrelate lobes. */
  phase: number
  /** Base deformation amplitude. */
  wobbleAmp: number
  /** Deformation frequency (per second of simulation time). */
  wobbleFreq: number
  /** Variation of radius around the angular axis (organic asymmetry). */
  angularWobble: number
  /** Base opacity of the lobe. */
  alpha: number
}

export const LOBES: LobeSpec[] = [
  { baseRadius: 0.42, offsetX: 0.16, offsetY: -0.1, phase: 0.0, wobbleAmp: 0.1, wobbleFreq: 1.0, angularWobble: 3, alpha: 0.85 },
  { baseRadius: 0.34, offsetX: -0.2, offsetY: 0.12, phase: 2.1, wobbleAmp: 0.14, wobbleFreq: 1.3, angularWobble: 2, alpha: 0.7 },
  { baseRadius: 0.3, offsetX: 0.06, offsetY: 0.2, phase: 4.2, wobbleAmp: 0.12, wobbleFreq: 0.8, angularWobble: 4, alpha: 0.62 },
  { baseRadius: 0.26, offsetX: 0.24, offsetY: 0.16, phase: 1.3, wobbleAmp: 0.16, wobbleFreq: 1.6, angularWobble: 3, alpha: 0.55 },
  { baseRadius: 0.22, offsetX: -0.1, offsetY: -0.24, phase: 3.5, wobbleAmp: 0.13, wobbleFreq: 1.1, angularWobble: 5, alpha: 0.5 },
  { baseRadius: 0.18, offsetX: 0.1, offsetY: -0.04, phase: 5.5, wobbleAmp: 0.18, wobbleFreq: 2.0, angularWobble: 2, alpha: 0.45 },
]

/**
 * Compute the control points of a single organic lobe as a closed, smoothly
 * varying polygon. Pure and deterministic — unit-testable.
 */
export function computeLobePoints(
  cx: number,
  cy: number,
  baseR: number,
  t: number,
  spec: LobeSpec,
  energy: number,
  converge: number,
  orbit: number,
  timeScale: number,
): Point[] {
  const segments = 40
  const orbitAngle = orbit * 0.9 * Math.sin(t * 0.00035 * timeScale + spec.phase)
  const lx = cx + Math.cos(orbitAngle + spec.phase * 1.7) * spec.offsetX * baseR
  const ly = cy + Math.sin(orbitAngle + spec.phase) * spec.offsetY * baseR
  const r = baseR * (1 - converge * 0.55)
  const boost = 1 + energy * ENERGY_BOOST

  const points: Point[] = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    const w1 = Math.sin(spec.wobbleFreq * t * 0.001 * timeScale + spec.phase + spec.angularWobble * angle)
    const w2 =
      0.4 *
      Math.sin(spec.wobbleFreq * 1.7 * t * 0.001 * timeScale - spec.phase * 2 + (spec.angularWobble + 2) * angle)
    const radius = r * (1 + spec.wobbleAmp * (w1 + w2) * boost)
    points.push({ x: lx + Math.cos(angle) * radius, y: ly + Math.sin(angle) * radius })
  }
  return points
}

/**
 * Theoretical worst-case rendered radius as a fraction of the orb radius:
 * the maximum of (lobe center offset + lobe radius) across all lobes at the
 * given energy. Used to guarantee overscan headroom.
 */
export function maxRenderedRadiusFraction(energy: number): number {
  const boost = 1 + energy * ENERGY_BOOST
  let max = 0
  for (const spec of LOBES) {
    const radius = spec.baseRadius * (1 + spec.wobbleAmp * MAX_WOBBLE_SUM * boost)
    const offset = Math.hypot(spec.offsetX, spec.offsetY)
    max = Math.max(max, offset + radius)
  }
  return max
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Fill a smooth organic blob through the given control points. */
export function drawLobe(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  alpha: number,
): void {
  if (points.length < 3) return
  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
  }
  cx /= points.length
  cy /= points.length

  let maxR = 0
  for (const p of points) {
    const dx = p.x - cx
    const dy = p.y - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > maxR) maxR = d
  }
  if (maxR <= 0) return

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
  grad.addColorStop(0, rgba(color, alpha))
  grad.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = grad

  ctx.beginPath()
  const first = points[0]
  const last = points[points.length - 1]
  ctx.moveTo((first.x + last.x) / 2, (first.y + last.y) / 2)
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]
    const next = points[(i + 1) % points.length]
    const mx = (p.x + next.x) / 2
    const my = (p.y + next.y) / 2
    ctx.quadraticCurveTo(p.x, p.y, mx, my)
  }
  ctx.closePath()
  ctx.fill()
}
