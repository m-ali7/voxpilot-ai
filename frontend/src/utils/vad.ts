export type VadState = 'waiting' | 'speaking' | 'silence'

export interface VadConfig {
  /** Initial noise-floor estimate (normalized 0..1 RMS). */
  noiseFloorInit: number
  /** Absolute floor for the speech threshold. */
  speechThresholdFloor: number
  /** Threshold = max(floor, noiseFloor * factor), capped by speechThresholdCap. */
  speechThresholdFactor: number
  speechThresholdCap: number
  /** How long the level must stay above threshold before speech is confirmed. */
  speechStartConfirmMs: number
  /** Silence duration that ends a speech turn. */
  endOfSpeechMs: number
  /** Minimum accumulated speech time required to treat a turn as valid. */
  minSpeechMs: number
  /** Hard safety cap on total recording length. */
  maxRecordingMs: number
  /** How long to wait for speech before giving up (no-speech). */
  noSpeechTimeoutMs: number
}

export interface VadCallbacks {
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onNoSpeech?: () => void
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  noiseFloorInit: 0.02,
  speechThresholdFloor: 0.08,
  speechThresholdFactor: 2.0,
  speechThresholdCap: 0.45,
  speechStartConfirmMs: 120,
  endOfSpeechMs: 980,
  minSpeechMs: 400,
  maxRecordingMs: 15000,
  noSpeechTimeoutMs: 6000,
}

/**
 * Lightweight, browser-side voice activity detector.
 *
 * Consumes a normalized 0..1 RMS level (as already produced by useMicrophone)
 * and emits speech lifecycle events. It is deliberately framework- and
 * MediaRecorder-agnostic so it can be unit-tested and, later, swapped for
 * server-side/realtime VAD without touching the rest of the pipeline.
 */
export class VoiceActivityDetector {
  private state: VadState = 'waiting'
  private noiseFloor: number
  private recordingStartedAt = -1
  private lastNow = 0
  private startConfirmAt = -1
  private silenceAt = -1
  private speechDurationMs = 0
  private isSpeaking = false
  private finished = false

  private readonly config: VadConfig
  private readonly callbacks: VadCallbacks

  constructor(config: VadConfig, callbacks: VadCallbacks) {
    this.config = config
    this.callbacks = callbacks
    this.noiseFloor = config.noiseFloorInit
  }

  get speaking(): boolean {
    return this.isSpeaking
  }

  get threshold(): number {
    return Math.min(
      this.config.speechThresholdCap,
      Math.max(this.config.speechThresholdFloor, this.noiseFloor * this.config.speechThresholdFactor),
    )
  }

  /** 0..1 progress through the current end-of-speech silence window. */
  get silenceProgress(): number {
    if (this.state !== 'silence' || this.silenceAt < 0) return 0
    return Math.min(1, (this.lastNow - this.silenceAt) / this.config.endOfSpeechMs)
  }

  reset(): void {
    this.state = 'waiting'
    this.noiseFloor = this.config.noiseFloorInit
    this.recordingStartedAt = -1
    this.lastNow = 0
    this.startConfirmAt = -1
    this.silenceAt = -1
    this.speechDurationMs = 0
    this.isSpeaking = false
    this.finished = false
  }

  /** Disable future events (e.g. on manual stop). */
  cancel(): void {
    this.finished = true
    this.isSpeaking = false
  }

  /** Feed a level sample. Returns the current `speaking` state. */
  push(level: number, now: number = performance.now()): boolean {
    if (this.finished) return false
    if (this.recordingStartedAt < 0) {
      this.recordingStartedAt = now
      this.lastNow = now
    }

    const delta = Math.max(0, now - this.lastNow)
    this.lastNow = now
    const lvl = Math.max(0, Math.min(1, level))
    const thr = this.threshold

    // Accumulate speaking time for the frame we just spent in 'speaking'.
    if (this.state === 'speaking') {
      this.speechDurationMs += delta
    }

    switch (this.state) {
      case 'waiting': {
        if (lvl < thr) this.adaptNoiseFloor(lvl)

        if (now - this.recordingStartedAt >= this.config.noSpeechTimeoutMs) {
          this.finish()
          this.callbacks.onNoSpeech?.()
          return false
        }

        if (lvl >= thr) {
          if (this.startConfirmAt < 0) this.startConfirmAt = now
          if (now - this.startConfirmAt >= this.config.speechStartConfirmMs) {
            this.state = 'speaking'
            this.isSpeaking = true
            this.callbacks.onSpeechStart?.()
          }
        } else {
          this.startConfirmAt = -1
        }
        return this.isSpeaking
      }

      case 'speaking': {
        if (now - this.recordingStartedAt >= this.config.maxRecordingMs) {
          this.finish()
          this.callbacks.onSpeechEnd?.()
          return false
        }
        if (lvl < thr) {
          this.state = 'silence'
          this.silenceAt = now
        }
        return this.isSpeaking
      }

      case 'silence': {
        if (lvl >= thr) {
          this.state = 'speaking'
          this.silenceAt = -1
          return this.isSpeaking
        }
        if (now - this.silenceAt >= this.config.endOfSpeechMs) {
          if (this.speechDurationMs >= this.config.minSpeechMs) {
            this.finish()
            this.callbacks.onSpeechEnd?.()
            return false
          }
          // Speech too short — treat as noise and keep listening.
          this.state = 'waiting'
          this.silenceAt = -1
          this.isSpeaking = false
          this.speechDurationMs = 0
          this.startConfirmAt = -1
        }
        return this.isSpeaking
      }
    }
  }

  private adaptNoiseFloor(level: number): void {
    this.noiseFloor = Math.max(
      this.config.noiseFloorInit,
      this.noiseFloor * 0.95 + level * 0.05,
    )
  }

  private finish(): void {
    this.finished = true
    this.isSpeaking = false
  }
}
