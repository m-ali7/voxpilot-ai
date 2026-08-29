import { useCallback, useEffect, useRef } from 'react'

import { createSession, mediaUrl, submitTurn, transcribeAudio } from '../../api/voxpilot'
import { VoxPilotSocket } from '../../api/ws'
import { useMicrophone } from '../../hooks/useMicrophone'
import { useAssistantStore } from '../../state/assistantStore'
import type { ProjectIntelligence } from '../../types/api'
import type { AssistantState } from '../../types/assistant'
import type { ServerEvent } from '../../types/events'
import { wait } from '../../utils/async'
import { normalizeError } from '../../utils/errors'
import { DEFAULT_VAD_CONFIG, VoiceActivityDetector } from '../../utils/vad'

// Non-streaming REST fallback: stage the visual states around the single
// round-trip. The WebSocket path replaces these with real lifecycle events.
const STAGE_MS = 650

const EMPTY_TRANSCRIPT_NOTICE = "I didn't catch anything \u2014 try again."
const NOTICE_DURATION_MS = 2200
const DELTA_FLUSH_MS = 50

// Stable imperative accessor — avoids subscribing the whole store (which would
// re-render on every high-frequency audioLevel/playbackLevel write).
const getState = useAssistantStore.getState

function newTurnId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function base64ToObjectUrl(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  return URL.createObjectURL(blob)
}

export interface AssistantFlow {
  state: AssistantState
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  toggleListening: () => Promise<void>
  submitText: (text: string) => Promise<void>
  startNewConversation: () => void
}

