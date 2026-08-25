import { describe, expect, it } from 'vitest'

import { readErrorMessage } from './client'

describe('readErrorMessage', () => {
  it('surfaces a plain-string detail', async () => {
    const res = new Response(JSON.stringify({ detail: 'Session not found.' }), { status: 404 })
    expect(await readErrorMessage(res)).toBe('Session not found.')
  })

  it('does NOT stringify non-string detail (e.g. FastAPI 422 arrays)', async () => {
    const res = new Response(
      JSON.stringify({
        detail: [{ type: 'string_too_short', loc: ['body', 'text'], msg: 'String should have at least 1 character' }],
      }),
      { status: 422 },
    )
    const message = await readErrorMessage(res)
    expect(message).not.toContain('string_too_short')
    expect(message).not.toContain('body')
    expect(message).toContain('status 422')
  })

  it('falls back to a generic message for non-JSON bodies', async () => {
    const res = new Response('Internal Server Error', { status: 500 })
    expect(await readErrorMessage(res)).toBe('Request failed with status 500')
  })
})
