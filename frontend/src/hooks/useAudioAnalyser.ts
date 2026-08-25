import { useCallback, useEffect, useMemo, useRef } from 'react'

export interface AudioAnalyser {
  /** Callback ref to attach to the HTMLAudioElement being analysed. */
  ref: (node: HTMLAudioElement | null) => void
  start: () => void
  stop: () => void
  isAvailable: () => boolean
}

/**
 * Progressive-enhancement wrapper around the Web Audio API that derives a
 * normalized 0..1 playback amplitude (RMS) from an <audio> element.
 *
 * Safety contract:
 * - The returned object identity is stable across renders (so callers can use
 *   it in effect dependency arrays without triggering render loops).
 * - createMediaElementSource is called at most once per element.
 * - Any Web Audio failure degrades gracefully: playback is unaffected, `start`
 *   is a no-op, and `isAvailable()` reports false. Nothing ever throws out of
 *   this hook.
 */
export function useAudioAnalyser(onLevel: (level: number) => void): AudioAnalyser {
  const elementRef = useRef<HTMLAudioElement | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const availableRef = useRef(false)
  const onLevelRef = useRef(onLevel)

  useEffect(() => {
    onLevelRef.current = onLevel
  }, [onLevel])

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const ref = useCallback((node: HTMLAudioElement | null) => {
    elementRef.current = node
  }, [])

  // Build the graph once per mounted element. createMediaElementSource may only
  // be called once per element, so we guard with analyserRef and never tear the
  // graph down (React StrictMode may re-run this effect; the guard makes it
  // idempotent).
  useEffect(() => {
    const element = elementRef.current
    if (!element || analyserRef.current) return
    try {
      const context = new AudioContext()
      contextRef.current = context
      const source = context.createMediaElementSource(element)
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.65
      source.connect(analyser)
      analyser.connect(context.destination)
      analyserRef.current = analyser
      availableRef.current = true
    } catch {
      availableRef.current = false
    }
  }, [])

  const start = useCallback(() => {
    const analyser = analyserRef.current
    if (!availableRef.current || !analyser || rafRef.current !== null) return
    try {
      if (contextRef.current?.state === 'suspended') void contextRef.current.resume()
    } catch {
      // ignore — analyser will read silence
    }
    const data = new Uint8Array(analyser.frequencyBinCount)
    const loop = () => {
      try {
        analyser.getByteTimeDomainData(data)
      } catch {
        stop()
        return
      }
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128
        sum += value * value
      }
      const rms = Math.sqrt(sum / data.length)
      onLevelRef.current(Math.min(1, rms * 3))
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }, [stop])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return useMemo(
    () => ({
      ref,
      start,
      stop,
      isAvailable: () => availableRef.current,
    }),
    [ref, start, stop],
  )
}
