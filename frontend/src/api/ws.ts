import type { ClientEvent, ServerEvent } from '../types/events'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const RECONNECT_DELAY_MS = 1500

type Handler = (event: ServerEvent) => void

/**
 * Typed WebSocket transport for the streaming turn pipeline. Keeps all socket
 * concerns here so React components only deal with typed events.
 */
export class VoxPilotSocket {
  private ws: WebSocket | null = null
  private sessionId: string | null = null
  private handlers = new Set<Handler>()
  private reconnectTimer: number | null = null
  private closedByClient = false

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(sessionId: string): void {
    if (this.ws && this.sessionId === sessionId && this.ws.readyState === WebSocket.OPEN) {
      return
    }
    this.close()
    this.sessionId = sessionId
    this.closedByClient = false
    this.open(sessionId)
  }

  onEvent(handler: Handler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  sendText(sessionId: string, turnId: string, text: string): void {
    this.send({ type: 'text.submit', session_id: sessionId, turn_id: turnId, text })
  }

  cancelTurn(sessionId: string, turnId: string): void {
    this.send({ type: 'turn.cancel', session_id: sessionId, turn_id: turnId })
  }

  /** Resolve once the socket is open (or reject after the timeout). */
  async waitForOpen(timeoutMs = 2500): Promise<boolean> {
    const ws = this.ws
    if (!ws) return false
    if (ws.readyState === WebSocket.OPEN) return true

    return new Promise((resolve) => {
      const onOpen = () => {
        window.clearTimeout(timer)
        ws.removeEventListener('open', onOpen)
        resolve(true)
      }
      const timer = window.setTimeout(() => {
        ws.removeEventListener('open', onOpen)
        resolve(false)
      }, timeoutMs)
      ws.addEventListener('open', onOpen)
    })
  }

  close(): void {
    this.closedByClient = true
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.sessionId = null
  }

  private open(sessionId: string): void {
    const base = API_BASE_URL.replace(/^http/, 'ws')
    const ws = new WebSocket(`${base}/ws/session/${sessionId}`)
    this.ws = ws
    ws.onopen = () => {
      this.send({ type: 'session.connect', session_id: sessionId })
    }
    ws.onmessage = (event: MessageEvent) => this.handleMessage(event)
    ws.onclose = () => this.handleClose(sessionId)
  }

  private send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event))
    }
  }

  private handleMessage(message: MessageEvent): void {
    let event: ServerEvent
    try {
      event = JSON.parse(String(message.data)) as ServerEvent
    } catch {
      return // ignore malformed frames
    }
    for (const handler of this.handlers) handler(event)
  }

  private handleClose(sessionId: string): void {
    this.ws = null
    if (this.closedByClient || this.sessionId !== sessionId) return
    if (this.reconnectTimer !== null) return
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (!this.closedByClient && this.sessionId === sessionId) this.open(sessionId)
    }, RECONNECT_DELAY_MS)
  }
}
