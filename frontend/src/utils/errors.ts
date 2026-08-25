import { ApiError } from '../api/client'

export type ErrorKind = 'validation' | 'provider' | 'network' | 'unknown'

export interface NormalizedError {
  kind: ErrorKind
  /** Safe, user-presentable message. Never contains raw payloads or secrets. */
  message: string
  /** Optional technical detail for console/dev tooling only. */
  detail?: string
}

const GENERIC = 'Something went wrong. Please try again.'

/**
 * Normalize any thrown value into a friendly, user-presentable message.
 *
 * This is the single place where raw API/network/provider errors are converted
 * into UI-safe text. Technical detail is preserved in `detail` for logging,
 * but is never intended for the production-facing UI.
 */
export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof ApiError) {
    const detail = err.message
    if (err.status === 422) {
      return {
        kind: 'validation',
        message: 'That request could not be processed. Please try again.',
        detail,
      }
    }
    if (err.status === 503 || err.status >= 500) {
      return {
        kind: 'provider',
        message: 'VoxPilot is unavailable right now. Please try again shortly.',
        detail,
      }
    }
    return { kind: 'unknown', message: GENERIC, detail }
  }

  if (err instanceof TypeError) {
    return {
      kind: 'network',
      message: 'Could not reach VoxPilot. Check your connection and try again.',
    }
  }

  if (err instanceof Error) {
    return { kind: 'unknown', message: GENERIC, detail: err.message }
  }

  return { kind: 'unknown', message: GENERIC }
}