export function useAssistantFlow(): AssistantFlow {
  const state = useAssistantStore((s) => s.state)
  const mic = useMicrophone()
  const noticeTimerRef = useRef<number | null>(null)
  const vadRef = useRef<VoiceActivityDetector | null>(null)
  const lastSpeakingRef = useRef(false)
  const stopListeningRef = useRef<() => Promise<void>>(async () => {})
  const handleNoSpeechRef = useRef<() => Promise<void>>(async () => {})

  const socketRef = useRef<VoxPilotSocket | null>(null)
  if (socketRef.current === null) socketRef.current = new VoxPilotSocket()
  const activeTurnIdRef = useRef<string | null>(null)
  const deltaBufferRef = useRef('')
  const flushTimerRef = useRef<number | null>(null)

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
      noticeTimerRef.current = null
    }
  }, [])

  const showTransientNotice = useCallback(
    (message: string) => {
      getState().setError(null)
      getState().setNotice(message)
      getState().setState('error')
      clearNoticeTimer()
      noticeTimerRef.current = window.setTimeout(() => {
        getState().setNotice(null)
        if (getState().state === 'error') {
          getState().setState('idle')
        }
        noticeTimerRef.current = null
      }, NOTICE_DURATION_MS)
    },
    [clearNoticeTimer],
  )

  const handleFailure = useCallback((err: unknown) => {
    const normalized = normalizeError(err)
    if (normalized.detail) console.error('[voxpilot]', normalized.detail)
    getState().setError(normalized.message)
    getState().setState('error')
  }, [])

  const ensureSession = useCallback(async (): Promise<string> => {
    const current = getState().sessionId
    if (current) {
      socketRef.current?.connect(current)
      return current
    }
    const session = await createSession()
    getState().setSessionId(session.id)
    socketRef.current?.connect(session.id)
    return session.id
  }, [])

  const applyTurn = useCallback(
    (intent: string, project: ProjectIntelligence, response: string, audioUrl: string) => {
      getState().setIntent(intent)
      getState().setProject(project)
      getState().setResponse(response)
      getState().enqueueAudioSegment({ index: 0, url: mediaUrl(audioUrl) })
      getState().markAudioComplete()
      getState().setState('speaking')
    },
    [],
  )

  const flushDeltas = useCallback(() => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    const buffered = deltaBufferRef.current
    deltaBufferRef.current = ''
    if (buffered) getState().appendResponse(buffered)
  }, [])

  const scheduleFlush = useCallback(
    (delta: string) => {
      deltaBufferRef.current += delta
      if (flushTimerRef.current !== null) return
      flushTimerRef.current = window.setTimeout(() => {
        flushTimerRef.current = null
        flushDeltas()
      }, DELTA_FLUSH_MS)
    },
    [flushDeltas],
  )

  const handleServerEvent = useCallback(
    (event: ServerEvent) => {
      const turnId = activeTurnIdRef.current
      if (event.turn_id && turnId && event.turn_id !== turnId) return

      switch (event.type) {
        case 'session.ready':
          break
        case 'intent.resolved':
          getState().setIntent(event.intent)
          break
        case 'retrieval.started':
          getState().setState('retrieving')
          break
        case 'retrieval.completed':
          getState().setProject(event.project)
          break
        case 'response.started':
          getState().setState('thinking')
          getState().setResponse('')
          break
        case 'response.delta':
          scheduleFlush(event.delta)
          break
        case 'response.completed':
          flushDeltas()
          getState().setResponse(event.text)
          getState().setProject(event.project)
          break
        case 'audio.started':
          getState().setState('speaking')
          break
        case 'audio.chunk':
          getState().enqueueAudioSegment({
            index: event.index,
            url: base64ToObjectUrl(event.data),
          })
          break
        case 'audio.completed':
          getState().markAudioComplete()
          if (getState().audioQueue.length === 0) {
            getState().setState('idle')
          }
          break
        case 'turn.cancelled':
          break
        case 'error':
          getState().setError(event.message)
          getState().setState('error')
          break
      }
    },
    [scheduleFlush, flushDeltas],
  )

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    return socket.onEvent(handleServerEvent)
  }, [handleServerEvent])

  useEffect(() => {
    return () => {
      socketRef.current?.close()
    }
  }, [])

  const cancelActiveTurn = useCallback(() => {
    const sessionId = getState().sessionId
    const turnId = activeTurnIdRef.current
    if (turnId && sessionId) {
      socketRef.current?.cancelTurn(sessionId, turnId)
    }
    activeTurnIdRef.current = null
  }, [])

  const submitTurnViaTransport = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Barge-in: stop any current assistant playback before submitting.
      getState().clearAudio()
      getState().setUserTranscript(trimmed)
      getState().setError(null)
      getState().setNotice(null)
      clearNoticeTimer()

      try {
        const sessionId = await ensureSession()
        const socket = socketRef.current

        if (socket && (await socket.waitForOpen())) {
          const turnId = newTurnId()
          cancelActiveTurn()
          activeTurnIdRef.current = turnId
          getState().setState('understanding')
          socket.sendText(sessionId, turnId, trimmed)
          return
        }

        // REST fallback (existing staged pipeline).
        getState().setState('understanding')
        await wait(STAGE_MS)
        getState().setState('retrieving')
        await wait(STAGE_MS)
        getState().setState('thinking')
        const turn = await submitTurn(sessionId, trimmed)
        applyTurn(turn.intent, turn.project, turn.response, turn.audio_url)
      } catch (err) {
        handleFailure(err)
      }
    },
    [ensureSession, applyTurn, handleFailure, clearNoticeTimer, cancelActiveTurn],
  )

  const submitText = useCallback(
    async (text: string) => {
      await submitTurnViaTransport(text)
    },
    [submitTurnViaTransport],
  )

  const stopListening = useCallback(async () => {
    if (!mic.isRecording) return

    // Manual stop (or VAD auto-stop already fired): disable any pending VAD
    // event so only one stop/transcribe/submit sequence can occur.
    vadRef.current?.cancel()

    try {
      const blob = await mic.stopRecording()
      getState().setIsMicActive(false)
      getState().setIsUserSpeaking(false)
      getState().setNotice(null)
      clearNoticeTimer()
      getState().setState('understanding')

      const sessionId = await ensureSession()
      const { text } = await transcribeAudio(sessionId, blob)
      const trimmed = text.trim()

      if (!trimmed) {
        // Recoverable "didn't catch that" — do not create a turn or call providers.
        showTransientNotice(EMPTY_TRANSCRIPT_NOTICE)
        return
      }

      await submitTurnViaTransport(trimmed)
    } catch (err) {
      handleFailure(err)
    }
  }, [mic, ensureSession, handleFailure, showTransientNotice, clearNoticeTimer, submitTurnViaTransport])

  const handleNoSpeech = useCallback(async () => {
    if (!mic.isRecording) return
    vadRef.current?.cancel()
    try {
      await mic.stopRecording() // discard the silent blob — no transcription
    } catch {
      // ignore
    }
    getState().setIsMicActive(false)
    getState().setIsUserSpeaking(false)
    showTransientNotice(EMPTY_TRANSCRIPT_NOTICE)
  }, [mic, showTransientNotice])

  const startListening = useCallback(async () => {
    // Barge-in: stop any current assistant playback before listening.
    getState().clearAudio()
    getState().setError(null)
    getState().setNotice(null)
    clearNoticeTimer()

    if (!mic.isSupported) {
      getState().setError('Microphone is not supported in this browser. You can type your request instead.')
      getState().setState('error')
      return
    }

    const permission =
      mic.permission === 'granted' ? 'granted' : await mic.requestPermission()
    if (permission !== 'granted') {
      getState().setError(mic.error ?? 'Microphone access was denied. You can still type your request.')
      getState().setState('error')
      return
    }

    const vad = new VoiceActivityDetector(DEFAULT_VAD_CONFIG, {
      onSpeechEnd: () => {
        void stopListeningRef.current()
      },
      onNoSpeech: () => {
        void handleNoSpeechRef.current()
      },
    })
    vadRef.current = vad
    lastSpeakingRef.current = false
    getState().setIsUserSpeaking(false)

    getState().setState('listening')
    getState().setIsMicActive(true)
    await mic.startRecording((level) => {
      getState().setAudioLevel(level)
      const speaking = vad.push(level)
      if (speaking !== lastSpeakingRef.current) {
        lastSpeakingRef.current = speaking
        getState().setIsUserSpeaking(speaking)
      }
    })
  }, [mic, clearNoticeTimer])

  const toggleListening = useCallback(async () => {
    if (mic.isRecording) {
      await stopListening()
    } else {
      await startListening()
    }
  }, [mic.isRecording, startListening, stopListening])

  const startNewConversation = useCallback(() => {
    clearNoticeTimer()
    vadRef.current?.cancel()
    lastSpeakingRef.current = false
    activeTurnIdRef.current = null
    socketRef.current?.close()
    getState().startNewConversation()
  }, [clearNoticeTimer])

  // Keep the long-lived VAD listeners pointing at the latest async callbacks.
  useEffect(() => {
    stopListeningRef.current = stopListening
    handleNoSpeechRef.current = handleNoSpeech
  })

  return {
    state,
    startListening,
    stopListening,
    toggleListening,
    submitText,
    startNewConversation,
  }
}
