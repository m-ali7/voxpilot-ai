// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AudioPlayer } from './AudioPlayer'
import { useAssistantStore } from '../state/assistantStore'

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    useAssistantStore.getState().startNewConversation()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with no audio', () => {
    render(<AudioPlayer onEnded={() => {}} />)
    expect(document.querySelector('audio')).toBeTruthy()
  })

  it('does not crash when clearAudio fires on an empty queue', () => {
    render(<AudioPlayer onEnded={() => {}} />)

    expect(() => {
      useAssistantStore.getState().clearAudio()
    }).not.toThrow()
  })

  it('resets playbackLevel when clearAudio fires (new turn / interrupt)', () => {
    useAssistantStore.getState().setPlaybackLevel(0.5)
    render(<AudioPlayer onEnded={() => {}} />)

    act(() => {
      useAssistantStore.getState().clearAudio()
    })

    expect(useAssistantStore.getState().playbackLevel).toBe(0)
  })
})
