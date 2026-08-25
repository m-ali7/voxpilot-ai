// @vitest-environment jsdom
import { render, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAudioAnalyser } from './useAudioAnalyser'

describe('useAudioAnalyser', () => {
  it('returns a stable object identity across renders (prevents effect render loops)', () => {
    const { result, rerender } = renderHook(() => useAudioAnalyser(() => {}))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
    expect(result.current.start).toBe(first.start)
    expect(result.current.stop).toBe(first.stop)
    expect(result.current.ref).toBe(first.ref)
  })

  it('start/stop are safe to call repeatedly and never throw', () => {
    const { result } = renderHook(() => useAudioAnalyser(() => {}))
    expect(() => {
      result.current.start()
      result.current.start()
      result.current.stop()
      result.current.stop()
    }).not.toThrow()
  })

  it('reports unavailable when no analyser graph exists (graceful fallback)', () => {
    const { result } = renderHook(() => useAudioAnalyser(() => {}))
    expect(result.current.isAvailable()).toBe(false)
  })

  it('attaching the ref to an audio element does not throw when Web Audio is unavailable', () => {
    function Harness() {
      const { ref: setElement } = useAudioAnalyser(() => {})
      return <audio ref={setElement} data-testid="audio" />
    }

    const { getByTestId } = render(<Harness />)
    expect(getByTestId('audio')).toBeTruthy()
  })
})
