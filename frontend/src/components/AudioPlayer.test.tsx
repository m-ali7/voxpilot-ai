// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

import { AudioPlayer } from './AudioPlayer'
import { useAssistantStore } from '../state/assistantStore'

describe('AudioPlayer interruption', () => {
  let pauseSpy: Mock

  beforeEach(() => {
    pauseSpy = vi.fn()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause(
      this: HTMLMediaElement,
    ) {
      pauseSpy()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    useAssistantStore.getState().startNewConversation()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not react to the initial token on mount', async () => {
    render(<AudioPlayer src="/media/test.mp3" onEnded={() => {}} />)

    await act(async () => {})

    expect(pauseSpy).not.toHaveBeenCalled()
  })

  it('pauses audio and resets playbackLevel when interruptOutput is called', async () => {
    useAssistantStore.getState().setPlaybackLevel(0.5)
    render(<AudioPlayer src="/media/test.mp3" onEnded={() => {}} />)

    act(() => {
      useAssistantStore.getState().interruptOutput()
    })

    await waitFor(() => {
      expect(pauseSpy).toHaveBeenCalled()
    })
    expect(useAssistantStore.getState().playbackLevel).toBe(0)
  })

  it('repeated interruption is safe and idempotent', async () => {
    render(<AudioPlayer src="/media/test.mp3" onEnded={() => {}} />)

    act(() => {
      useAssistantStore.getState().interruptOutput()
      useAssistantStore.getState().interruptOutput()
      useAssistantStore.getState().interruptOutput()
    })

    await act(async () => {})
    expect(useAssistantStore.getState().playbackLevel).toBe(0)
  })

  it('interruption is safe when nothing is playing', async () => {
    render(<AudioPlayer src={null} onEnded={() => {}} />)

    act(() => {
      useAssistantStore.getState().interruptOutput()
    })

    await act(async () => {})
  })
})
