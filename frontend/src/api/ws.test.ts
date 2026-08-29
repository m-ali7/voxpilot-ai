// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VoxPilotSocket } from './ws'
import type { ServerEvent } from '../types/events'

class FakeWebSocket {
  static readonly OPEN = 1
  static instances: FakeWebSocket[] = []

  readyState = 0
  url = ''
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
  }
}

function install(): void {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VoxPilotSocket', () => {
  it('opens a socket for the session and sends session.connect on open', () => {
    install()
    const socket = new VoxPilotSocket()
    socket.connect('00000000-0000-0000-0000-000000000001')

    const ws = FakeWebSocket.instances[0]
    expect(ws.url).toContain('/ws/session/00000000-0000-0000-0000-000000000001')

    ws.readyState = FakeWebSocket.OPEN
    ws.onopen?.()

    expect(ws.sent.length).toBe(1)
    expect(JSON.parse(ws.sent[0]).type).toBe('session.connect')
  })

  it('dispatches parsed server events to handlers', () => {
    install()
    const socket = new VoxPilotSocket()
    const events: ServerEvent[] = []
    socket.onEvent((event) => events.push(event))
    socket.connect('sess-1')

    const ws = FakeWebSocket.instances[0]
    ws.readyState = FakeWebSocket.OPEN
    ws.onmessage?.({ data: JSON.stringify({ type: 'session.ready', session_id: 'sess-1', seq: 1, ts: 0 }) })

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('session.ready')
  })

  it('ignores malformed frames', () => {
    install()
    const socket = new VoxPilotSocket()
    const events: ServerEvent[] = []
    socket.onEvent((event) => events.push(event))
    socket.connect('sess-1')

    const ws = FakeWebSocket.instances[0]
    ws.onmessage?.({ data: 'not-json' })

    expect(events).toHaveLength(0)
  })

  it('sends text.submit with the expected shape', () => {
    install()
    const socket = new VoxPilotSocket()
    socket.connect('sess-1')

    const ws = FakeWebSocket.instances[0]
    ws.readyState = FakeWebSocket.OPEN

    socket.sendText('sess-1', 'turn-1', 'hello')

    const message = JSON.parse(ws.sent[ws.sent.length - 1])
    expect(message).toEqual({
      type: 'text.submit',
      session_id: 'sess-1',
      turn_id: 'turn-1',
      text: 'hello',
    })
  })

  it('unsubscribes handlers', () => {
    install()
    const socket = new VoxPilotSocket()
    const events: ServerEvent[] = []
    const unsubscribe = socket.onEvent((event) => events.push(event))
    socket.connect('sess-1')

    unsubscribe()
    const ws = FakeWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ type: 'session.ready', session_id: 'sess-1', seq: 1, ts: 0 }) })

    expect(events).toHaveLength(0)
  })
})
