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
    store.setAudioUrl('/media/x.mp3')
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
  })

  it('setNotice and setPlaybackLevel update their fields', () => {
    useAssistantStore.getState().setNotice('I didn\'t catch anything.')
    useAssistantStore.getState().setPlaybackLevel(0.7)

    const store = useAssistantStore.getState()
    expect(store.notice).toBe('I didn\'t catch anything.')
    expect(store.playbackLevel).toBe(0.7)
  })
})
