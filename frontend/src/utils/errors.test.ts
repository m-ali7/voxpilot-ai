import { describe, expect, it } from 'vitest'

import { ApiError } from '../api/client'
import { normalizeError } from './errors'

describe('normalizeError', () => {
  it('maps 422 validation errors to a friendly message and keeps detail out of the UI text', () => {
    const err = new ApiError(422, 'Request failed with status 422')
    const result = normalizeError(err)

    expect(result.kind).toBe('validation')
    expect(result.message).not.toContain('422')
    expect(result.message).not.toContain('string_too_short')
  })

  it('maps provider (503) errors to a friendly message without leaking provider detail', () => {
    const err = new ApiError(503, 'OpenAI API key is not configured.')
    const result = normalizeError(err)

    expect(result.kind).toBe('provider')
    expect(result.message).not.toContain('OpenAI')
    expect(result.message).not.toContain('API key')
    // detail is retained for dev tooling, not the UI
    expect(result.detail).toContain('OpenAI')
  })

  it('maps network TypeErrors to a friendly connection message', () => {
    const result = normalizeError(new TypeError('Failed to fetch'))

    expect(result.kind).toBe('network')
    expect(result.message).toContain('Could not reach VoxPilot')
  })

  it('falls back to a generic message for unknown errors', () => {
    const result = normalizeError(new Error('some internal stack'))

    expect(result.kind).toBe('unknown')
    expect(result.message).toBe('Something went wrong. Please try again.')
    expect(result.message).not.toContain('some internal stack')
  })

  it('handles non-Error thrown values', () => {
    const result = normalizeError('just a string')

    expect(result.kind).toBe('unknown')
    expect(result.message).toBe('Something went wrong. Please try again.')
  })
})
