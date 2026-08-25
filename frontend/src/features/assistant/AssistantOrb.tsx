import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

import { useAssistantStore } from '../../state/assistantStore'
import { OrbRenderer } from './orb/engine'
import type { OrbSignals } from './orb/engine'

function readOrbSignals(): OrbSignals {
  const s = useAssistantStore.getState()
  return { state: s.state, micLevel: s.audioLevel, playbackLevel: s.playbackLevel }
}

interface AssistantOrbProps {
  interactive?: boolean
  disabled?: boolean
  onClick?: () => void
  label?: string
  detail?: 'full' | 'compact'
}

export function AssistantOrb({
  interactive = false,
  disabled = false,
  onClick,
  label = 'VoxPilot',
  detail = 'full',
}: AssistantOrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const engine = new OrbRenderer(canvas, readOrbSignals, detail)
    engine.setReducedMotion(!!reducedMotion)

    const resize = () => {
      // clientWidth/clientHeight are layout dimensions, unaffected by the CSS
      // transform applied during the hero→workspace shared-element (layoutId)
      // transition. getBoundingClientRect() would return the transiently scaled
      // size and blow up the compact orb's canvas.
      engine.resize(
        Math.min(container.clientWidth, container.clientHeight),
        window.devicePixelRatio || 1,
      )
    }
    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(container)

    if (reducedMotion) {
      engine.drawOnce(performance.now())
    } else {
      engine.start()
    }

    return () => {
      observer.disconnect()
      engine.dispose()
    }
  }, [detail, reducedMotion])

  return (
    <div ref={containerRef} className="relative h-full w-full" style={{ aspectRatio: '1' }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      />
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
