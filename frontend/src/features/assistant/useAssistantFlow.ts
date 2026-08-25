import { useCallback } from 'react'

import { createSession, mediaUrl, submitTurn, transcribeAudio } from '../../api/voxpilot'
import { useMicrophone } from '../../hooks/useMicrophone'
import { useAssistantStore } from '../../state/assistantStore'
import type { ProjectIntelligence } from '../../types/api'
import type { AssistantState } from '../../types/assistant'
import { wait } from '../../utils/async'

// Non-streaming pipeline: we stage the visual states around the single
// backend round-trip so the experience reads clearly. Real granular state
// transitions arrive with streaming (a later phase).
const STAGE_MS = 650

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

      store.setUserTranscript(trimmed)
      store.setError(null)

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
        store.setError(err instanceof Error ? err.message : 'Something went wrong.')
        store.setState('error')
      }
    },
    [store, ensureSession, applyTurn],
  )

  const stopListening = useCallback(async () => {
    if (!mic.isRecording) return

    try {
      const blob = await mic.stopRecording()
      store.setIsMicActive(false)
      store.setState('understanding')

      const sessionId = await ensureSession()
      await wait(STAGE_MS)
      store.setState('retrieving')

      const { text } = await transcribeAudio(sessionId, blob)
      store.setUserTranscript(text)
      await wait(STAGE_MS)

      store.setState('thinking')
      const turn = await submitTurn(sessionId, text)
      applyTurn(turn.intent, turn.project, turn.response, turn.audio_url)
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Something went wrong.')
      store.setState('error')
    }
  }, [mic, store, ensureSession, applyTurn])

  const startListening = useCallback(async () => {
    store.setError(null)

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

    store.setState('listening')
    store.setIsMicActive(true)
    await mic.startRecording((level) => store.setAudioLevel(level))
  }, [mic, store])

  const toggleListening = useCallback(async () => {
    if (mic.isRecording) {
      await stopListening()
    } else {
      await startListening()
    }
  }, [mic.isRecording, startListening, stopListening])

  const startNewConversation = useCallback(() => {
    store.startNewConversation()
  }, [store])

  return {
    state: store.state,
    startListening,
    stopListening,
    toggleListening,
    submitText,
    startNewConversation,
  }
}
