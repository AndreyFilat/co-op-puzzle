import { createGameState, nextLevel, restartLevel, rotateAt } from '../game/gameState'
import type { GameState, Pos } from '../game/types'
import type { RecentAction, RoomAction, RoomPlayer, RoomState, RecentActionKind } from './types'
import { WIN_ANIM_TOTAL_MS } from '../game/winAnimation'
import { rotateTileCW, setTile } from '../game/tileUtils'
import { solveBoard } from '../game/solver'

export const PLAYER_ACTION_COOLDOWN_MS = 1200

function posLabel(pos: Pos): string {
  const col = String.fromCharCode('A'.charCodeAt(0) + pos.c)
  return `${col}${pos.r + 1}`
}

function findPlayer(players: ReadonlyArray<RoomPlayer>, id: string): RoomPlayer | undefined {
  return players.find((p) => p.id === id)
}

export function getRemainingCooldownMs(player: RoomPlayer | undefined, nowMs: number): number {
  if (!player || player.lastActionAtMs == null) return 0
  return Math.max(0, PLAYER_ACTION_COOLDOWN_MS - (nowMs - player.lastActionAtMs))
}

function isPlayerOnCooldown(players: ReadonlyArray<RoomPlayer>, playerId: string, nowMs: number): boolean {
  const p = findPlayer(players, playerId)
  return getRemainingCooldownMs(p, nowMs) > 0
}

function bumpPlayerLastAction(players: ReadonlyArray<RoomPlayer>, playerId: string, nowMs: number): ReadonlyArray<RoomPlayer> {
  return players.map((p) => (p.id === playerId ? { ...p, lastActionAtMs: nowMs } : p))
}

function pushRecent(
  state: RoomState,
  text: string,
  atMs: number,
  kind?: RecentActionKind,
  opts?: { pos?: Pos; playerId?: string; playerName?: string; playerColor?: string },
): ReadonlyArray<RecentAction> {
  const item: RecentAction = {
    id: `${atMs}-${state.recentActions.length}`,
    text,
    atMs,
    kind,
    pos: opts?.pos,
    playerId: opts?.playerId,
    playerName: opts?.playerName,
    playerColor: opts?.playerColor,
  }
  const next = [item, ...state.recentActions]
  return next.slice(0, 10)
}

function withGame(state: RoomState, game: GameState): RoomState {
  return { ...state, game }
}

function applyLockedExpiry(board: GameState['board'], nowMs: number): GameState['board'] {
  // Only affects tiles that were temporarily unlocked.
  // Locked tiles (locked=true) are left as-is.
  return board.map((row) =>
    row.map((t) => {
      if (t.unlockedUntilMs == null) return t
      if (nowMs <= t.unlockedUntilMs) return { ...t, locked: false }
      return { ...t, locked: true, unlockedUntilMs: undefined }
    }),
  )
}

function unlockAllLocked(board: GameState['board'], nowMs: number): GameState['board'] {
  return board.map((row) =>
    row.map((t) => {
      if (!t.locked) return t
      return { ...t, locked: false, unlockedUntilMs: nowMs + 2000 }
    }),
  )
}

export function createInitialRoom(roomId: string, nowMs: number, firstPlayer: RoomPlayer): RoomState {
  const game = createGameState(0, nowMs)
  return {
    roomId,
    game,
    players: [firstPlayer],
    recentActions: [],
  }
}

