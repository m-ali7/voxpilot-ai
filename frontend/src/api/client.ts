const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${API_BASE_URL}${path}`
}

/**
 * Extract a safe, user-presentable message from a failed response.
 *
 * Only a plain-string `detail` is surfaced. Non-string details (e.g. FastAPI
 * 422 validation arrays) are deliberately discarded so raw payloads never
 * reach the UI.
 */
export async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown }
    if (typeof body.detail === 'string' && body.detail.length > 0) return body.detail
  } catch {
    // non-JSON body — fall through to generic message
  }
  return `Request failed with status ${res.status}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), init)
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res))
  }
  return (await res.json()) as T
}
