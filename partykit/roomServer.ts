import type { Connection, ConnectionContext, Room, Server } from 'partykit'
import type { RoomAction, RoomState } from '../src/room/types'
import { applyRoomAction, createInitialRoom } from '../src/room/roomReducer'

type ClientEnvelope = { type: 'action'; action: RoomAction }
type ServerEnvelope = { type: 'state'; roomId: string; state: RoomState }

function decodeMessage(message: string | ArrayBuffer | ArrayBufferView): string {
  if (typeof message === 'string') return message
  const u8 =
    message instanceof ArrayBuffer
      ? new Uint8Array(message)
      : new Uint8Array(message.buffer, message.byteOffset, message.byteLength)
  return new TextDecoder().decode(u8)
}

export default class RoomServerImpl implements Server {
  private state: RoomState | null = null
  private room: Room

  constructor(room: Room) {
    this.room = room
  }

  async onConnect(connection: Connection, _ctx: ConnectionContext): Promise<void> {
    if (!this.state) return
    const msg: ServerEnvelope = { type: 'state', roomId: this.state.roomId, state: this.state }
    connection.send(JSON.stringify(msg))
  }

  async onMessage(message: string | ArrayBuffer | ArrayBufferView, _sender: Connection): Promise<void> {
    const text = decodeMessage(message)

    let parsed: ClientEnvelope | null = null
    try {
      parsed = JSON.parse(text) as ClientEnvelope
    } catch {
      return
    }

    if (!parsed || parsed.type !== 'action') return
    const action = parsed.action

    // Initialize on first JOIN_ROOM.
    if (this.state == null) {
      if (action.type !== 'JOIN_ROOM') return
      this.state = createInitialRoom(this.room.id, Date.now(), action.player)
    }

    this.state = applyRoomAction(this.state, action)
    const msg: ServerEnvelope = { type: 'state', roomId: this.state.roomId, state: this.state }
    this.room.broadcast(JSON.stringify(msg))
  }
}

