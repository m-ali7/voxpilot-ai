import { create } from 'zustand'

import type { ProjectIntelligence } from '../types/api'
import type { AssistantState } from '../types/assistant'

export interface AudioSegment {
  index: number
  url: string
}

interface AssistantStore {
  state: AssistantState
  sessionId: string | null
  userTranscript: string
  liveTranscript: string
  response: string | null
  intent: string | null
  project: ProjectIntelligence | null
  audioEpoch: number
  audioQueue: AudioSegment[]
  audioComplete: boolean
  error: string | null
  notice: string | null
  audioLevel: number
  playbackLevel: number
  isMicActive: boolean
  isUserSpeaking: boolean

  setState: (state: AssistantState) => void
  setSessionId: (id: string) => void
  setUserTranscript: (text: string) => void
  setLiveTranscript: (text: string) => void
  setResponse: (text: string | null) => void
  setIntent: (intent: string | null) => void
  setProject: (project: ProjectIntelligence | null) => void
  setError: (error: string | null) => void
  setNotice: (notice: string | null) => void
  appendResponse: (delta: string) => void
  enqueueAudioSegment: (segment: AudioSegment) => void
  markAudioComplete: () => void
  clearAudio: () => void
  setAudioLevel: (level: number) => void
  setPlaybackLevel: (level: number) => void
  setIsMicActive: (active: boolean) => void
  setIsUserSpeaking: (speaking: boolean) => void
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
  audioEpoch: 0,
  audioQueue: [],
  audioComplete: false,
  error: null,
  notice: null,
  audioLevel: 0,
  playbackLevel: 0,
  isMicActive: false,
  isUserSpeaking: false,

  setState: (state) => set({ state }),
  setSessionId: (sessionId) => set({ sessionId }),
  setUserTranscript: (userTranscript) => set({ userTranscript }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setResponse: (response) => set({ response }),
  setIntent: (intent) => set({ intent }),
  setProject: (project) => set({ project }),
  setError: (error) => set({ error }),
  setNotice: (notice) => set({ notice }),
  appendResponse: (delta) =>
    set((state) => ({ response: (state.response ?? '') + delta })),
  enqueueAudioSegment: (segment) =>
    set((state) => ({ audioQueue: [...state.audioQueue, segment] })),
  markAudioComplete: () => set({ audioComplete: true }),
  clearAudio: () =>
    set((state) => {
      for (const segment of state.audioQueue) {
        try {
          URL.revokeObjectURL(segment.url)
        } catch {
          // ignore
        }
      }
      return {
        audioQueue: [],
        audioComplete: false,
        audioEpoch: state.audioEpoch + 1,
        playbackLevel: 0,
      }
    }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setPlaybackLevel: (playbackLevel) => set({ playbackLevel }),
  setIsMicActive: (isMicActive) => set({ isMicActive }),
  setIsUserSpeaking: (isUserSpeaking) => set({ isUserSpeaking }),
  startNewConversation: () =>
    set((state) => {
      for (const segment of state.audioQueue) {
        try {
          URL.revokeObjectURL(segment.url)
        } catch {
          // ignore
        }
      }
      return {
        state: 'idle',
        sessionId: null,
        userTranscript: '',
        liveTranscript: '',
        response: null,
        intent: null,
        project: null,
        audioEpoch: 0,
        audioQueue: [],
        audioComplete: false,
        error: null,
        notice: null,
        audioLevel: 0,
        playbackLevel: 0,
        isMicActive: false,
        isUserSpeaking: false,
      }
    }),
}))