export function applyRoomAction(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case 'JOIN_ROOM': {
      const exists = state.players.some((p) => p.id === action.player.id)
      const players = exists ? state.players : [...state.players, action.player]
      const recent = pushRecent(state, `${action.player.name} joined`, action.atMs, 'join', {
        playerId: action.player.id,
        playerName: action.player.name,
        playerColor: action.player.color,
      })
      return { ...state, players, recentActions: recent }
    }
    case 'LEAVE_ROOM': {
      const player = findPlayer(state.players, action.playerId)
      const players = state.players.filter((p) => p.id !== action.playerId)
      const name = player?.name ?? 'Unknown player'
      const text = `${name} left`
      const recent = pushRecent(state, text, action.atMs, 'leave', {
        playerId: action.playerId,
        playerName: name,
        playerColor: player?.color,
      })
      return { ...state, players, recentActions: recent }
    }
    case 'ROTATE_TILE': {
      // During the shared win animation window, ignore additional rotate interactions
      // (also prevents cooldown bump + recent feed spam).
      if (
        state.game.status === 'won' &&
        state.game.winAnimationStartedAtMs != null &&
        action.atMs < state.game.winAnimationStartedAtMs + WIN_ANIM_TOTAL_MS
      ) {
        return state
      }

      if (isPlayerOnCooldown(state.players, action.playerId, action.atMs)) {
        return state
      }

      const player = findPlayer(state.players, action.playerId)

      const boardAfterExpiry = applyLockedExpiry(state.game.board, action.atMs)
      const gameAfterExpiry = boardAfterExpiry === state.game.board ? state.game : { ...state.game, board: boardAfterExpiry }

      const tile = gameAfterExpiry.board[action.pos.r]?.[action.pos.c]
      if (tile && tile.type === 'sync_tile') {
        const now = action.atMs

        // Expiration: if the window elapsed, reset to idle before processing.
        let currentTile = tile
        let board = gameAfterExpiry.board
        if (currentTile.heldUntilMs != null && now > currentTile.heldUntilMs) {
          currentTile = { ...currentTile, heldByPlayerId: undefined, heldUntilMs: undefined }
          board = setTile(board, action.pos, currentTile)
        }

        // First click: set hold (no rotation).
        if (currentTile.heldByPlayerId == null) {
          const heldTile = {
            ...currentTile,
            heldByPlayerId: action.playerId,
            heldUntilMs: now + 2000,
          }
          const nextBoard = setTile(board, action.pos, heldTile)
          const solved = solveBoard(nextBoard)
          const won = solved.reactorPowered

          const game: GameState = {
            ...gameAfterExpiry,
            board: solved.board,
            // Holding doesn't rotate.
            status: won ? 'won' : 'playing',
            wonAtMs: won ? state.game.wonAtMs ?? now : null,
            winAnimationStartedAtMs: won && state.game.status !== 'won' ? now : null,
          }

          const label = posLabel(action.pos)
          const name = player?.name ?? 'Unknown player'
          const text = `${name} is holding SYNC at ${label}`
          const recent = pushRecent(state, text, now)
          const players = bumpPlayerLastAction(state.players, action.playerId, now)
          return { ...state, game, players, recentActions: recent }
        }

        // Second click: must be a different player within the time window.
        if (currentTile.heldByPlayerId === action.playerId) {
          // Same player cannot both hold and rotate.
          return state
        }
        const withinWindow =
          currentTile.heldUntilMs != null && now <= currentTile.heldUntilMs
        if (!withinWindow) {
          // Treat as expired: reset to idle and re-hold by this player.
          const heldTile = {
            ...currentTile,
            heldByPlayerId: action.playerId,
            heldUntilMs: now + 2000,
          }
          const nextBoard = setTile(board, action.pos, heldTile)
          const solved = solveBoard(nextBoard)
          const won = solved.reactorPowered

          const game: GameState = {
            ...gameAfterExpiry,
            board: solved.board,
            status: won ? 'won' : 'playing',
            wonAtMs: won ? state.game.wonAtMs ?? now : null,
            winAnimationStartedAtMs: won && state.game.status !== 'won' ? now : null,
          }

          const label = posLabel(action.pos)
          const name = player?.name ?? 'Unknown player'
          const text = `${name} is holding SYNC at ${label}`
          const recent = pushRecent(state, text, now)
          const players = bumpPlayerLastAction(state.players, action.playerId, now)
          return { ...state, game, players, recentActions: recent }
        }

        // Valid second click: rotate once and clear held state.
        const clearedTile = {
          ...currentTile,
          heldByPlayerId: undefined,
          heldUntilMs: undefined,
        }
        const rotatedTile = rotateTileCW(clearedTile)
        const nextBoard = setTile(board, action.pos, rotatedTile)
        // Unlock decision is based on whether the sync_tile is powered *before* this second click
        // rotates it away (since rotation can make the sync_tile unpowered immediately).
        // If the merge cross is overloaded, energy never reaches the sync_tile in the held state,
        // so unlocking won't trigger.
        const solvedIfUnlocked = solveBoard(board)
        const syncKey = `${action.pos.r},${action.pos.c}`
        const shouldUnlock = solvedIfUnlocked.poweredKeys.has(syncKey)
        const unlockedBoard = shouldUnlock ? unlockAllLocked(nextBoard, now) : nextBoard
        const solved = solveBoard(unlockedBoard)
        const won = solved.reactorPowered

        const game: GameState = {
          ...gameAfterExpiry,
          board: solved.board,
          moves: state.game.moves + 1,
          status: won ? 'won' : 'playing',
          wonAtMs: won ? state.game.wonAtMs ?? now : null,
          winAnimationStartedAtMs: won && state.game.status !== 'won' ? now : null,
        }

        const label = posLabel(action.pos)
        const name = player?.name ?? 'Unknown player'
        const text = `${name} rotated ${label}`
        const recent = pushRecent(state, text, now, 'rotate', {
          pos: action.pos,
          playerId: action.playerId,
          playerName: name,
          playerColor: player?.color,
        })
        const players = bumpPlayerLastAction(state.players, action.playerId, now)
        return { ...state, game, players, recentActions: recent }
      }

      const rotated = rotateAt(gameAfterExpiry, action.pos, action.atMs)
      const game =
        rotated.status === 'won' && state.game.status !== 'won'
          ? { ...rotated, winAnimationStartedAtMs: action.atMs }
          : rotated.status !== 'won'
            ? { ...rotated, winAnimationStartedAtMs: null }
            : rotated
      const label = posLabel(action.pos)
      const name = player?.name ?? 'Unknown player'
      const text = `${name} rotated ${label}`
      const recent = pushRecent(state, text, action.atMs, 'rotate', {
        pos: action.pos,
        playerId: action.playerId,
        playerName: name,
        playerColor: player?.color,
      })
      const players = bumpPlayerLastAction(state.players, action.playerId, action.atMs)
      return { ...state, game, players, recentActions: recent }
    }
    case 'RESTART_LEVEL': {
      const player = findPlayer(state.players, action.playerId)
      const game = restartLevel(state.game, action.atMs)
      const name = player?.name ?? 'Unknown player'
      const text = `${name} restarted the level`
      const recent = pushRecent(state, text, action.atMs, 'restart', {
        playerId: action.playerId,
        playerName: name,
        playerColor: player?.color,
      })
      return withGame({ ...state, recentActions: recent }, game)
    }
    case 'NEXT_LEVEL': {
      const player = findPlayer(state.players, action.playerId)
      const game = nextLevel(state.game, action.atMs)
      const name = player?.name ?? 'Unknown player'
      const text = `${name} advanced to next level`
      const recent = pushRecent(state, text, action.atMs, 'next', {
        playerId: action.playerId,
        playerName: name,
        playerColor: player?.color,
      })
      return withGame({ ...state, recentActions: recent }, game)
    }
    case 'PING_TILE': {
      const player = findPlayer(state.players, action.playerId)
      const label = posLabel(action.pos)
      const name = player?.name ?? 'Unknown player'
      const text = `${name} pinged ${label}`
      const recent = pushRecent(state, text, action.atMs, 'ping', {
        pos: action.pos,
        playerId: action.playerId,
        playerName: name,
        playerColor: player?.color,
      })
      return { ...state, recentActions: recent }
    }
    default:
      return state
  }
}

