import { applyRoomAction, createInitialRoom } from './roomReducer'
import type { RoomAction, RoomState, RoomPlayer, PlayerId } from './types'

export type RoomListener = (state: RoomState) => void

export interface RoomAdapter {
  subscribe(listener: RoomListener): () => void
  dispatch(action: RoomAction): void
  getDebug(): {
    adapterType: 'local'
    roomId: string
    status: 'connected'
    playerCount: number
  }
}

type PresenceMessage = {
  type: 'presence'
  roomId: string
  player: RoomPlayer
  lastSeenAtMs: number
}

type StateMessage = {
  type: 'state'
  roomId: string
  state: RoomState
}

type AdapterMessage = PresenceMessage | StateMessage

function roomStateStorageKey(roomId: string): string {
  return `coop_room_${roomId}_state_v1`
}

function roomPresenceStorageKey(roomId: string): string {
  return `coop_room_${roomId}_presence_v1`
}

type PresenceEntry = {
  player: RoomPlayer
  lastSeenAtMs: number
}

class SharedRoomAdapter implements RoomAdapter {
  private state: RoomState
  private listeners: RoomListener[] = []
  private roomId: string
  private self: RoomPlayer
  private channel: BroadcastChannel
  private presence: Map<PlayerId, PresenceEntry> = new Map()

  constructor(roomId: string, self: RoomPlayer) {
    this.roomId = roomId
    this.self = self

    const storedState = this.loadStateFromStorage(roomId)
    const storedPresence = this.loadPresenceFromStorage(roomId)

    const nowMs = Date.now()
    this.presence = new Map(storedPresence)
    // Ensure self is present.
    this.presence.set(self.id, { player: self, lastSeenAtMs: nowMs })

    const initialGameState = storedState
      ? storedState.game
      : createInitialRoom(roomId, nowMs, self).game

    this.state = {
      roomId,
      game: initialGameState,
      // players will be injected via getOrderedPlayers().
      players: [],
      recentActions: storedState ? storedState.recentActions : [],
    }

    // Inject players ordering so App's `players[0]` becomes local player.
    this.state = { ...this.state, players: this.getOrderedPlayers() }

    // Broadcast channel for immediate sync.
    this.channel = new BroadcastChannel(`coop_room_${roomId}`)
    this.channel.onmessage = (ev) => {
      const msg = ev.data as AdapterMessage
      if (!msg || msg.roomId !== this.roomId) return
      this.onMessage(msg)
    }

    // Announce presence + start heartbeats.
    this.sendPresenceNow()
    this.startPresenceHeartbeats()
    this.startPresencePruner()

    // Persist initial.
    this.savePresenceToStorage()
    this.saveStateToStorage()
  }

  private loadStateFromStorage(roomId: string): RoomState | null {
    try {
      const raw = localStorage.getItem(roomStateStorageKey(roomId))
      if (!raw) return null
      const parsed = JSON.parse(raw) as RoomState
      if (!parsed || parsed.roomId !== roomId) return null
      // Basic shape check.
      if (!parsed.game || !Array.isArray(parsed.recentActions)) return null
      return parsed
    } catch {
      return null
    }
  }

  private loadPresenceFromStorage(roomId: string): Array<[PlayerId, PresenceEntry]> {
    try {
      const raw = localStorage.getItem(roomPresenceStorageKey(roomId))
      if (!raw) return []
      const parsed = JSON.parse(raw) as Record<string, PresenceEntry>
      if (!parsed || typeof parsed !== 'object') return []
      return Object.entries(parsed).map(([k, v]) => [k as PlayerId, v as PresenceEntry])
    } catch {
      return []
    }
  }

  private savePresenceToStorage(): void {
    try {
      const obj: Record<string, PresenceEntry> = {}
      for (const [id, entry] of this.presence.entries()) obj[id] = entry
      localStorage.setItem(roomPresenceStorageKey(this.roomId), JSON.stringify(obj))
    } catch {
      // ignore
    }
  }

  private saveStateToStorage(): void {
    try {
      localStorage.setItem(roomStateStorageKey(this.roomId), JSON.stringify(this.state))
    } catch {
      // ignore
    }
  }

