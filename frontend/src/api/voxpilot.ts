import type { Session, TranscribeResult, Turn } from '../types/api'
import { apiRequest, resolveMediaUrl } from './client'

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

export function mediaUrl(audioUrl: string): string {
  return resolveMediaUrl(audioUrl)
}
