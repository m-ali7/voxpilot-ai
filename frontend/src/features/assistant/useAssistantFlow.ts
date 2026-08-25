import { useCallback, useEffect, useRef } from 'react'

import { createSession, mediaUrl, submitTurn, transcribeAudio } from '../../api/voxpilot'
import { useMicrophone } from '../../hooks/useMicrophone'
import { useAssistantStore } from '../../state/assistantStore'
import type { ProjectIntelligence } from '../../types/api'
import type { AssistantState } from '../../types/assistant'
import { wait } from '../../utils/async'
import { normalizeError } from '../../utils/errors'
import { DEFAULT_VAD_CONFIG, VoiceActivityDetector } from '../../utils/vad'

// Non-streaming pipeline: we stage the visual states around the single
// backend round-trip so the experience reads clearly. Real granular state
// transitions arrive with streaming (a later phase).
const STAGE_MS = 650

const EMPTY_TRANSCRIPT_NOTICE = "I didn't catch anything \u2014 try again."
const NOTICE_DURATION_MS = 2200

// Stable imperative accessor — avoids subscribing the whole store (which would
// re-render on every high-frequency audioLevel/playbackLevel write).
const getState = useAssistantStore.getState

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
    if (current) return current
    const session = await createSession()
    getState().setSessionId(session.id)
    return session.id
  }, [])

  const applyTurn = useCallback(
    (intent: string, project: ProjectIntelligence, response: string, audioUrl: string) => {
      getState().setIntent(intent)
      getState().setProject(project)
      getState().setResponse(response)
      getState().setAudioUrl(mediaUrl(audioUrl))
      getState().setState('speaking')
    },
    [],
  )

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Barge-in: stop any current assistant playback before submitting.
      getState().interruptOutput()

      getState().setUserTranscript(trimmed)
      getState().setError(null)
      getState().setNotice(null)
      clearNoticeTimer()

      try {
        const sessionId = await ensureSession()
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
    [ensureSession, applyTurn, handleFailure, clearNoticeTimer],
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
      await wait(STAGE_MS)
      getState().setState('retrieving')

      const { text } = await transcribeAudio(sessionId, blob)
      const trimmed = text.trim()

      if (!trimmed) {
        // Recoverable "didn't catch that" — do not create a turn or call providers.
        showTransientNotice(EMPTY_TRANSCRIPT_NOTICE)
        return
      }

      getState().setUserTranscript(trimmed)
      await wait(STAGE_MS)

      getState().setState('thinking')
      const turn = await submitTurn(sessionId, trimmed)
      applyTurn(turn.intent, turn.project, turn.response, turn.audio_url)
    } catch (err) {
      handleFailure(err)
    }
  }, [mic, ensureSession, applyTurn, handleFailure, showTransientNotice, clearNoticeTimer])

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
    getState().interruptOutput()
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
