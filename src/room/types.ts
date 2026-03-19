import type { GameState, Pos } from '../game/types'

export type PlayerId = string

export type RoomPlayer = Readonly<{
  id: PlayerId
  name: string
  color: string
  joinedAtMs: number
  lastActionAtMs?: number
}>

export type RecentActionKind = 'rotate' | 'ping' | 'restart' | 'next' | 'join' | 'leave'

export type RecentAction = Readonly<{
  id: string
  text: string
  atMs: number
  kind?: RecentActionKind
  pos?: Pos
  playerId?: PlayerId
  playerName?: string
  playerColor?: string
}>

export type RoomState = Readonly<{
  roomId: string
  game: GameState
  players: ReadonlyArray<RoomPlayer>
  recentActions: ReadonlyArray<RecentAction>
}>

export type RoomAction =
  | {
      type: 'ROTATE_TILE'
      playerId: PlayerId
      pos: Pos
      atMs: number
    }
  | {
      type: 'RESTART_LEVEL'
      playerId: PlayerId
      atMs: number
    }
  | {
      type: 'NEXT_LEVEL'
      playerId: PlayerId
      atMs: number
    }
  | {
      type: 'PING_TILE'
      playerId: PlayerId
      pos: Pos
      atMs: number
    }
  | {
      type: 'JOIN_ROOM'
      player: RoomPlayer
      atMs: number
    }
  | {
      type: 'LEAVE_ROOM'
      playerId: PlayerId
      atMs: number
    }

