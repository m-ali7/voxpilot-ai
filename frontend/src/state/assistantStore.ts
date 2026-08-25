import { create } from 'zustand'

import type { ProjectIntelligence } from '../types/api'
import type { AssistantState } from '../types/assistant'

interface AssistantStore {
  state: AssistantState
  sessionId: string | null
  userTranscript: string
  liveTranscript: string
  response: string | null
  intent: string | null
  project: ProjectIntelligence | null
  audioUrl: string | null
  error: string | null
  audioLevel: number
  isMicActive: boolean

  setState: (state: AssistantState) => void
  setSessionId: (id: string) => void
  setUserTranscript: (text: string) => void
  setLiveTranscript: (text: string) => void
  setResponse: (text: string | null) => void
  setIntent: (intent: string | null) => void
  setProject: (project: ProjectIntelligence | null) => void
  setAudioUrl: (url: string | null) => void
  setError: (error: string | null) => void
  setAudioLevel: (level: number) => void
  setIsMicActive: (active: boolean) => void
  startNewConversation: () => void
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  state: 'idle',
  sessionId: null,
  userTranscript: '',
  liveTranscript: '',
  response: null,
  intent: null,
  project: null,
  audioUrl: null,
  error: null,
  audioLevel: 0,
  isMicActive: false,

  setState: (state) => set({ state }),
  setSessionId: (sessionId) => set({ sessionId }),
  setUserTranscript: (userTranscript) => set({ userTranscript }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setResponse: (response) => set({ response }),
  setIntent: (intent) => set({ intent }),
  setProject: (project) => set({ project }),
  setAudioUrl: (audioUrl) => set({ audioUrl }),
  setError: (error) => set({ error }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setIsMicActive: (isMicActive) => set({ isMicActive }),
  startNewConversation: () =>
    set({
      state: 'idle',
      sessionId: null,
      userTranscript: '',
      liveTranscript: '',
      response: null,
      intent: null,
      project: null,
      audioUrl: null,
      error: null,
      audioLevel: 0,
      isMicActive: false,
    }),
}))
