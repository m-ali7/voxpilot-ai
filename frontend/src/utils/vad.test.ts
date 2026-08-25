import { describe, expect, it } from 'vitest'

import { DEFAULT_VAD_CONFIG, VoiceActivityDetector } from './vad'

interface Harness {
  vad: VoiceActivityDetector
  events: string[]
}

function makeVad(overrides: Partial<typeof DEFAULT_VAD_CONFIG> = {}): Harness {
  const events: string[] = []
  const vad = new VoiceActivityDetector(
    { ...DEFAULT_VAD_CONFIG, ...overrides },
    {
      onSpeechStart: () => events.push('start'),
      onSpeechEnd: () => events.push('end'),
      onNoSpeech: () => events.push('nospeech'),
    },
  )
  return { vad, events }
}

describe('VoiceActivityDetector', () => {
  it('confirms speech only after the confirmation window', () => {
    const { vad, events } = makeVad()
    vad.push(0.4, 0)
    vad.push(0.4, 60)
    expect(events).not.toContain('start')
    vad.push(0.4, 120)
    expect(events).toContain('start')
    expect(vad.speaking).toBe(true)
  })

  it('does not trigger on a single transient spike', () => {
    const { vad, events } = makeVad()
    vad.push(0.5, 0)
    vad.push(0.02, 40)
    vad.push(0.02, 120)
    vad.push(0.02, 200)
    expect(events).not.toContain('start')
    expect(vad.speaking).toBe(false)
  })

  it('tolerates a short pause but ends after sustained silence', () => {
    const { vad, events } = makeVad()
    for (let t = 0; t <= 1000; t += 50) vad.push(0.4, t)
    expect(vad.speaking).toBe(true)

    // brief ~300ms pause
    vad.push(0.02, 1100)
    vad.push(0.02, 1200)
    vad.push(0.02, 1300)
    expect(events).not.toContain('end')

    // resume
    vad.push(0.4, 1400)
    vad.push(0.4, 1500)
    vad.push(0.4, 1600)

    // sustained silence
    for (let t = 1700; t <= 2800; t += 100) vad.push(0.02, t)
    expect(events).toContain('end')
  })

  it('emits onNoSpeech after the no-speech timeout', () => {
    const { vad, events } = makeVad()
    for (let t = 0; t <= DEFAULT_VAD_CONFIG.noSpeechTimeoutMs; t += 200) vad.push(0.02, t)
    expect(events).toContain('nospeech')
    expect(vad.speaking).toBe(false)
  })

  it('enforces the maximum recording duration', () => {
    const { vad, events } = makeVad()
    for (let t = 0; t <= DEFAULT_VAD_CONFIG.maxRecordingMs + 100; t += 100) vad.push(0.4, t)
    expect(events).toContain('end')
  })

  it('ignores speech shorter than minSpeechMs as noise', () => {
    const { vad, events } = makeVad()
    vad.push(0.4, 0)
    vad.push(0.4, 120) // confirm start
    expect(events).toContain('start')
    vad.push(0.02, 150) // stop almost immediately
    for (let t = 150; t <= 150 + DEFAULT_VAD_CONFIG.endOfSpeechMs + 100; t += 100) {
      vad.push(0.02, t)
    }
    expect(events).not.toContain('end')
    expect(vad.speaking).toBe(false)
  })

  it('ignores pushes after a terminal event', () => {
    const { vad, events } = makeVad()
    for (let t = 0; t <= DEFAULT_VAD_CONFIG.noSpeechTimeoutMs; t += 200) vad.push(0.02, t)
    expect(events).toContain('nospeech')
    const count = events.filter((e) => e === 'nospeech').length
    vad.push(0.4, DEFAULT_VAD_CONFIG.noSpeechTimeoutMs + 100)
    expect(events.filter((e) => e === 'nospeech')).toHaveLength(count)
  })

  it('cancel() prevents future events', () => {
    const { vad, events } = makeVad()
    vad.push(0.4, 0)
    vad.push(0.4, 120)
    expect(events).toContain('start')
    vad.cancel()
    for (let t = 150; t < 5000; t += 100) vad.push(0.02, t)
    expect(events).not.toContain('end')
    expect(events).not.toContain('nospeech')
    expect(vad.speaking).toBe(false)
  })

  it('adapts the threshold upward in a noisy room', () => {
    const { vad } = makeVad()
    for (let t = 0; t < 3000; t += 100) vad.push(0.06, t)
    expect(vad.threshold).toBeGreaterThan(DEFAULT_VAD_CONFIG.speechThresholdFloor)
    expect(vad.speaking).toBe(false)
  })

  it('reset() clears state for a new session', () => {
    const { vad, events } = makeVad()
    for (let t = 0; t <= DEFAULT_VAD_CONFIG.noSpeechTimeoutMs; t += 200) vad.push(0.02, t)
    expect(events).toContain('nospeech')

    vad.reset()
    vad.push(0.4, DEFAULT_VAD_CONFIG.noSpeechTimeoutMs + 100)
    vad.push(0.4, DEFAULT_VAD_CONFIG.noSpeechTimeoutMs + 220)
    expect(events).toContain('start')
  })
})