  private getOrderedPlayers(basePlayers: ReadonlyArray<RoomPlayer> = this.state.players): RoomPlayer[] {
    // Keep local player at index 0 so App highlights "(You)".
    const lastById = new Map(basePlayers.map((p) => [p.id, p.lastActionAtMs] as const))
    const all = [...this.presence.values()].map((e) => e.player)
    all.sort((a, b) => {
      if (a.id === this.self.id) return -1
      if (b.id === this.self.id) return 1
      // stable-ish ordering: by joinedAt
      return a.joinedAtMs - b.joinedAtMs
    })
    return all.map((p) => {
      const lastActionAtMs = lastById.get(p.id)
      return lastActionAtMs == null ? p : { ...p, lastActionAtMs }
    })
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  subscribe(listener: RoomListener): () => void {
    this.listeners.push(listener)
    listener(this.state)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  dispatch(action: RoomAction): void {
    // Preserve our current ordered presence list while mutating shared game state.
    const next = applyRoomAction({ ...this.state, players: this.getOrderedPlayers(this.state.players) }, action)
    if (next !== this.state) {
      // Apply presence ordering again (reducer doesn't touch players for rotate/restart/next).
      this.state = { ...next, players: this.getOrderedPlayers(next.players) }
      this.saveStateToStorage()
      this.broadcastState()
      this.emit()
    }
  }

  getDebug() {
    return {
      adapterType: 'local' as const, // UI doesn't care; keep stable shape
      roomId: this.roomId,
      status: 'connected' as const,
      playerCount: this.state.players.length,
    }
  }

  private broadcastState(): void {
    const msg: StateMessage = { type: 'state', roomId: this.roomId, state: this.state }
    this.channel.postMessage(msg)
  }

  private sendPresenceNow(): void {
    const now = Date.now()
    const msg: PresenceMessage = { type: 'presence', roomId: this.roomId, player: this.self, lastSeenAtMs: now }
    this.presence.set(this.self.id, { player: this.self, lastSeenAtMs: now })
    this.savePresenceToStorage()
    this.channel.postMessage(msg)
    // Update local state players ordering immediately.
    this.state = { ...this.state, players: this.getOrderedPlayers(this.state.players) }
    this.saveStateToStorage()
    this.broadcastState()
    this.emit()
  }

  private startPresenceHeartbeats(): void {
    window.setInterval(() => this.sendPresenceNow(), 2000)
  }

  private startPresencePruner(): void {
    // Remove stale tabs that stopped heartbeating.
    window.setInterval(() => {
      const now = Date.now()
      let changed = false
      for (const [id, entry] of this.presence.entries()) {
        if (now - entry.lastSeenAtMs > 6000) {
          this.presence.delete(id)
          changed = true
        }
      }
      if (changed) {
        this.savePresenceToStorage()
        this.state = { ...this.state, players: this.getOrderedPlayers(this.state.players) }
        this.saveStateToStorage()
        this.broadcastState()
        this.emit()
      }
    }, 1500)
  }

  private onMessage(msg: AdapterMessage): void {
    if (msg.type === 'presence') {
      const now = Date.now()
      this.presence.set(msg.player.id, { player: msg.player, lastSeenAtMs: now })
      this.state = { ...this.state, players: this.getOrderedPlayers(this.state.players) }
      this.savePresenceToStorage()
      // Do not override game state; only broadcast updated players list.
      this.saveStateToStorage()
      this.emit()
      return
    }

    if (msg.type === 'state') {
      // Update shared game/recentActions from the other tab,
      // but keep our current ordered presence list for correct "(You)" selection.
      this.state = { ...msg.state, roomId: this.roomId, players: this.getOrderedPlayers(msg.state.players) }
      this.saveStateToStorage()
      this.emit()
    }
  }
}

type PartyKitActionEnvelope = { type: 'action'; action: RoomAction }
type PartyKitStateEnvelope = { type: 'state'; roomId: string; state: RoomState }

function reorderPlayersSelfFirst(players: ReadonlyArray<RoomPlayer>, selfId: string): RoomPlayer[] {
  const copy = [...players]
  copy.sort((a, b) => {
    if (a.id === selfId) return -1
    if (b.id === selfId) return 1
    return a.joinedAtMs - b.joinedAtMs
  })
  return copy
}

class PartyKitRoomAdapter implements RoomAdapter {
  private listeners: RoomListener[] = []
  private state: RoomState
  private ws: WebSocket | null = null
  private connected = false

  private roomId: string
  private self: RoomPlayer
  private onConnected: () => void

  constructor(
    roomId: string,
    self: RoomPlayer,
    onConnected: () => void,
  ) {
    this.roomId = roomId
    this.self = self
    this.onConnected = onConnected
    const nowMs = Date.now()
    this.state = createInitialRoom(roomId, nowMs, self)
  }

  subscribe(listener: RoomListener): () => void {
    this.listeners.push(listener)
    listener(this.state)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  private safeSetState(next: RoomState) {
    // Keep local player at index 0 for "(You)" selection.
    this.state = { ...next, players: reorderPlayersSelfFirst(next.players, this.self.id) }
    this.emit()
  }

  dispatch(action: RoomAction): void {
    const ws = this.ws
    if (!ws || !this.connected) return
    console.log('[partykit] send action', action.type)
    const env: PartyKitActionEnvelope = { type: 'action', action }
    ws.send(JSON.stringify(env))
  }

  getDebug() {
    return {
      adapterType: 'local' as const, // keep UI stable (it doesn't actually use this).
      roomId: this.roomId,
      status: 'connected' as const,
      playerCount: this.state.players.length,
    }
  }

  private connectToUrl(url: string) {
    try {
      console.log('[partykit] connecting', { url, roomId: this.roomId })
      const ws = new WebSocket(url)
      this.ws = ws

      ws.onopen = () => {
        this.connected = true
        // Join room so the server can initialize RoomState with correct player identity.
        const join: RoomAction = { type: 'JOIN_ROOM', player: this.self, atMs: Date.now() }
        this.dispatch(join)
        this.onConnected()
      }

      ws.onmessage = (ev) => {
        const raw = ev.data
        const text = typeof raw === 'string' ? raw : raw?.toString?.() ?? ''
        if (!text) return
        let parsed: PartyKitStateEnvelope | null = null
        try {
          parsed = JSON.parse(text) as PartyKitStateEnvelope
        } catch {
          return
        }
        if (!parsed || parsed.type !== 'state') return
        console.log('[partykit] received state', { roomId: parsed.roomId })
        this.safeSetState(parsed.state)
      }

      ws.onerror = () => {
        console.log('[partykit] websocket error')
      }

      ws.onclose = () => {
        this.connected = false
        console.log('[partykit] websocket closed')
      }
    } catch (e) {
      console.log('[partykit] connect failed', e)
    }
  }

  connect(urlOrCandidates: string | ReadonlyArray<string>) {
    this.connectToUrl(Array.isArray(urlOrCandidates) ? urlOrCandidates[0]! : urlOrCandidates)
  }
}

class FallbackRoomAdapter implements RoomAdapter {
  private local: SharedRoomAdapter
  private party: PartyKitRoomAdapter | null = null
  private active: 'local' | 'partykit' = 'local'
  private listeners: RoomListener[] = []

  constructor(local: SharedRoomAdapter) {
    this.local = local
  }

  subscribe(listener: RoomListener): () => void {
    this.listeners.push(listener)
    // Forward initial local state.
    return this.local.subscribe((s) => {
      if (this.active === 'local') {
        for (const l of this.listeners) l(s)
      }
    })
  }

  dispatch(action: RoomAction): void {
    if (this.active === 'partykit' && this.party) this.party.dispatch(action)
    else this.local.dispatch(action)
  }

  getDebug() {
    return this.active === 'partykit' && this.party ? this.party.getDebug() : this.local.getDebug()
  }

  tryConnectPartyKit(args: { roomId: string; self: RoomPlayer }) {
    const partyKitName = 'coop_puzzle'
    const partyKitPort = 1999
    const wsUrl = `ws://localhost:${partyKitPort}/parties/${partyKitName}/${args.roomId}`

    const onConnected = () => {
      this.active = 'partykit'
    }

    const party = new PartyKitRoomAdapter(args.roomId, args.self, onConnected)
    party.subscribe((s) => {
      if (this.active === 'partykit') {
        for (const l of this.listeners) l(s)
      }
    })
    this.party = party
    party.connect(wsUrl)
  }
}

export function createRoomAdapter(
  roomId: string,
  playerName: string,
  playerId: string,
  playerColor: string,
): RoomAdapter {
  const nowMs = Date.now()
  const fallbackNumeric = (() => {
    const sum = Array.from(playerId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return (sum % 98) + 1
  })()
  const self: RoomPlayer = {
    id: playerId,
    name: playerName === '__ANON__' ? `Player ${fallbackNumeric}` : playerName,
    color: playerColor,
    joinedAtMs: nowMs,
  }

  const local = new SharedRoomAdapter(roomId, self)
  const wrapper = new FallbackRoomAdapter(local)

  // Try PartyKit connection; if it doesn't connect, wrapper remains local.
  wrapper.tryConnectPartyKit({ roomId, self })
  return wrapper
}

