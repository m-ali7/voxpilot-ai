import type { ProjectIntelligence } from './api'

export type ClientEvent =
  | { type: 'session.connect'; session_id: string }
  | { type: 'text.submit'; session_id: string; turn_id: string; text: string }
  | { type: 'turn.cancel'; session_id: string; turn_id: string }
  | { type: 'conversation.reset'; session_id: string }

interface ServerEventBase {
  type: string
  session_id: string
  turn_id?: string | null
  seq: number
  ts: number
}

export type ServerEvent =
  | (ServerEventBase & { type: 'session.ready' })
  | (ServerEventBase & { type: 'intent.resolved'; intent: string })
  | (ServerEventBase & { type: 'retrieval.started' })
  | (ServerEventBase & { type: 'retrieval.completed'; project: ProjectIntelligence })
  | (ServerEventBase & { type: 'response.started' })
  | (ServerEventBase & { type: 'response.delta'; delta: string })
  | (ServerEventBase & {
      type: 'response.completed'
      text: string
      project: ProjectIntelligence
      audio_url: string | null
    })
  | (ServerEventBase & { type: 'audio.started'; index: number })
  | (ServerEventBase & { type: 'audio.chunk'; index: number; data: string })
  | (ServerEventBase & { type: 'audio.completed' })
  | (ServerEventBase & { type: 'turn.cancelled' })
  | (ServerEventBase & { type: 'error'; code: string; message: string })
