import { beforeEach, describe, expect, it } from 'vitest'

import { useAssistantStore } from './assistantStore'

describe('assistantStore', () => {
  beforeEach(() => {
    useAssistantStore.getState().startNewConversation()
  })

  it('startNewConversation resets the full conversation state', () => {
    const store = useAssistantStore.getState()
    store.setState('speaking')
    store.setSessionId('session-123')
    store.setUserTranscript('hello')
    store.setResponse('world')
    store.setProject({
      project_id: 'p',
      project_name: 'Project Phoenix',
      status: 'Amber',
      summary: 's',
      metrics: [],
      risks: [],
      actions: [],
      documents: [],
      sources: [],
    })
    store.enqueueAudioSegment({ index: 0, url: 'blob:fake-audio' })
    store.markAudioComplete()
    store.setError('boom')
    store.setNotice('notice')
    store.setAudioLevel(0.5)
    store.setPlaybackLevel(0.4)

    useAssistantStore.getState().startNewConversation()

    const reset = useAssistantStore.getState()
    expect(reset.state).toBe('idle')
    expect(reset.sessionId).toBeNull()
    expect(reset.response).toBeNull()
    expect(reset.project).toBeNull()
    expect(reset.error).toBeNull()
    expect(reset.notice).toBeNull()
    expect(reset.audioLevel).toBe(0)
    expect(reset.playbackLevel).toBe(0)
    expect(reset.audioQueue).toEqual([])
    expect(reset.audioComplete).toBe(false)
    expect(reset.audioEpoch).toBe(0)
  })

  it('setNotice and setPlaybackLevel update their fields', () => {
    useAssistantStore.getState().setNotice('I didn\'t catch anything.')
    useAssistantStore.getState().setPlaybackLevel(0.7)

    const store = useAssistantStore.getState()
    expect(store.notice).toBe('I didn\'t catch anything.')
    expect(store.playbackLevel).toBe(0.7)
  })

  it('setIsUserSpeaking updates and startNewConversation resets it', () => {
    useAssistantStore.getState().setIsUserSpeaking(true)
    expect(useAssistantStore.getState().isUserSpeaking).toBe(true)

    useAssistantStore.getState().startNewConversation()
    expect(useAssistantStore.getState().isUserSpeaking).toBe(false)
  })

  it('appendResponse appends deltas to the current response', () => {
    useAssistantStore.getState().setResponse('')
    useAssistantStore.getState().appendResponse('Hel')
    useAssistantStore.getState().appendResponse('lo')
    expect(useAssistantStore.getState().response).toBe('Hello')
  })

  it('clearAudio clears the queue and bumps the audio epoch', () => {
    useAssistantStore.getState().setPlaybackLevel(0.6)
    useAssistantStore.getState().enqueueAudioSegment({ index: 0, url: 'blob:fake' })
    useAssistantStore.getState().markAudioComplete()
    const before = useAssistantStore.getState().audioEpoch

    useAssistantStore.getState().clearAudio()

    const store = useAssistantStore.getState()
    expect(store.audioQueue).toEqual([])
    expect(store.audioComplete).toBe(false)
    expect(store.audioEpoch).toBe(before + 1)
    expect(store.playbackLevel).toBe(0)
  })

  it('enqueueAudioSegment preserves order and markAudioComplete flips the flag', () => {
    useAssistantStore.getState().enqueueAudioSegment({ index: 0, url: 'blob:a' })
    useAssistantStore.getState().enqueueAudioSegment({ index: 1, url: 'blob:b' })

    const store = useAssistantStore.getState()
    expect(store.audioQueue.map((s) => s.index)).toEqual([0, 1])
    expect(store.audioComplete).toBe(false)

    useAssistantStore.getState().markAudioComplete()
    expect(useAssistantStore.getState().audioComplete).toBe(true)
  })
})
