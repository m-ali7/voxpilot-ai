import { useCallback, useEffect, useRef, useState } from 'react'

export type MicPermission = 'unknown' | 'granted' | 'denied' | 'unsupported'

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export interface MicrophoneController {
  isSupported: boolean
  permission: MicPermission
  isRecording: boolean
  error: string | null
  requestPermission: () => Promise<MicPermission>
  startRecording: (onLevel?: (level: number) => void) => Promise<void>
  stopRecording: () => Promise<Blob>
}

/**
 * Browser microphone capture abstraction.
 *
 * Handles permission, MediaRecorder lifecycle and amplitude monitoring. The
 * `onLevel` callback emits a smoothed 0..1 amplitude value used to drive the
 * orb's reactivity while listening.
 */
export function useMicrophone(): MicrophoneController {
  const [permission, setPermission] = useState<MicPermission>('unknown')
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<MicPermission> => {
    if (!isSupported) {
      setPermission('unsupported')
      return 'unsupported'
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setPermission('granted')
      setError(null)
      return 'granted'
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      setPermission('denied')
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access was denied. You can still type your request.'
          : 'Unable to access the microphone.',
      )
      return 'denied'
    }
  }, [isSupported])

  const startRecording = useCallback(
    async (onLevel?: (level: number) => void) => {
      let stream = streamRef.current
      if (!stream) {
        const perm = await requestPermission()
        if (perm !== 'granted') return
        stream = streamRef.current
      }
      if (!stream) return

      chunksRef.current = []
      const mimeType = pickMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.start()
      setIsRecording(true)
      setError(null)

      if (onLevel) {
        const AudioContextCtor = window.AudioContext
        const context = audioContextRef.current ?? new AudioContextCtor()
        audioContextRef.current = context
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)

        const data = new Uint8Array(analyser.fftSize)
        const loop = () => {
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i += 1) {
            const value = (data[i] - 128) / 128
            sum += value * value
          }
          const rms = Math.sqrt(sum / data.length)
          onLevel(Math.min(1, rms * 4))
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      }
    },
    [requestPermission],
  )

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current
      if (!recorder) {
        reject(new Error('Not recording.'))
        return
      }
      recorder.onstop = () => {
        setIsRecording(false)
        stopLevelLoop()
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        recorderRef.current = null
        resolve(blob)
      }
      recorder.stop()
    })
  }, [stopLevelLoop])

  useEffect(() => {
    return () => {
      stopLevelLoop()
      recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      void audioContextRef.current?.close()
    }
  }, [stopLevelLoop])

  return {
    isSupported,
    permission,
    isRecording,
    error,
    requestPermission,
    startRecording,
    stopRecording,
  }
}
