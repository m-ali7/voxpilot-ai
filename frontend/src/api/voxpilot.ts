import type { Session, TranscribeResult, Turn } from '../types/api'
import { apiRequest } from './client'

export async function createSession(): Promise<Session> {
  return apiRequest<Session>('/sessions', { method: 'POST' })
}

export async function transcribeAudio(sessionId: string, audio: Blob): Promise<TranscribeResult> {
  const form = new FormData()
  form.append('file', audio, 'recording.webm')
  return apiRequest<TranscribeResult>(`/sessions/${sessionId}/transcribe`, {
    method: 'POST',
    body: form,
  })
}

export async function submitTurn(sessionId: string, text: string): Promise<Turn> {
  return apiRequest<Turn>(`/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

/**
 * The backend returns a relative /media/... path. Keep it relative so it is
 * served same-origin: via the Vite dev proxy in development and the reverse
 * proxy in production. Same-origin media keeps the Web Audio analyser
 * (MediaElementSource) CORS-clean.
 */
export function mediaUrl(audioUrl: string): string {
  return audioUrl
}
