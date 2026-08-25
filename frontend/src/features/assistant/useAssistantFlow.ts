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

export interface AssistantFlow {
  state: AssistantState
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  toggleListening: () => Promise<void>
  submitText: (text: string) => Promise<void>
  startNewConversation: () => void
}

export function useAssistantFlow(): AssistantFlow {
  const store = useAssistantStore()
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
      store.setError(null)
      store.setNotice(message)
      store.setState('error')
      clearNoticeTimer()
      noticeTimerRef.current = window.setTimeout(() => {
        useAssistantStore.getState().setNotice(null)
        if (useAssistantStore.getState().state === 'error') {
          useAssistantStore.getState().setState('idle')
        }
        noticeTimerRef.current = null
      }, NOTICE_DURATION_MS)
    },
    [store, clearNoticeTimer],
  )

  const handleFailure = useCallback(
    (err: unknown) => {
      const normalized = normalizeError(err)
      if (normalized.detail) console.error('[voxpilot]', normalized.detail)
      store.setError(normalized.message)
      store.setState('error')
    },
    [store],
  )

  const ensureSession = useCallback(async (): Promise<string> => {
    if (store.sessionId) return store.sessionId
    const session = await createSession()
    store.setSessionId(session.id)
    return session.id
  }, [store])

  const applyTurn = useCallback(
    (
      intent: string,
      project: ProjectIntelligence,
      response: string,
      audioUrl: string,
    ) => {
      store.setIntent(intent)
      store.setProject(project)
      store.setResponse(response)
      store.setAudioUrl(mediaUrl(audioUrl))
      store.setState('speaking')
    },
    [store],
  )

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Barge-in: stop any current assistant playback before submitting.
      store.interruptOutput()

      store.setUserTranscript(trimmed)
      store.setError(null)
      store.setNotice(null)
      clearNoticeTimer()

      try {
        const sessionId = await ensureSession()
        store.setState('understanding')
        await wait(STAGE_MS)
        store.setState('retrieving')
        await wait(STAGE_MS)
        store.setState('thinking')
        const turn = await submitTurn(sessionId, trimmed)
        applyTurn(turn.intent, turn.project, turn.response, turn.audio_url)
      } catch (err) {
        handleFailure(err)
      }
    },
    [store, ensureSession, applyTurn, handleFailure, clearNoticeTimer],
  )

  const stopListening = useCallback(async () => {
    if (!mic.isRecording) return

    // Manual stop (or VAD auto-stop already fired): disable any pending VAD
    // event so only one stop/transcribe/submit sequence can occur.
    vadRef.current?.cancel()

    try {
      const blob = await mic.stopRecording()
      store.setIsMicActive(false)
      store.setIsUserSpeaking(false)
      store.setNotice(null)
      clearNoticeTimer()
      store.setState('understanding')

      const sessionId = await ensureSession()
      await wait(STAGE_MS)
      store.setState('retrieving')

      const { text } = await transcribeAudio(sessionId, blob)
      const trimmed = text.trim()

      if (!trimmed) {
        // Recoverable "didn't catch that" — do not create a turn or call providers.
        showTransientNotice(EMPTY_TRANSCRIPT_NOTICE)
        return
      }

      store.setUserTranscript(trimmed)
      await wait(STAGE_MS)

      store.setState('thinking')
      const turn = await submitTurn(sessionId, trimmed)
      applyTurn(turn.intent, turn.project, turn.response, turn.audio_url)
    } catch (err) {
      handleFailure(err)
    }
  }, [mic, store, ensureSession, applyTurn, handleFailure, showTransientNotice, clearNoticeTimer])

  const handleNoSpeech = useCallback(async () => {
    if (!mic.isRecording) return
    vadRef.current?.cancel()
    try {
      await mic.stopRecording() // discard the silent blob — no transcription
    } catch {
      // ignore
    }
    store.setIsMicActive(false)
    store.setIsUserSpeaking(false)
    showTransientNotice(EMPTY_TRANSCRIPT_NOTICE)
  }, [mic, store, showTransientNotice])

  const startListening = useCallback(async () => {
    // Barge-in: stop any current assistant playback before listening.
    store.interruptOutput()
    store.setError(null)
    store.setNotice(null)
    clearNoticeTimer()

    if (!mic.isSupported) {
      store.setError('Microphone is not supported in this browser. You can type your request instead.')
      store.setState('error')
      return
    }

    const permission =
      mic.permission === 'granted' ? 'granted' : await mic.requestPermission()
    if (permission !== 'granted') {
      store.setError(mic.error ?? 'Microphone access was denied. You can still type your request.')
      store.setState('error')
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
    store.setIsUserSpeaking(false)

    store.setState('listening')
    store.setIsMicActive(true)
    await mic.startRecording((level) => {
      store.setAudioLevel(level)
      const speaking = vad.push(level)
      if (speaking !== lastSpeakingRef.current) {
        lastSpeakingRef.current = speaking
        store.setIsUserSpeaking(speaking)
      }
    })
  }, [mic, store, clearNoticeTimer])

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
    store.startNewConversation()
  }, [store, clearNoticeTimer])

  // Keep the long-lived VAD listeners pointing at the latest async callbacks.
  useEffect(() => {
    stopListeningRef.current = stopListening
    handleNoSpeechRef.current = handleNoSpeech
  })

  return {
    state: store.state,
    startListening,
    stopListening,
    toggleListening,
    submitText,
    startNewConversation,
  }
}
